import type { Envelope, EventStore, PersistedEnvelope, ReadCondition, WriteCondition } from "./event-store";

interface Clock {
  now: () => Date;
}

export class InMemoryEventStore<Event> implements EventStore<Event> {
  #store: PersistedEnvelope[] = [];
  #position = BigInt(0);

  constructor(
    private readonly clock: Clock = { now: () => new Date() },
    private readonly limit = 1000,
  ) {}

  async save(events: Envelope<Event>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope[]> {
    if (writeCondition && writeCondition.lastEventPosition !== this.#position) {
      throw new Error(`Concurrency conflict: Events were inserted after position ${writeCondition.lastEventPosition}`);
    }

    const persistedRows = events.map<PersistedEnvelope>((event) => ({
      ...event,
      streamId: Array.isArray(event.streamId) ? event.streamId : [event.streamId],
      position: ++this.#position,
      timestamp: this.clock.now(),
      event: event.event as Record<string, unknown>,
    }));

    this.#store.push(...persistedRows);

    return persistedRows;
  }

  async read(conditions: ReadCondition): Promise<PersistedEnvelope[]> {
    const { upto, streamIds, events, limit, offset } = conditions;

    const filtered = this.#store
      .filter((event) => !streamIds || streamIds.some((streamId) => event.streamId.includes(streamId)))
      .filter((event) => !events || events.includes(event.type))
      .filter((event) => !upto || event.position <= upto)
      .filter((event) => !offset || event.position > offset);

    return filtered.slice(0, limit ?? this.limit);
  }
}
