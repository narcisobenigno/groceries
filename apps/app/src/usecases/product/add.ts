import type { ProductAdded, ProductEvent } from "@groceries/domain-events/product";
import type { Decider, State } from "@groceries/event-sourcing/decider";
import type { Id } from "./id";

export type AddProductCommand = {
  type: "product.add";
  id: Id;
  name: string;
};

export type AddProductState = State<ProductAdded> & {
  [id in AddProductCommand["id"]]?: boolean;
};

export function AddProduct(): Decider<AddProductCommand, AddProductState, ProductEvent> {
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
    initialState: () => ({ reducedEvents: new Set(["product.added"]) }),
  };
}
