import { eventstore } from "@groceries/event-sourcing";
import type { list } from "..";
import { InMemoryProjection } from "./in-memory-projection";

describe("InMemoryProjector", () => {
  describe("all", () => {
    it("returns all lists sorted by name", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>();
      const projector = InMemoryProjection(eventStore);

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
      ]);

      await projector.catchup();

      await expect(projector.all()).resolves.toEqual([
        { id: "list_4321", name: "List 4321" },
        { id: "list_1234", name: "Updated List 1234" },
      ]);
    });

    it("projects from where it left off", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>();
      const projector = InMemoryProjection(eventStore);

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
      ]);

      await projector.catchup();
      await expect(projector.all()).resolves.toEqual([
        { id: "list_1234", name: "List 1234" },
        { id: "list_4321", name: "List 4321" },
      ]);

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
      ]);

      await projector.catchup();
      await expect(projector.all()).resolves.toEqual([
        { id: "list_4321", name: "List 4321" },
        { id: "list_1234", name: "Updated List 1234" },
      ]);
    });
  });

  describe("byId", () => {
    it("projects events by id", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>();
      const projector = InMemoryProjection(eventStore);

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
      ]);

      await projector.catchup();

      await expect(projector.byId("list_1234")).resolves.toEqual({
        id: "list_1234",
        name: "Updated List 1234",
      });
      await expect(projector.byId("list_4321")).resolves.toEqual({
        id: "list_4321",
        name: "List 4321",
      });
    });

    it("rejects when id not found", async () => {
      const eventStore = new eventstore.InMemory<list.ListEvent>();
      const projector = InMemoryProjection(eventStore);

      await expect(projector.byId("list_notexists")).rejects.toThrow("List with id 'list_notexists' not found");
    });
  });
});
