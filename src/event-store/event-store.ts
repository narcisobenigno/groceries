import type { Envelope, PostgresPersistedEnvelope as EventPersistedEnvelope, WriteCondition } from "./types";

export interface EventStore<E> {
  save(envelopes: Envelope<E>[], writeCondition?: WriteCondition<E>): Promise<EventPersistedEnvelope[]>;

  read(offset: bigint, streamIDs: string[], events: string[], limit: number): Promise<EventPersistedEnvelope[]>;
}
