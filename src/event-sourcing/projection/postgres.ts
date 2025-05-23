import type { eventstore } from "@/event-sourcing";
import type postgres from "postgres";
import type { Sql } from "postgres";

type EventType<E extends eventstore.Event, Type extends E["type"]> = Extract<E, { type: Type }>;
export type PostgresProjectors<E extends eventstore.Event> = {
  [type in E["type"]]?: (sql: Sql, event: eventstore.PersistedEnvelope<EventType<E, type>>) => Promise<postgres.Row[]>;
};
interface PostgresProject<E extends eventstore.Event> {
  init(sql: Sql): Promise<postgres.Row[]>;
  all(): PostgresProjectors<E>;
}

type Position = {
  position: bigint;
};

type Params<E extends eventstore.Event> = {
  schemaName: string;
  sql: Sql;
  eventStore: eventstore.EventStore<E>;
  projectors: PostgresProject<E>;
  limit?: number;
};

export const Postgres = async <E extends eventstore.Event>({
  schemaName,
  sql,
  eventStore,
  projectors,
  limit = 1000,
}: Params<E>) => {
  await sql.begin(async (sql) => [
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schemaName)}`,
    await sql`SET search_path TO ${sql(schemaName)}`,
    await sql`CREATE TABLE IF NOT EXISTS _position (name TEXT PRIMARY KEY, position BIGSERIAL)`,
    await sql`INSERT INTO "_position" (name, position) VALUES ('${sql(schemaName)}', 0) ON CONFLICT DO NOTHING`,
    ...(await projectors.init(sql)),
  ]);

  return {
    start: async (): Promise<boolean> => {
      let totalProjected = 0;
      await sql.begin(async (sql) => {
        const position = await sql<Position[]>`SELECT position FROM "_position" WHERE name = '${sql(schemaName)}'`;

        const projections = projectors.all();

        const events = await eventStore.read({
          limit,
          offset: position[0].position,
          events: Object.keys(projections),
        });

        const queries: postgres.Row[] = [];
        for (const event of events) {
          const projector = projections[event.type as E["type"]];
          if (!projector) {
            continue;
          }
          queries.push(...(await projector(sql, event as eventstore.PersistedEnvelope<EventType<E, E["type"]>>)));
        }

        totalProjected = events.length;

        return [
          ...queries,
          await sql`UPDATE "_position" SET "position" = ${events[events.length - 1].position.toString()} WHERE name = '${sql(schemaName)}'`,
        ];
      });

      return totalProjected === limit;
    },
  };
};
