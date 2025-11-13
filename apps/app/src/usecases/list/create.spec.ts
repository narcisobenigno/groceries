import { Create } from "./create";

describe("Create List", () => {
  it("creates a new list", async () => {
    const addProduct = Create();

    await expect(
      addProduct.decide({ type: "list.create", id: "list_123", name: "Test List" }, addProduct.intialState()),
    ).resolves.toEqual([
      {
        streamId: ["list_123"],
        type: "list.created",
        event: { type: "list.created", id: "list_123", name: "Test List" },
      },
    ]);
  });

  it("does not add when product already exists", async () => {
    const addProduct = Create();

    await expect(
      addProduct.decide(
        { type: "list.create", id: "list_123", name: "Test List" },
        addProduct.evolve(addProduct.intialState(), {
          type: "list.created",
          streamId: ["list_123"],
          position: 1n,
          timestamp: new Date(),
          event: { type: "list.created", id: "list_123", name: "Test List" },
        }),
      ),
    ).resolves.toEqual([]);
  });
});
