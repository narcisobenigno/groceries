import type * as eventstore from "../event-store";

export type Command = {
  type: string;
};

export type State<E extends eventstore.Event> = {
  reducedEvents: Set<E["type"]>;
};

export interface Decider<C extends Command, S extends State<E>, E extends eventstore.Event> {
  decide: (command: C, state: S) => Promise<Array<eventstore.Envelope<E>>>;
  evolve: (state: S, event: eventstore.PersistedEnvelope<E>) => S;
  initialState: () => S;
}
