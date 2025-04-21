import type { Event } from "./event-store";
import { eventStoreContractTest } from "./event-store.contract";
import { InMemoryEventStore } from "./in-memory-event-store";

describe("InMemoryEventStore", () => {
  eventStoreContractTest(async <E extends Event>() => new InMemoryEventStore<E>());
});
