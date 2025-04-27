import type { PersistedEnvelope } from "@/event-sourcing/event-store";
import { Create, type ListCreated } from "./create";

describe("Create List", () => {
  it("creates a list", async () => {
    const useCase = Create();

    const events = await useCase.decide(
      {
        type: "list.create",
        id: "list_1",
        name: "list 1",
      },
      useCase.intialState(),
    );

    expect(events).toEqual([
      {
        streamId: ["list_1"],
        type: "list.created",
        event: {
          type: "list.created",
          id: "list_1",
          name: "list 1",
        },
      },
    ]);
  });

  it("does not create list if id already exits", async () => {
    const useCase = Create();

    const existingEvents: PersistedEnvelope<ListCreated>[] = [
      {
        streamId: ["list_1"],
        type: "list.created",
        position: 1n,
        timestamp: new Date(),
        event: {
          type: "list.created",
          id: "list_1",
          name: "list 1",
        },
      },
    ];

    const events = await useCase.decide(
      {
        type: "list.create",
        id: "list_1",
        name: "list 1",
      },
      existingEvents.reduce(useCase.evolve, useCase.intialState()),
    );

    expect(events).toEqual([]);
  });
});
