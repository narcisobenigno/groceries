export type ParseEvent<E extends Event> = (event: Record<string, unknown>) => E;

export interface PersistedEnvelope<E extends Event> {
  position: bigint;
  timestamp: Date;
  streamId: string[];
  type: E["type"];
  event: E;
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

export interface ReadCondition<E extends Event> {
  upto?: bigint;
  offset?: bigint;
  streamIds?: string[];
  events?: E["type"][];
  limit?: number;
}

export interface EventStore<E extends Event> {
  save(envelopes: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope<E>[]>;

  read(conditions: ReadCondition<E>): Promise<PersistedEnvelope<E>[]>;
}
