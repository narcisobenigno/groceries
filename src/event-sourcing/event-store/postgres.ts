import type { Sql } from "postgres";
import type {
  Envelope,
  Event,
  EventStore,
  ParseEvent,
  PersistedEnvelope,
  ReadCondition,
  WriteCondition,
} from "./event-store";

export const Postgres = async <E extends Event>(
  schemaName: string,
  sql: Sql,
  parser: ParseEvent<E>,
  defaultLimit = 1000,
): Promise<EventStore<E>> => {
  await sql.begin(async (sql) => [
    await sql`SET search_path TO ${sql(schemaName)}`,
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql.unsafe(schemaName)}`,
    await sql`
        CREATE TABLE IF NOT EXISTS "Events" (
          "Position" BIGSERIAL PRIMARY KEY,
          "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "StreamID" TEXT[] NOT NULL,
          "Type" TEXT NOT NULL,
          "Event" JSONB NOT NULL
        )
      `,
    await sql`CREATE INDEX IF NOT EXISTS idx_events_streamid ON "Events" USING GIN("StreamID")`,
    await sql`CREATE INDEX IF NOT EXISTS idx_events_position ON "Events" ("Position")`,
    await sql`CREATE INDEX IF NOT EXISTS idx_events_eventname ON "Events" ("Type")`,
    await sql`
        CREATE OR REPLACE FUNCTION UNNEST_1D(ANYARRAY) RETURNS SETOF ANYARRAY AS $$
          SELECT ARRAY_AGG($1[d1][d2])
          FROM GENERATE_SUBSCRIPTS($1,1) d1,  GENERATE_SUBSCRIPTS($1,2) d2
          GROUP BY d1
          ORDER BY d1
        $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
      `,
  ]);

  return {
    save: async (envelopes: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope<E>[]> => {
      if (envelopes.length === 0) {
        return [];
      }

      const streamIDs: string[][] = [];
      const eventNames: string[] = [];
      const payloads: string[] = [];

      for (const envelope of envelopes) {
        streamIDs.push(Array.isArray(envelope.streamId) ? envelope.streamId : [envelope.streamId]);
        eventNames.push(envelope.type);
        payloads.push(JSON.stringify(envelope.event));
      }

      const persistedRows = await sql<PersistedEnvelope<E>[]>`
      INSERT INTO "Events" (
          "StreamID",
          "Type",
          "Event"
      ) SELECT
          UNNEST_1D(${sql.array(streamIDs)}::TEXT[][]),
          UNNEST(${sql.array(eventNames)}::TEXT[]),
          UNNEST(${sql.array(payloads)}::JSONB[])
      FROM UNNEST (
          (SELECT ARRAY(SELECT PG_ADVISORY_XACT_LOCK(42)::TEXT))
      ) AS t(
          "_SerialLock"
      )
      WHERE NOT EXISTS (
          SELECT TRUE FROM "Events"
          WHERE
          ${
            writeCondition
              ? sql`
                  "Position" > ${writeCondition.lastEventPosition.toString()}
                  ${
                    writeCondition.query.streamId.length > 0
                      ? sql`AND "StreamID" && ${sql.array(writeCondition.query.streamId)}`
                      : sql``
                  }
                  ${
                    (writeCondition.query.events?.length ?? 0) > 0
                      ? sql`AND "Type" IN ${sql(writeCondition.query.events as string[])}`
                      : sql``
                  }
              `
              : sql`
                  FALSE
              `
          }
      )
      RETURNING
        "Position" as "position",
        "Timestamp" as "timestamp",
        "StreamID" as "streamId",
        "Type" as "type",
        "Event" as "event";
    `;

      if (writeCondition && persistedRows.length === 0) {
        throw new Error(
          `Concurrency conflict: Events were inserted after position ${writeCondition.lastEventPosition}`,
        );
      }

      return persistedRows;
    },

    read: async ({
      upto,
      streamIds: streamIDs = [],
      events = [],
      limit = 0,
      offset,
    }: ReadCondition): Promise<PersistedEnvelope<E>[]> => {
      const eventsFound = await sql<PersistedEnvelope<E>[]>`
        SELECT
            "Position" as "position",
            "Timestamp" as "timestamp",
            "StreamID" as "streamId",
            "Type" as "type",
            "Event" as "event"
        FROM "Events"
        WHERE
            TRUE
            ${upto ? sql`AND "Position" <= ${upto.toString()}` : sql``}
            ${offset ? sql`AND "Position" > ${offset.toString()}` : sql``}
            ${streamIDs.length > 0 ? sql`AND "StreamID" && ${sql.array(streamIDs)}` : sql``}
            ${events.length > 0 ? sql`AND "Type" IN ${sql(events)}` : sql``}
        ORDER BY
            "Position" ASC
        ${sql`LIMIT ${limit || defaultLimit}`}
      `;
      return eventsFound.map((event) => ({ ...event, event: parser(event.event) }));
    },
  };
};
