import type { eventstore } from "@/event-sourcing";
import type { Command, Decider, State } from "./decider";

export const Persisted =
  <E extends eventstore.Event, C extends Command, S extends State<E>>(
    decider: Decider<C, S, E>,
    store: eventstore.EventStore<E>,
  ) =>
  async (streamIds: string[], command: C): Promise<eventstore.PersistedEnvelope<E>[]> => {
    const existingEvents = await store.read({ streamIds });

    return decider.decide(command, existingEvents.reduce(decider.evolve, decider.intialState())).then((events) =>
      store.save(events, {
        lastEventPosition: existingEvents[existingEvents.length - 1]?.position || 0n,
        query: { streamId: streamIds },
      }),
    );
  };
