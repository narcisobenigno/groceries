import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import postgres, { type Sql } from "postgres";
import { Wait } from "testcontainers";
import type { Event, ParseEvent } from "./event-store";
import { eventStoreContractTest } from "./event-store.contract";
import { Postgres } from "./postgres";

describe("PostgresEventStore", () => {
  let container: StartedPostgreSqlContainer;
  let sql: Sql;
  let schemaName: string;

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
    schemaName = `events${Math.floor(Math.random() * 100000)}`;
  }, 120_000);
  afterEach(async () => {
    await sql.end();
  });

  eventStoreContractTest(async <E extends Event>(parse: ParseEvent<E>) => await Postgres<E>(schemaName, sql, parse));
});
