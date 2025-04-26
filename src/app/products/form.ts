import type { eventstore } from "@/event-sourcing";
import type { product } from "@/usecases";
import type { Request, Response } from "express";

export function form(eventStore: eventstore.EventStore<product.ProductAdded>) {
  return async (_request: Request, response: Response) => {
    const events = await eventStore.read({ events: ["product.added"] });

    const test = await myFetch();
    response.render("products/form", {
      products: events.map((event) => ({ id: event.event.id, name: event.event.name, test })),
    });
  };
}

async function myFetch() {
  throw new Error("not implemented");
}
