import type { Decider, State } from "@/event-sourcing/decider";
import type { PersistedEnvelope } from "@/event-sourcing/event-store";
import type { ListEvent } from "./event";
import type { Id } from "./id";

export type ChangeNameCommand = {
  type: "list.change-name";
  id: Id;
  newName: string;
};
export type ChangeNameState = State<ListEvent> & {
  oldName: {
    [id in ChangeNameCommand["id"]]?: string;
  };
};

export type NameChanged = {
  type: "list.name-changed";
  id: ChangeNameCommand["id"];
  newName: string;
  oldName: string;
};

export function ChangeName(): Decider<ChangeNameCommand, ChangeNameState, ListEvent> {
  return {
    decide: async (command: ChangeNameCommand, state: ChangeNameState) => {
      const oldName = state.oldName[command.id];
      if (!oldName) {
        throw new Error(`Product with id ${command.id} does not exist`);
      }
      const { id, newName } = command;
      if (oldName === newName) {
        return [];
      }

      return [
        {
          streamId: [id],
          type: "list.name-changed",
          event: {
            type: "list.name-changed",
            id,
            newName,
            oldName,
          },
        },
      ];
    },
    evolve: (state: ChangeNameState, event: PersistedEnvelope<ListEvent>) => {
      switch (event.event.type) {
        case "list.created":
          return {
            reducedEvents: state.reducedEvents.add("list.created"),
            oldName: { ...state.oldName, [event.event.id]: event.event.name },
          };
        case "list.name-changed":
          return { ...state, oldName: { ...state.oldName, [event.event.id]: event.event.newName } };
      }
    },
    intialState: () => ({ reducedEvents: new Set(["list.created", "list.name-changed"]), oldName: {} }),
  };
}
