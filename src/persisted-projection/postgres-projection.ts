import type { EventStore, PersistedEnvelope } from "@/event-store/event-store";
import type postgres from "postgres";
import type { Sql } from "postgres";

interface Project {
  init(sql: Sql): Promise<postgres.Row[]>;
  project(sql: Sql, events: PersistedEnvelope): Promise<postgres.Row[]>;
}

export class PostgresProjection<E> {
  constructor(
    private readonly schemaName: string,
    private readonly sql: Sql,
    private readonly eventStore: EventStore<E>,
    private readonly project: Project,
    private readonly limit: number = 1000,
  ) {}

  async init(): Promise<void> {
    const sql = this.sql;
    await sql.begin(async (sql) => [
      await sql`CREATE SCHEMA IF NOT EXISTS ${sql(this.schemaName)}`,
      await sql`SET search_path TO ${sql(this.schemaName)}`,
      await sql`CREATE TABLE IF NOT EXISTS _position (name TEXT PRIMARY KEY, position BIGSERIAL)`,
      await sql`INSERT INTO "_position" (name, position) VALUES ('${sql(this.schemaName)}', 0) ON CONFLICT DO NOTHING`,
      ...(await this.project.init(sql)),
    ]);
  }

  async start(): Promise<void> {
    await this.sql.begin(async (sql) => {
      const events = await this.eventStore.read({});
      const queries: postgres.Row[] = [];
      for (const event of events) {
        queries.push(...(await this.project.project(sql, event)));
      }
      return queries;
    });
  }
}
