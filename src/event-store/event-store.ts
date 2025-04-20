export interface PersistedEnvelope {
  position: bigint;
  timestamp: Date;
  streamId: string[];
  type: string;
  event: Record<string, unknown>;
}

export type Event = {
  type: string;
  [key: string]: unknown;
};

export interface Envelope<E extends Event> {
  streamId: string | string[];
  type: E["type"];
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

export interface EventStore<E extends Event> {
  save(envelopes: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope[]>;

  read(conditions: ReadCondition): Promise<PersistedEnvelope[]>;
}
