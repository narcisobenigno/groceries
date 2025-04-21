import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import postgres, { type Sql } from "postgres";
import { Wait } from "testcontainers";
import { InMemoryEventStore, type PersistedEnvelope } from "../event-store";
import { PostgresProjection, type Projector } from "./postgres-projection";

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

    const projector = await PostgresProjection({
      schemaName,
      sql,
      eventStore,
      project: new TestProject(),
    });

    await eventStore.save([
      {
        streamId: ["stream_1234"],
        type: "created",
        event: { type: "created", numberId: "stream_123", value: 1 },
      },
      {
        streamId: ["stream_1234"],
        type: "added",
        event: { type: "added", numberId: "stream_123", value: 2 },
      },
      {
        streamId: ["stream_4321"],
        type: "created",
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

  it("projects up to the limit", async () => {
    const eventStore = new InMemoryEventStore<TestEvents>();

    const projector = await PostgresProjection({
      schemaName,
      sql,
      eventStore,
      project: new TestProject(),
      limit: 2,
    });

    await eventStore.save([
      {
        streamId: ["stream_1234"],
        type: "created",
        event: { type: "created", numberId: "stream_123", value: 1 },
      },
      {
        streamId: ["stream_1234"],
        type: "added",
        event: { type: "added", numberId: "stream_123", value: 2 },
      },
      {
        streamId: ["stream_4321"],
        type: "created",
        event: { type: "created", numberId: "stream_4321", value: 4 },
      },
    ]);

    await projector.start();

    const projections = await read(sql, schemaName);
    expect(projections).toEqual([{ numberId: "stream_123", value: 3 }]);
  });

  it("projects from where it left off", async () => {
    const eventStore = new InMemoryEventStore<TestEvents>();

    const projector = await PostgresProjection({
      schemaName,
      sql,
      eventStore,
      project: new TestProject(),
      limit: 2,
    });

    await eventStore.save([
      {
        streamId: ["stream_1234"],
        type: "created",
        event: { type: "created", numberId: "stream_123", value: 1 },
      },
      {
        streamId: ["stream_1234"],
        type: "added",
        event: { type: "added", numberId: "stream_123", value: 2 },
      },
      {
        streamId: ["stream_4321"],
        type: "created",
        event: { type: "created", numberId: "stream_4321", value: 4 },
      },
    ]);

    await projector.start();
    await projector.start();

    const projections = await read(sql, schemaName);
    expect(projections).toEqual([
      { numberId: "stream_123", value: 3 },
      { numberId: "stream_4321", value: 4 },
    ]);
  });

  it("returns true when events projected up until limit", async () => {
    const eventStore = new InMemoryEventStore<TestEvents>();

    const projector = await PostgresProjection({
      schemaName,
      sql,
      eventStore,
      project: new TestProject(),
      limit: 2,
    });

    await eventStore.save([
      {
        streamId: ["stream_1234"],
        type: "created",
        event: { type: "created", numberId: "stream_123", value: 1 },
      },
      {
        streamId: ["stream_1234"],
        type: "added",
        event: { type: "added", numberId: "stream_123", value: 2 },
      },
    ]);

    const projected = await projector.start();
    expect(projected).toBe(true);
  });

  it("returns false when events projected less than limit", async () => {
    const eventStore = new InMemoryEventStore<TestEvents>();

    const projector = await PostgresProjection({
      schemaName,
      sql,
      eventStore,
      project: new TestProject(),
      limit: 2,
    });

    await eventStore.save([
      {
        streamId: ["stream_1234"],
        type: "created",
        event: { type: "created", numberId: "stream_123", value: 1 },
      },
    ]);

    const projected = await projector.start();
    expect(projected).toBe(false);
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

  project(sql: Sql): Projector<TestEvents> {
    return {
      created: async (event: PersistedEnvelope<TestEvents>) => {
        const payload = event.event;
        return [
          await sql`INSERT INTO "projection" (number_id, value) VALUES (${payload.numberId}, ${payload.value.toString()})`,
        ];
      },
      added: async (event: PersistedEnvelope<TestEvents>) => {
        const payload = event.event;
        return [
          await sql`UPDATE "projection" SET value = value + ${payload.value.toString()} WHERE number_id = ${payload.numberId}`,
        ];
      },
    };
  }
}
