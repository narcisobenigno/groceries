export interface PersistedEnvelope {
  Position: bigint;
  Timestamp: Date;
  StreamID: string[];
  EventName: string;
  Event: any;
}

export interface Envelope<E> {
  streamID: string | string[];
  eventName: string;
  event: E;
}

export interface WriteCondition {
  lastEventPosition: bigint;
  query: {
    streamID: string[];
    events?: string[];
  };
}

export interface ReadCondition {
  offset?: bigint;
  streamIDs?: string[];
  events?: string[];
  limit?: number;
}

export interface EventStore<E> {
  save(envelopes: Envelope<E>[], writeCondition?: WriteCondition): Promise<PersistedEnvelope[]>;

  read(conditions: ReadCondition): Promise<PersistedEnvelope[]>;
}
