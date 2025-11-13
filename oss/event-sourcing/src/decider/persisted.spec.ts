import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as eventstore from "../event-store";
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
    const result = await run(["1"], command);
    assert.deepStrictEqual(result, [
      {
        streamId: ["1"],
        type: "created",
        position: 1n,
        event: {
          type: "created",
          id: "1",
          value: 1,
        },
        timestamp: result[0].timestamp,
      },
    ]);
    const events = await eventStore.read({ streamIds: ["1"] });
    assert.deepStrictEqual(events, [
      {
        streamId: ["1"],
        type: "created",
        position: 1n,
        event: {
          type: "created",
          id: "1",
          value: 1,
        },
        timestamp: events[0].timestamp,
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
    const result = await run(["1"], command);
    assert.deepStrictEqual(result, []);
    const events = await eventStore.read({ streamIds: ["1"], offset: 1n });
    assert.deepStrictEqual(events, []);
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

    assert.strictEqual(result.filter((r) => r instanceof Error).length, 4);
    assert.strictEqual(result.filter((r) => Array.isArray(r)).length, 1);
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

    assert.strictEqual(result.filter((r) => r instanceof Error).length, 4);
    assert.strictEqual(result.filter((r) => Array.isArray(r)).length, 1);
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
