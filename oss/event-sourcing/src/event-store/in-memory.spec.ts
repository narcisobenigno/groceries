import type { Event } from "./event-store";
import { eventStoreContractTest } from "./event-store.contract";
import { InMemory } from "./in-memory";

describe("InMemoryEventStore", () => {
  eventStoreContractTest(async <E extends Event>() => new InMemory<E>());
});
