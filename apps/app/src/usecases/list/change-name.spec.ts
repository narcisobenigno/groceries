import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PersistedEnvelope } from "@groceries/event-sourcing/event-store";
import { ChangeName } from "./change-name";
import type { ListEvent } from "./event";

describe("change name", () => {
  it("changes name after list created", async () => {
    const changeName = ChangeName();

    const setupEvents: PersistedEnvelope<ListEvent>[] = [
      {
        type: "list.created",
        streamId: ["list_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "list.created", id: "list_123", name: "Test List" },
      },
    ];

    const result = await changeName.decide(
      {
        type: "list.change-name",
        id: "list_123",
        newName: "New Test List",
      },
      setupEvents.reduce(changeName.evolve, changeName.intialState()),
    );
    assert.deepStrictEqual(result, [
      {
        streamId: ["list_123"],
        type: "list.name-changed",
        event: {
          type: "list.name-changed",
          id: "list_123",
          newName: "New Test List",
          oldName: "Test List",
        },
      },
    ]);
  });

  it("changes name after list name changed", async () => {
    const changeName = ChangeName();

    const setupEvents: PersistedEnvelope<ListEvent>[] = [
      {
        type: "list.created",
        streamId: ["list_123"],
        position: 1n,
        timestamp: new Date(),
        event: {
          type: "list.created",
          id: "list_123",
          name: "First Test Product",
        },
      },
      {
        type: "list.name-changed",
        streamId: ["list_123"],
        position: 2n,
        timestamp: new Date(),
        event: {
          type: "list.name-changed",
          id: "list_123",
          newName: "New Test Product",
          oldName: "First Test Product",
        },
      },
    ];

    const result = await changeName.decide(
      {
        type: "list.change-name",
        id: "list_123",
        newName: "Newest Test Product",
      },
      setupEvents.reduce(changeName.evolve, changeName.intialState()),
    );
    assert.deepStrictEqual(result, [
      {
        streamId: ["list_123"],
        type: "list.name-changed",
        event: {
          type: "list.name-changed",
          id: "list_123",
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
        {
          type: "list.change-name",
          id: "list_123",
          newName: "New Test Product",
        },
        changeName.intialState(),
      ),
      new Error("Product with id list_123 does not exist"),
    );
  });

  it("does not change name when new name is the same", async () => {
    const changeName = ChangeName();

    const setupEvents: PersistedEnvelope<ListEvent>[] = [
      {
        type: "list.created",
        streamId: ["list_123"],
        position: 1n,
        timestamp: new Date(),
        event: { type: "list.created", id: "list_123", name: "Test Product" },
      },
    ];

    const result = await changeName.decide(
      { type: "list.change-name", id: "list_123", newName: "Test Product" },
      setupEvents.reduce(changeName.evolve, changeName.intialState()),
    );
    assert.deepStrictEqual(result, []);
  });
});
