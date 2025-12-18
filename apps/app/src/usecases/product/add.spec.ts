import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AddProduct } from "./add";

describe("AddProduct", () => {
  it("creates a new product", async () => {
    const addProduct = AddProduct();

    const result = await addProduct.decide(
      { type: "product.add", id: "product_123", name: "Test Product" },
      addProduct.initialState(),
    );

    assert.deepStrictEqual(result, [
      {
        streamId: ["product_123"],
        type: "product.added",
        event: { type: "product.added", id: "product_123", name: "Test Product" },
      },
    ]);
  });

  it("does not add when product already exists", async () => {
    const addProduct = AddProduct();

    const result = await addProduct.decide(
      { type: "product.add", id: "product_123", name: "Test Product" },
      addProduct.evolve(addProduct.initialState(), {
        type: "product.added",
        streamId: ["product_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "product.added", id: "product_123", name: "Test Product" },
      }),
    );

    assert.deepStrictEqual(result, []);
  });
});
