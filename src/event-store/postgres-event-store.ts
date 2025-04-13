import type { Sql } from "postgres";
import type { Envelope, EventStore, PersistedEnvelope, ReadCondition, WriteCondition } from "./event-store";

export class PostgresEventStore<E> implements EventStore<E> {
  #schemaName: string;
  #tableName: string;
  #sql: Sql;

  constructor(schemaName: string, sql: Sql) {
    this.#schemaName = schemaName;
    this.#tableName = `${schemaName}."Events"`;
    this.#sql = sql;
  }

  async init(): Promise<void> {
    await this.#sql.begin(async (sql) => [
      await sql`CREATE SCHEMA IF NOT EXISTS ${sql.unsafe(this.#schemaName)}`,
      await sql`
        CREATE TABLE IF NOT EXISTS ${sql.unsafe(this.#tableName)} (
          "Position" BIGSERIAL PRIMARY KEY,
          "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "StreamID" TEXT[] NOT NULL,
          "EventName" TEXT NOT NULL,
          "Event" JSONB NOT NULL
        )
      `,
      await sql`CREATE INDEX IF NOT EXISTS idx_events_streamid ON ${this.#sql.unsafe(this.#tableName)} USING GIN("StreamID")`,
      await sql`CREATE INDEX IF NOT EXISTS idx_events_position ON ${this.#sql.unsafe(this.#tableName)} ("Position")`,
      await sql`CREATE INDEX IF NOT EXISTS idx_events_eventname ON ${this.#sql.unsafe(this.#tableName)} ("EventName")`,
      await sql`
        CREATE OR REPLACE FUNCTION UNNEST_1D(ANYARRAY) RETURNS SETOF ANYARRAY AS $$
          SELECT ARRAY_AGG($1[d1][d2])
          FROM GENERATE_SUBSCRIPTS($1,1) d1,  GENERATE_SUBSCRIPTS($1,2) d2
          GROUP BY d1
          ORDER BY d1
        $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
      `,
    ]);
  }

  async save(envelopes: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope[]> {
    if (envelopes.length === 0) {
      return [];
    }

    const streamIDs: string[][] = [];
    const eventNames: string[] = [];
    const payloads: string[] = [];

    for (const envelope of envelopes) {
      streamIDs.push(Array.isArray(envelope.streamID) ? envelope.streamID : [envelope.streamID]);
      eventNames.push(envelope.eventName);
      payloads.push(JSON.stringify(envelope.event));
    }

    const persistedRows = await this.#sql<PersistedEnvelope[]>`
      INSERT INTO ${this.#sql.unsafe(this.#tableName)} (
          "StreamID",
          "EventName",
          "Event"
      ) SELECT
          UNNEST_1D(${this.#sql.array(streamIDs)}::TEXT[][]),
          UNNEST(${this.#sql.array(eventNames)}::TEXT[]),
          UNNEST(${this.#sql.array(payloads)}::JSONB[])
      FROM UNNEST (
          (SELECT ARRAY(SELECT PG_ADVISORY_XACT_LOCK(42)::TEXT))
      ) AS t(
          "_SerialLock"
      )
      WHERE NOT EXISTS (
          SELECT TRUE FROM ${this.#sql.unsafe(this.#tableName)}
          WHERE
          ${
            writeCondition
              ? this.#sql`
                  "Position" > ${writeCondition.lastEventPosition.toString()}
                  ${
                    writeCondition.query.streamID.length > 0
                      ? this.#sql`AND "StreamID" && ${this.#sql.array(writeCondition.query.streamID)}`
                      : this.#sql``
                  }
                  ${
                    (writeCondition.query.events?.length ?? 0) > 0
                      ? this.#sql`AND "EventName" IN ${this.#sql(writeCondition.query.events as string[])}`
                      : this.#sql``
                  }
              `
              : this.#sql`
                  FALSE
              `
          }
      )
      RETURNING *;
    `;

    if (writeCondition && persistedRows.length === 0) {
      throw new Error(`Concurrency conflict: Events were inserted after position ${writeCondition.lastEventPosition}`);
    }

    return persistedRows;
  }

  async read({
    offset = BigInt(0),
    streamIDs = [],
    events = [],
    limit = 0,
  }: ReadCondition): Promise<PersistedEnvelope[]> {
    return this.#sql<PersistedEnvelope[]>`
            SELECT
                "Position",
                "Timestamp",
                "StreamID",
                "EventName",
                "Event"
            FROM ${this.#sql.unsafe(this.#tableName)}
            WHERE
                "Position" > ${offset.toString()}
                ${streamIDs.length > 0 ? this.#sql`AND "StreamID" && ${this.#sql.array(streamIDs)}` : this.#sql``}
                ${events.length > 0 ? this.#sql`AND "EventName" IN ${this.#sql(events)}` : this.#sql``}
            ORDER BY
                "Position" ASC
            ${limit > 0 ? this.#sql`LIMIT ${limit}` : this.#sql``}
        `;
  }
}
