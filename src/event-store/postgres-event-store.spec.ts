import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import postgres, { type Sql } from "postgres";
import { Wait } from "testcontainers";
import { type TestEvent, eventStoreContractTest } from "./event-store.contract";
import { PostgresEventStore } from "./postgres-event-store";

describe("PostgresEventStore", () => {
  let container: StartedPostgreSqlContainer;
  let sql: Sql;
  let eventStore: PostgresEventStore<TestEvent>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").withWaitStrategy(Wait.forListeningPorts()).start();
  });
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    sql = postgres(container.getConnectionUri(), {
      types: {
        bigint: {
          to: 20,
          from: [20],
          serialize: (x: bigint) => x.toString(),
          parse: (x: string) => BigInt(x),
        },
      },
    });
    const schemaName = `events${Math.floor(Math.random() * 100000)}`;

    eventStore = new PostgresEventStore<TestEvent>(schemaName, sql);
    await eventStore.init();
  }, 120_000);
  afterEach(async () => {
    await sql.end();
  });

  eventStoreContractTest(async () => eventStore);
});
