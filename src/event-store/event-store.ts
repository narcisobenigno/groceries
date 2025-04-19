export interface PersistedEnvelope {
  position: bigint;
  timestamp: Date;
  streamId: string[];
  eventName: string;
  event: Record<string, unknown>;
}

export interface Envelope<E> {
  streamId: string | string[];
  eventName: string;
  event: E;
}

export interface WriteCondition {
  lastEventPosition: bigint;
  query: {
    streamId: string[];
    events?: string[];
  };
}

export interface ReadCondition {
  upto?: bigint;
  offset?: bigint;
  streamIds?: string[];
  events?: string[];
  limit?: number;
}

export interface EventStore<E> {
  save(envelopes: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope[]>;

  read(conditions: ReadCondition): Promise<PersistedEnvelope[]>;
}
