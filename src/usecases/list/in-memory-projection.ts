import type { eventstore } from "@/event-sourcing";
import type { list } from "..";
import type * as projection from "./projection";

export type InMemoryProjection = projection.Projection & {
  catchup(): Promise<void>;
};

export class ListNotFoundError extends Error {
  constructor(id: list.Id) {
    super(`List with id '${id}' not found`);
    this.name = "ListNotFoundError";
  }
}

export function InMemoryProjection(eventStore: eventstore.EventStore<list.ListEvent>) {
  let lists: Record<list.Id, projection.List> = {};
  let lastPosition: bigint | undefined = undefined;

  async function all(): Promise<projection.List[]> {
    return [...Object.values(lists)].sort((a, b) => (a.name < b.name ? -1 : 1));
  }

  async function catchup(): Promise<void> {
    const events = await eventStore.read({
      events: ["list.created", "list.name-changed"],
      offset: lastPosition,
    });
    lists = events.reduce((acc, event) => {
      switch (event.event.type) {
        case "list.created":
          acc[event.event.id] = { id: event.event.id, name: event.event.name };
          break;
        case "list.name-changed":
          if (acc[event.event.id]) {
            acc[event.event.id].name = event.event.newName;
          }
          break;
      }
      return acc;
    }, lists);
    lastPosition = events[events.length - 1]?.position || lastPosition;
  }

  async function byId(id: list.Id): Promise<projection.List> {
    const list = lists[id];
    if (!list) {
      throw new ListNotFoundError(id);
    }
    return list;
  }

  return { all, byId, catchup };
}
