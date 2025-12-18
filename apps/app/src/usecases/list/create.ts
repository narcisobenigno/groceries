import type { ListCreated, ListEvent } from "@groceries/domain-events/list";
import type { Decider, State } from "@groceries/event-sourcing/decider";
import type { Id } from "./id";

export type CreateCommand = {
  type: "list.create";
  id: Id;
  name: string;
};

export type CreateState = State<ListCreated> & {
  [id in CreateCommand["id"]]?: boolean;
};

export function Create(): Decider<CreateCommand, CreateState, ListEvent> {
  return {
    decide: async (command, state) => {
      if (state[command.id]) {
        return [];
      }

      const { id, name } = command;
      const event: ListCreated = {
        type: "list.created",
        id,
        name,
      };
      return [
        {
          streamId: [id],
          type: event.type,
          event,
        },
      ];
    },
    evolve: (state, event) => {
      return { ...state, [event.event.id]: true };
    },
    initialState: () => ({ reducedEvents: new Set(["list.created"]) }),
  };
}
