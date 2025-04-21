import type { Envelope, Event, PersistedEnvelope } from "../event-store";

export type Command = {
  type: string;
};

export type State = Record<string, any>;

export interface Decider<C extends Command, S extends State, E extends Event> {
  decide: (command: C, state: S) => Promise<Array<Envelope<E>>>;
  evolve: (state: S, event: PersistedEnvelope<E>) => S;
  intialState: () => S;
}
