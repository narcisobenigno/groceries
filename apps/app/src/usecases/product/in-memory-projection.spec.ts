import { eventstore } from "@groceries/event-sourcing";
import type { product } from "..";
import { InMemoryProjection } from "./in-memory-projection";

describe("InMemoryProjector", () => {
  describe("all", () => {
    it("projects events sorted by name", async () => {
      const eventStore = new eventstore.InMemory<product.ProductEvent>();
      const projector = InMemoryProjection(eventStore);

      await eventStore.save([
        {
          streamId: ["product_1234"],
          type: "product.added",
          event: { type: "product.added", id: "product_1234", name: "Product 1234" },
        },
        {
          streamId: ["product_1234"],
          type: "product.name-changed",
          event: {
            type: "product.name-changed",
            id: "product_1234",
            oldName: "Product 1234",
            newName: "Updated Product 1234",
          },
        },
        {
          streamId: ["product_4321"],
          type: "product.added",
          event: { type: "product.added", id: "product_4321", name: "Product 4321" },
        },
      ]);

      await projector.catchup();

      await expect(projector.all()).resolves.toEqual([
        { id: "product_4321", name: "Product 4321" },
        { id: "product_1234", name: "Updated Product 1234" },
      ]);
    });

    it("projects from where it left off", async () => {
      const eventStore = new eventstore.InMemory<product.ProductEvent>();
      const projector = InMemoryProjection(eventStore);

      await eventStore.save([
        {
          streamId: ["product_1234"],
          type: "product.added",
          event: { type: "product.added", id: "product_1234", name: "Product 1234" },
        },
        {
          streamId: ["product_4321"],
          type: "product.added",
          event: { type: "product.added", id: "product_4321", name: "Product 4321" },
        },
      ]);

      await projector.catchup();
      await expect(projector.all()).resolves.toEqual([
        { id: "product_1234", name: "Product 1234" },
        { id: "product_4321", name: "Product 4321" },
      ]);

      await eventStore.save([
        {
          streamId: ["product_1234"],
          type: "product.name-changed",
          event: {
            type: "product.name-changed",
            id: "product_1234",
            oldName: "Product 1234",
            newName: "Updated Product 1234",
          },
        },
      ]);

      await projector.catchup();
      await expect(projector.all()).resolves.toEqual([
        { id: "product_4321", name: "Product 4321" },
        { id: "product_1234", name: "Updated Product 1234" },
      ]);
    });
  });

  describe("byId", () => {
    it("projects events by id", async () => {
      const eventStore = new eventstore.InMemory<product.ProductEvent>();
      const projector = InMemoryProjection(eventStore);

      await eventStore.save([
        {
          streamId: ["product_1234"],
          type: "product.added",
          event: { type: "product.added", id: "product_1234", name: "Product 1234" },
        },
        {
          streamId: ["product_1234"],
          type: "product.name-changed",
          event: {
            type: "product.name-changed",
            id: "product_1234",
            oldName: "Product 1234",
            newName: "Updated Product 1234",
          },
        },
        {
          streamId: ["product_4321"],
          type: "product.added",
          event: { type: "product.added", id: "product_4321", name: "Product 4321" },
        },
      ]);

      await projector.catchup();

      await expect(projector.byId("product_1234")).resolves.toEqual({
        id: "product_1234",
        name: "Updated Product 1234",
      });
      await expect(projector.byId("product_4321")).resolves.toEqual({
        id: "product_4321",
        name: "Product 4321",
      });
    });

    it("rejects when id not found", async () => {
      const eventStore = new eventstore.InMemory<product.ProductEvent>();
      const projector = InMemoryProjection(eventStore);

      await expect(projector.byId("product_notexists")).rejects.toThrow(
        "Product with id 'product_notexists' not found",
      );
    });
  });
});
