import type { Decider, State } from "@/event-sourcing/decider";
import type { Id } from "./id";

export type AddProductCommand = {
  type: "product.add";
  id: Id;
  name: string;
};

export type AddProductState = State<ProductAdded> & {
  [id in AddProductCommand["id"]]?: boolean;
};

export type ProductAdded = {
  type: "product.added";
  id: AddProductCommand["id"];
  name: string;
};

export function AddProduct(): Decider<AddProductCommand, AddProductState, ProductAdded> {
  return {
    decide: async (command, state) => {
      if (state[command.id]) {
        return [];
      }

      const { id, name } = command;
      const event: ProductAdded = {
        type: "product.added",
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
    intialState: () => ({ reducedEvents: new Set(["product.added"]) }),
  };
}
