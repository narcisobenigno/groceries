import { createPool } from "slonik";
import { PostgresEventStore } from "./eventStore";

interface TestEvent {
  type: string;
  data: any;
}

async function main() {
  const pool = await createPool("postgres://postgres:postgres@localhost:5432/eventstore");
  const eventStore = new PostgresEventStore<TestEvent>(pool);

  // Example usage
  const result = await eventStore.save([
    {
      timestamp: new Date(),
      streamID: "test-stream",
      eventName: "TestEvent",
      event: { type: "created", data: { foo: "bar" } },
    },
  ]);

  console.log("Saved event:", result);
}

main().catch(console.error);
