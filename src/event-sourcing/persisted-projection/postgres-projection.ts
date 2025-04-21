import type { Event, EventStore, PersistedEnvelope } from "@/event-sourcing/event-store";
import type postgres from "postgres";
import type { Sql } from "postgres";

type EventType<E extends Event, Type extends E["type"]> = Extract<E, { type: Type }>;
export type Projectors<E extends Event> = {
  [type in E["type"]]?: (sql: Sql, event: PersistedEnvelope<EventType<E, type>>) => Promise<postgres.Row[]>;
};
interface Project<E extends Event> {
  init(sql: Sql): Promise<postgres.Row[]>;
  all(): Projectors<E>;
}

type Position = {
  position: bigint;
};

type Params<E extends Event> = {
  schemaName: string;
  sql: Sql;
  eventStore: EventStore<E>;
  projectors: Project<E>;
  limit?: number;
};

export const PostgresProjection = async <E extends Event>({
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
          queries.push(...(await projector(sql, event as PersistedEnvelope<EventType<E, E["type"]>>)));
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
