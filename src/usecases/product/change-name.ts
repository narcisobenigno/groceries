import type { Decider, State } from "@/event-sourcing/decider";
import type { PersistedEnvelope } from "@/event-sourcing/event-store";
import type { ProductEvent } from "./event";
import type { Id } from "./id";

export type ChangeNameCommand = {
  type: "product.change-name";
  id: Id;
  newName: string;
};
export type ChangeNameState = State<ProductEvent> & {
  oldName: {
    [id in ChangeNameCommand["id"]]?: string;
  };
};

export type NameChanged = {
  type: "product.name-changed";
  id: ChangeNameCommand["id"];
  newName: string;
  oldName: string;
};

export function ChangeName(): Decider<ChangeNameCommand, ChangeNameState, ProductEvent> {
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
          type: "product.name-changed",
          event: {
            type: "product.name-changed",
            id,
            newName,
            oldName,
          },
        },
      ];
    },
    evolve: (state: ChangeNameState, event: PersistedEnvelope<ProductEvent>) => {
      switch (event.event.type) {
        case "product.added":
          return {
            reducedEvents: state.reducedEvents.add("product.added"),
            oldName: { ...state.oldName, [event.event.id]: event.event.name },
          };
        case "product.name-changed":
          return { ...state, oldName: { ...state.oldName, [event.event.id]: event.event.newName } };
      }
    },
    intialState: () => ({ reducedEvents: new Set(["product.name-changed"]), oldName: {} }),
  };
}
