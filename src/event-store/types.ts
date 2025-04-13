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
