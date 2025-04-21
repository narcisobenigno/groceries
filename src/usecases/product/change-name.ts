import type { Decider } from "@/event-sourcing/decider";
import type { ProductEvent } from "./event";

type ChangeNameCommand = {
  type: "product.change-name";
  id: `product_${string}`;
  newName: string;
};
type ChangeNameState = {
  [id: ChangeNameCommand["id"]]: string;
};

export type NameChanged = {
  type: "product.name-changed";
  id: ChangeNameCommand["id"];
  newName: string;
  oldName: string;
};

export const ChangeName = (): Decider<ChangeNameCommand, ChangeNameState, ProductEvent> => {
  return {
    decide: async (command, state) => {
      if (!state[command.id]) {
        throw new Error(`Product with id ${command.id} does not exist`);
      }

      const { id, newName } = command;
      return [
        {
          streamId: [id],
          type: "product.name-changed",
          event: {
            type: "product.name-changed",
            id,
            newName,
            oldName: state[id],
          },
        },
      ];
    },
    evolve: (state, event) => {
      switch (event.event.type) {
        case "product.added":
          return { [event.event.id]: event.event.name };
        case "product.name-changed":
          return { [event.event.id]: event.event.newName };
      }
      return state;
    },
    intialState: () => ({}),
  };
};
