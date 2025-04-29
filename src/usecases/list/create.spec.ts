import { Create } from "./create";

describe("Create List", () => {
  it("creates a new list", async () => {
    const addProduct = Create();

    await expect(
      addProduct.decide({ type: "list.create", id: "product_123", name: "Test Product" }, addProduct.intialState()),
    ).resolves.toEqual([
      {
        streamId: ["product_123"],
        type: "list.created",
        event: { type: "list.created", id: "product_123", name: "Test Product" },
      },
    ]);
  });

  it("does not add when product already exists", async () => {
    const addProduct = Create();

    await expect(
      addProduct.decide(
        { type: "list.create", id: "product_123", name: "Test Product" },
        addProduct.evolve(addProduct.intialState(), {
          type: "list.created",
          streamId: ["product_123"],
          position: 1n,
          timestamp: new Date(),
          event: { type: "list.created", id: "product_123", name: "Test Product" },
        }),
      ),
    ).resolves.toEqual([]);
  });
});
