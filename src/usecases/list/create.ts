import type { Decider, State } from "@/event-sourcing/decider";

export type Id = `list_${string}`;

export type CreateListCommand = {
  type: "list.create";
  id: Id;
  name: string;
};

export type ListCreated = {
  type: "list.created";
  id: CreateListCommand["id"];
  name: string;
};

export type CreateListState = State<ListCreated> & {
  [id in CreateListCommand["id"]]?: boolean;
};

export function Create(): Decider<CreateListCommand, CreateListState, ListCreated> {
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
