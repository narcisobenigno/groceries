import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PersistedEnvelope } from "@groceries/event-sourcing/event-store";
import { ChangeName } from "./change-name";
import type { ProductEvent } from "./event";

describe("change name", () => {
  it("changes name after product created", async () => {
    const changeName = ChangeName();

    const setupEvents: PersistedEnvelope<ProductEvent>[] = [
      {
        type: "product.added",
        streamId: ["product_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "product.added", id: "product_123", name: "Test Product" },
      },
    ];

    const result = await changeName.decide(
      { type: "product.change-name", id: "product_123", newName: "New Test Product" },
      setupEvents.reduce(changeName.evolve, changeName.initialState()),
    );

    assert.deepStrictEqual(result, [
      {
        streamId: ["product_123"],
        type: "product.name-changed",
        event: {
          type: "product.name-changed",
          id: "product_123",
          newName: "New Test Product",
          oldName: "Test Product",
        },
      },
    ]);
  });

  it("changes name after product name changed", async () => {
    const changeName = ChangeName();

    const setupEvents: PersistedEnvelope<ProductEvent>[] = [
      {
        type: "product.added",
        streamId: ["product_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "product.added", id: "product_123", name: "First Test Product" },
      },
      {
        type: "product.name-changed",
        streamId: ["product_123"],
        position: 2n,
        timestamp: new Date(),
        event: {
          type: "product.name-changed",
          id: "product_123",
          newName: "New Test Product",
          oldName: "First Test Product",
        },
      },
    ];

    const result = await changeName.decide(
      { type: "product.change-name", id: "product_123", newName: "Newest Test Product" },
      setupEvents.reduce(changeName.evolve, changeName.initialState()),
    );

    assert.deepStrictEqual(result, [
      {
        streamId: ["product_123"],
        type: "product.name-changed",
        event: {
          type: "product.name-changed",
          id: "product_123",
          oldName: "New Test Product",
          newName: "Newest Test Product",
        },
      },
    ]);
  });

  it("does not change name when product does not exist", async () => {
    const changeName = ChangeName();

    await assert.rejects(
      changeName.decide(
        { type: "product.change-name", id: "product_123", newName: "New Test Product" },
        changeName.initialState(),
      ),
      new Error("Product with id product_123 does not exist"),
    );
  });

  it("does not change name when new name is the same", async () => {
    const changeName = ChangeName();

    const setupEvents: PersistedEnvelope<ProductEvent>[] = [
      {
        type: "product.added",
        streamId: ["product_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "product.added", id: "product_123", name: "Test Product" },
      },
    ];

    const result = await changeName.decide(
      { type: "product.change-name", id: "product_123", newName: "Test Product" },
      setupEvents.reduce(changeName.evolve, changeName.initialState()),
    );

    assert.deepStrictEqual(result, []);
  });
});
