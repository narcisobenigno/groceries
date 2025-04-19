import type { Envelope, EventStore, PersistedEnvelope, ReadCondition, WriteCondition } from "./event-store";

interface Clock {
  now: () => Date;
}

export class InMemoryEventStore<Event> implements EventStore<Event> {
  #clock: Clock;
  #store: PersistedEnvelope[] = [];
  #position = BigInt(0);

  constructor(clock: Clock = { now: () => new Date() }) {
    this.#clock = clock;
  }

  async save(events: Envelope<Event>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope[]> {
    if (writeCondition && writeCondition.lastEventPosition !== this.#position) {
      throw new Error(`Concurrency conflict: Events were inserted after position ${writeCondition.lastEventPosition}`);
    }

    const persistedRows = events.map<PersistedEnvelope>((event) => ({
      ...event,
      streamId: Array.isArray(event.streamId) ? event.streamId : [event.streamId],
      position: ++this.#position,
      timestamp: this.#clock.now(),
      event: event.event as Record<string, unknown>,
    }));

    this.#store.push(...persistedRows);

    return persistedRows;
  }

  async read(conditions: ReadCondition): Promise<PersistedEnvelope[]> {
    const { upto, streamIds, events, limit } = conditions;

    const filtered = this.#store.filter((event) => {
      const isWithinStreamIds = streamIds ? streamIds.some((streamId) => event.streamId.includes(streamId)) : true;
      const isWithinEvents = events ? events.includes(event.eventName) : true;
      const isWithinUpto = upto ? event.position <= upto : true;

      return isWithinStreamIds && isWithinEvents && isWithinUpto;
    });

    if (limit) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }
}
