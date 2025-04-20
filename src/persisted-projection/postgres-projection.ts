import type { EventStore, PersistedEnvelope } from "@/event-store/event-store";
import type postgres from "postgres";
import type { Sql } from "postgres";

interface Project {
  init(sql: Sql): Promise<postgres.Row[]>;
  project(sql: Sql, events: PersistedEnvelope): Promise<postgres.Row[]>;
}

type Position = {
  position: bigint;
};

export const PostgresProjection = async <E>(
  schemaName: string,
  sql: Sql,
  eventStore: EventStore<E>,
  project: Project,
  limit = 1000,
) => {
  await sql.begin(async (sql) => [
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schemaName)}`,
    await sql`SET search_path TO ${sql(schemaName)}`,
    await sql`CREATE TABLE IF NOT EXISTS _position (name TEXT PRIMARY KEY, position BIGSERIAL)`,
    await sql`INSERT INTO "_position" (name, position) VALUES ('${sql(schemaName)}', 0) ON CONFLICT DO NOTHING`,
    ...(await project.init(sql)),
  ]);

  return {
    start: async (): Promise<boolean> => {
      let totalProjected = 0;
      await sql.begin(async (sql) => {
        const position = await sql<Position[]>`SELECT position FROM "_position" WHERE name = '${sql(schemaName)}'`;

        const events = await eventStore.read({ limit, offset: position[0].position });
        const queries: postgres.Row[] = [];
        for (const event of events) {
          queries.push(...(await project.project(sql, event)));
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
