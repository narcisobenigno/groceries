import type { Decider, State } from "@/event-sourcing/decider";
import type { ListEvent } from "./event";
import type { Id } from "./id";

export type CreateCommand = {
  type: "list.create";
  id: Id;
  name: string;
};

export type CreateState = State<ListCreated> & {
  [id in CreateCommand["id"]]?: boolean;
};

export type ListCreated = {
  type: "list.created";
  id: CreateCommand["id"];
  name: string;
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
    intialState: () => ({ reducedEvents: new Set(["list.created"]) }),
  };
}
