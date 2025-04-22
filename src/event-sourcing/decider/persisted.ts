import type { eventstore } from "@/event-sourcing";
import type { Command, Decider, State } from "./decider";

export const Persisted =
  <E extends eventstore.Event, C extends Command, S extends State>(
    decider: Decider<C, S, E>,
    store: eventstore.EventStore<E>,
  ) =>
  async (streamIds: string[], command: C): Promise<eventstore.PersistedEnvelope<E>[]> => {
    return store
      .read({ streamIds })
      .then((events) => decider.decide(command, events.reduce(decider.evolve, decider.intialState())))
      .then((events) => store.save(events, { lastEventPosition: 0n, query: { streamId: streamIds } }));
  };
