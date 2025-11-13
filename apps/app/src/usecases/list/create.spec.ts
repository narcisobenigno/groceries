import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Create } from "./create";

describe("Create List", () => {
  it("creates a new list", async () => {
    const addProduct = Create();

    const result = await addProduct.decide(
      { type: "list.create", id: "list_123", name: "Test List" },
      addProduct.intialState(),
    );

    assert.deepStrictEqual(result, [
      {
        streamId: ["list_123"],
        type: "list.created",
        event: { type: "list.created", id: "list_123", name: "Test List" },
      },
    ]);
  });

  it("does not add when product already exists", async () => {
    const addProduct = Create();

    const result = await addProduct.decide(
      { type: "list.create", id: "list_123", name: "Test List" },
      addProduct.evolve(addProduct.intialState(), {
        type: "list.created",
        streamId: ["list_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "list.created", id: "list_123", name: "Test List" },
      }),
    );

    assert.deepStrictEqual(result, []);
  });
});
