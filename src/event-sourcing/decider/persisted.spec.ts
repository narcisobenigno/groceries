import { eventstore } from "@/event-sourcing";
import type { Decider, State } from "./decider";
import { Persisted } from "./persisted";

describe("Persisted Decider", () => {
  it("persistes decision to event store", async () => {
    const eventStore = new eventstore.InMemory<CreatedEvent>();
    const decider = CreateDecider();
    const run = Persisted<CreateCommand, CreateState, CreatedEvent>(decider, eventStore);

    const command: CreateCommand = {
      type: "create",
      id: "1",
      value: 1,
    };
    await expect(run(["1"], command)).resolves.toMatchObject([
      {
        streamId: ["1"],
        type: "created",
        position: 1n,
        event: {
          type: "created",
          id: "1",
          value: 1,
        },
      },
    ]);
    await expect(eventStore.read({ streamIds: ["1"] })).resolves.toMatchObject([
      {
        streamId: ["1"],
        type: "created",
        position: 1n,
        event: {
          type: "created",
          id: "1",
          value: 1,
        },
      },
    ]);
  });

  it("reduces existing events", async () => {
    const eventStore = new eventstore.InMemory<CreatedEvent>();
    const decider = CreateDecider();
    const run = Persisted<CreateCommand, CreateState, CreatedEvent>(decider, eventStore);

    await eventStore.save([
      {
        streamId: ["1"],
        type: "created",
        event: {
          type: "created",
          id: "1",
          value: 1,
        },
      },
    ]);
    const command: CreateCommand = {
      type: "create",
      id: "1",
      value: 1,
    };
    await expect(run(["1"], command)).resolves.toMatchObject([]);
    await expect(eventStore.read({ streamIds: ["1"], offset: 1n })).resolves.toMatchObject([]);
  });

  it("only one of the concurrent command gets saved for new streams", async () => {
    const eventStore = new eventstore.InMemory<CreatedEvent>();
    const decider = CreateDecider();
    const run = Persisted<CreateCommand, CreateState, CreatedEvent>(decider, eventStore);

    const command: CreateCommand = {
      type: "create",
      id: "1",
      value: 1,
    };
    const result = await Promise.all(
      [run(["1"], command), run(["1"], command), run(["1"], command), run(["1"], command), run(["1"], command)].map(
        (r) => r.catch((e) => e),
      ),
    );

    expect(result.filter((r) => r instanceof Error)).toHaveLength(4);
    expect(result.filter((r) => Array.isArray(r))).toHaveLength(1);
  });

  it("only one of the concurrent command gets saved for existing streams", async () => {
    const eventStore = new eventstore.InMemory<TestEvent>();
    const decider = UpdateDecider();
    const run = Persisted<UpdateCommand, UpdateState, TestEvent>(decider, eventStore);

    await eventStore.save([
      {
        streamId: ["1"],
        type: "created",
        event: {
          type: "created",
          id: "1",
          value: 1,
        },
      },
    ]);

    const command: UpdateCommand = {
      type: "update",
      id: "1",
      newValue: 2,
    };
    const result = await Promise.all(
      [run(["1"], command), run(["1"], command), run(["1"], command), run(["1"], command), run(["1"], command)].map(
        (r) => r.catch((e) => e),
      ),
    );

    expect(result.filter((r) => r instanceof Error)).toHaveLength(4);
    expect(result.filter((r) => Array.isArray(r))).toHaveLength(1);
  });
});

type CreatedEvent = {
  type: "created";
  id: string;
  value: number;
};

type UpdatedEvent = {
  type: "updated";
  id: string;
  newValue: number;
  oldValue: number;
};

type TestEvent = CreatedEvent | UpdatedEvent;

type CreateState = State<CreatedEvent> & {
  exists: {
    [id in CreatedEvent["id"]]?: boolean;
  };
};

type UpdateState = State<TestEvent> & {
  oldValue: {
    [id in TestEvent["id"]]?: number;
  };
};

type CreateCommand = {
  type: "create";
  id: string;
  value: number;
};

type UpdateCommand = {
  type: "update";
  id: string;
  newValue: number;
};

const CreateDecider = (): Decider<CreateCommand, CreateState, CreatedEvent> => {
  return {
    decide: async (command, state) => {
      if (state.exists[command.id]) {
        return [];
      }
      return [
        {
          streamId: [command.id],
          type: "created",
          event: {
            type: "created",
            id: command.id,
            value: command.value,
          },
        },
      ];
    },
    evolve: (state, event) => {
      return { ...state, exists: { [event.event.id]: true } };
    },

    intialState: () => ({ reducedEvents: new Set(["created"]), exists: {} }),
  };
};

const UpdateDecider = (): Decider<UpdateCommand, UpdateState, TestEvent> => {
  return {
    decide: async (command, state) => {
      const oldValue = state.oldValue[command.id];
      if (!oldValue) {
        throw new Error(`Product with id ${command.id} does not exist`);
      }
      if (oldValue === command.newValue) {
        return [];
      }
      return [
        {
          streamId: [command.id],
          type: "updated",
          event: {
            type: "updated",
            id: command.id,
            newValue: command.newValue,
            oldValue,
          },
        },
      ];
    },
    evolve: (state, event) => {
      if (event.event.type === "created") {
        return {
          reducedEvents: state.reducedEvents.add("created"),
          oldValue: { ...state.oldValue, [event.event.id]: event.event.value },
        };
      }
      if (event.event.type === "updated") {
        return { ...state, oldValue: { ...state.oldValue, [event.event.id]: event.event.newValue } };
      }
      return state;
    },

    intialState: () => ({ reducedEvents: new Set(["updated"]), oldValue: {} }),
  };
};
