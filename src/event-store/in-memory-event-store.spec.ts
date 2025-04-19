import { eventStoreContractTest } from "./event-store.contract";
import { InMemoryEventStore } from "./in-memory-event-store";

describe("InMemoryEventStore", () => {
  eventStoreContractTest(async () => new InMemoryEventStore());
});
