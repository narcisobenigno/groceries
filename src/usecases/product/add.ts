import type { Decider } from "@/event-sourcing/decider";
import type { Id } from "./id";

type AddProductCommand = {
  type: "product.add";
  id: Id;
  name: string;
};

type AddProductState = {
  [id in AddProductCommand["id"]]?: boolean;
};

export type ProductAdded = {
  type: "product.added";
  id: AddProductCommand["id"];
  name: string;
};

export const AddProduct = (): Decider<AddProductCommand, AddProductState, ProductAdded> => ({
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
  evolve: (_state, event) => {
    return { [event.event.id]: true };
  },
  intialState: () => ({}),
});
