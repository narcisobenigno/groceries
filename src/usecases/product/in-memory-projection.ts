import type { eventstore } from "@/event-sourcing";
import type { product } from "..";
import type * as projection from "./projection";

export type InMemoryProjection = projection.Projection & {
  catchup(): Promise<void>;
};

export function InMemoryProjection(eventStore: eventstore.EventStore<product.ProductEvent>) {
  let products: Record<product.Id, projection.Product> = {};
  let lastPosition: bigint | undefined = undefined;

  async function all(): Promise<projection.Product[]> {
    return [...Object.values(products)].sort((a, b) => (a.name < b.name ? -1 : 1));
  }

  async function catchup(): Promise<void> {
    const events = await eventStore.read({
      events: ["product.added", "product.name-changed"],
      offset: lastPosition,
    });
    products = events.reduce((acc, event) => {
      switch (event.event.type) {
        case "product.added":
          acc[event.event.id] = { id: event.event.id, name: event.event.name };
          break;
        case "product.name-changed":
          if (acc[event.event.id]) {
            acc[event.event.id].name = event.event.newName;
          }
          break;
      }
      return acc;
    }, products);
    lastPosition = events[events.length - 1]?.position || lastPosition;
  }

  return { all, catchup };
}
