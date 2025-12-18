import type { ListEvent } from "@groceries/domain-events/list";
import type { Decider, State } from "@groceries/event-sourcing/decider";
import type { PersistedEnvelope } from "@groceries/event-sourcing/event-store";
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
    initialState: () => ({ reducedEvents: new Set(["list.created", "list.name-changed"]), oldName: {} }),
  };
}
