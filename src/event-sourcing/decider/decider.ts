import type { eventstore } from "@/event-sourcing";

export type Command = {
  type: string;
};

export type State = Record<string, any>;

export interface Decider<C extends Command, S extends State, E extends eventstore.Event> {
  decide: (command: C, state: S) => Promise<Array<eventstore.Envelope<E>>>;
  evolve: (state: S, event: eventstore.PersistedEnvelope<E>) => S;
  intialState: () => S;
}
