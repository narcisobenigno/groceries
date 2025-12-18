import type * as eventstore from "../event-store";
import type { Command, Decider, State } from "./decider";

export type ExecuteCommand<C extends Command, E extends eventstore.Event> = (
  streamIds: string[],
  command: C,
) => Promise<eventstore.PersistedEnvelope<E>[]>;

export function Persisted<C extends Command, S extends State<E>, E extends eventstore.Event>(
  decider: Decider<C, S, E>,
  store: eventstore.EventStore<E>,
): ExecuteCommand<C, E> {
  return async (streamIds: string[], command: C): Promise<eventstore.PersistedEnvelope<E>[]> => {
    const existingEvents = await store.read({ streamIds });
    const state = existingEvents.reduce(decider.evolve, decider.initialState());
    const events = await decider.decide(command, state);

    return store.save(events, {
      lastEventPosition: existingEvents[existingEvents.length - 1]?.position,
      query: { streamId: streamIds },
    });
  };
}
