import { AddProduct } from "./add";

describe("AddProduct", () => {
  it("creates a new product", async () => {
    const addProduct = AddProduct();

    await expect(
      addProduct.decide({ type: "product.add", id: "product_123", name: "Test Product" }, addProduct.intialState()),
    ).resolves.toEqual([
      {
        streamId: ["product_123"],
        type: "product.added",
        event: { type: "product.added", id: "product_123", name: "Test Product" },
      },
    ]);
  });

  it("does not add when product already exists", async () => {
    const addProduct = AddProduct();

    await expect(
      addProduct.decide(
        { type: "product.add", id: "product_123", name: "Test Product" },
        addProduct.evolve(addProduct.intialState(), {
          type: "product.added",
          streamId: ["product_123"],
          position: 1n,
          timestamp: new Date(),
          event: { type: "product.added", id: "product_123", name: "Test Product" },
        }),
      ),
    ).resolves.toEqual([]);
  });
});
