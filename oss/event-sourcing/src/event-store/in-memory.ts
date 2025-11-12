import { Mutex } from "async-mutex";
import type { Envelope, Event, EventStore, PersistedEnvelope, ReadCondition, WriteCondition } from "./event-store";

interface Clock {
  now: () => Date;
}

export class InMemory<E extends Event> implements EventStore<E> {
  #store: PersistedEnvelope<E>[] = [];
  #position = 0n;
  #mutex: Mutex;

  constructor(
    private readonly clock: Clock = { now: () => new Date() },
    private readonly limit = 1000,
  ) {
    this.#mutex = new Mutex();
  }

  async save(events: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope<E>[]> {
    if (events.length === 0) {
      return [];
    }

    const release = await this.#mutex.acquire();
    try {
      const streamEvents = await this.read({
        streamIds: writeCondition?.query?.streamId,
        events: writeCondition?.query?.events,
      });
      if (writeCondition && writeCondition.lastEventPosition !== streamEvents[streamEvents.length - 1]?.position) {
        throw new Error(
          `Concurrency conflict: Events were inserted after position ${writeCondition.lastEventPosition}`,
        );
      }

      const persistedRows = events.map<PersistedEnvelope<E>>((event) => ({
        ...event,
        streamId: Array.isArray(event.streamId) ? event.streamId : [event.streamId],
        position: ++this.#position,
        timestamp: this.clock.now(),
        event: event.event as E,
      }));

      this.#store.push(...persistedRows);

      return persistedRows;
    } finally {
      release();
    }
  }

  async read(conditions: ReadCondition<E>): Promise<PersistedEnvelope<E>[]> {
    const { upto, streamIds, events, limit, offset } = conditions;

    const filtered = this.#store
      .filter((event) => !streamIds || streamIds.some((streamId) => event.streamId.includes(streamId)))
      .filter((event) => !events || events.includes(event.type))
      .filter((event) => !upto || event.position <= upto)
      .filter((event) => !offset || event.position > offset);

    return filtered.slice(0, limit ?? this.limit);
  }
}
