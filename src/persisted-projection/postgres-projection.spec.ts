import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import postgres, { type Sql } from "postgres";
import { Wait } from "testcontainers";
import { InMemoryEventStore, type PersistedEnvelope } from "../event-store";
import { PostgresProjection } from "./postgres-projection";

describe("PostgresProjector", () => {
  let container: StartedPostgreSqlContainer;
  let sql: Sql;
  let schemaName: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").withWaitStrategy(Wait.forListeningPorts()).start();
  }, 120_000);
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(() => {
    sql = postgres(container.getConnectionUri());
    schemaName = `projector-${Math.floor(Math.random() * 100000)}`;
  });
  afterEach(async () => {
    await sql.end();
  });

  it("projects events", async () => {
    const eventStore = new InMemoryEventStore<TestEvents>();

    const projector = new PostgresProjection(schemaName, sql, eventStore, new TestProject());
    await projector.init();

    await eventStore.save([
      {
        streamId: ["stream_1234"],
        eventName: "created",
        event: { type: "created", numberId: "stream_123", value: 1 },
      },
      {
        streamId: ["stream_1234"],
        eventName: "added",
        event: { type: "added", numberId: "stream_123", value: 2 },
      },
      {
        streamId: ["stream_4321"],
        eventName: "created",
        event: { type: "created", numberId: "stream_4321", value: 4 },
      },
    ]);

    await projector.start();

    const projections = await read(sql, schemaName);
    expect(projections).toEqual([
      { numberId: "stream_123", value: 3 },
      { numberId: "stream_4321", value: 4 },
    ]);
  });
});

type CreatedEvent = {
  type: "created";
  numberId: string;
  value: number;
};

type AddedEvent = {
  type: "added";
  numberId: string;
  value: number;
};

type TestEvents = CreatedEvent | AddedEvent;

type TestProjectionRow = {
  numberId: string;
  value: number;
};
const read = async (sql: Sql, schemaName: string): Promise<TestProjectionRow[]> => {
  await sql`SET search_path TO ${sql(schemaName)}`;
  return sql<TestProjectionRow[]>`SELECT number_id as "numberId", value FROM "projection"`;
};

class TestProject {
  async init(sql: Sql): Promise<postgres.Row[]> {
    return [await sql`CREATE TABLE IF NOT EXISTS "projection" (number_id TEXT PRIMARY KEY, value int)`];
  }

  async project(sql: Sql, event: PersistedEnvelope): Promise<postgres.Row[]> {
    const payload = event.event as TestEvents;
    if (payload.type === "created") {
      return [
        await sql`INSERT INTO "projection" (number_id, value) VALUES (${payload.numberId}, ${payload.value.toString()})`,
      ];
    }
    if (payload.type === "added") {
      return [
        await sql`UPDATE "projection" SET value = value + ${payload.value.toString()} WHERE number_id = ${payload.numberId}`,
      ];
    }

    return [];
  }
}
