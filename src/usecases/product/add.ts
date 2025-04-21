import type { Decider } from "@/event-sourcing/decider";

type AddProductCommand = {
  type: "product.add";
  id: `product_${string}`;
  name: string;
};

type AddProductState = {
  [id: AddProductCommand["id"]]: boolean;
};

type ProductAdded = {
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
