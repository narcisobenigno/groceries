import { after, afterEach, before, beforeEach, describe } from "node:test";
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

  before(
    async () => {
      container = await new PostgreSqlContainer("postgres:17-alpine")
        //.withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
        .withWaitStrategy(Wait.forListeningPorts())
        .start();
    },
    { timeout: 120_000 },
  );
  after(
    async () => {
      if (container) {
        await container.stop();
      }
    },
    { timeout: 120_000 },
  );

  beforeEach(
    async () => {
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
    },
    { timeout: 120_000 },
  );
  afterEach(
    async () => {
      await sql.end();
    },
    { timeout: 120_000 },
  );

  eventStoreContractTest(async <E extends Event>(parse: ParseEvent<E>) => await Postgres<E>(schemaName, sql, parse));
});
