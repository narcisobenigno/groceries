import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { eventstore } from "@groceries/event-sourcing"
import type { list } from ".."
import { InMemoryProjection, ListNotFoundError } from "./in-memory-projection"

describe("InMemoryProjector", () => {
  describe("all", () => {
    it("returns all lists sorted by name", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>()
      const projector = InMemoryProjection(eventStore)

      await eventStore.save([
        {
          streamId: ["list_1234"],
          type: "list.created",
          event: { type: "list.created", id: "list_1234", name: "List 1234" },
        },
        {
          streamId: ["list_1234"],
          type: "list.name-changed",
          event: {
            type: "list.name-changed",
            id: "list_1234",
            oldName: "List 1234",
            newName: "Updated List 1234",
          },
        },
        {
          streamId: ["list_4321"],
          type: "list.created",
          event: { type: "list.created", id: "list_4321", name: "List 4321" },
        },
      ])

      await projector.catchup()

      const result = await projector.all()
      assert.deepStrictEqual(result, [
        { id: "list_4321", name: "List 4321" },
        { id: "list_1234", name: "Updated List 1234" },
      ])
    })

    it("projects from where it left off", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>()
      const projector = InMemoryProjection(eventStore)

      await eventStore.save([
        {
          streamId: ["list_1234"],
          type: "list.created",
          event: { type: "list.created", id: "list_1234", name: "List 1234" },
        },
        {
          streamId: ["list_4321"],
          type: "list.created",
          event: { type: "list.created", id: "list_4321", name: "List 4321" },
        },
      ])

      await projector.catchup()
      const firstResult = await projector.all()
      assert.deepStrictEqual(firstResult, [
        { id: "list_1234", name: "List 1234" },
        { id: "list_4321", name: "List 4321" },
      ])

      await eventStore.save([
        {
          streamId: ["list_1234"],
          type: "list.name-changed",
          event: {
            type: "list.name-changed",
            id: "list_1234",
            oldName: "List 1234",
            newName: "Updated List 1234",
          },
        },
      ])

      await projector.catchup()
      const secondResult = await projector.all()
      assert.deepStrictEqual(secondResult, [
        { id: "list_4321", name: "List 4321" },
        { id: "list_1234", name: "Updated List 1234" },
      ])
    })
  })

  describe("byId", () => {
    it("projects events by id", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>()
      const projector = InMemoryProjection(eventStore)

      await eventStore.save([
        {
          streamId: ["list_1234"],
          type: "list.created",
          event: { type: "list.created", id: "list_1234", name: "List 1234" },
        },
        {
          streamId: ["list_1234"],
          type: "list.name-changed",
          event: {
            type: "list.name-changed",
            id: "list_1234",
            oldName: "List 1234",
            newName: "Updated List 1234",
          },
        },
        {
          streamId: ["list_4321"],
          type: "list.created",
          event: { type: "list.created", id: "list_4321", name: "List 4321" },
        },
      ])

      await projector.catchup()

      const result1 = await projector.byId("list_1234")
      assert.deepStrictEqual(result1, {
        id: "list_1234",
        name: "Updated List 1234",
      })

      const result2 = await projector.byId("list_4321")
      assert.deepStrictEqual(result2, {
        id: "list_4321",
        name: "List 4321",
      })
    })

    it("rejects when id not found", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>()
      const projector = InMemoryProjection(eventStore)

      await assert.rejects(projector.byId("list_notexists"), ListNotFoundError)
    })
  })
})
