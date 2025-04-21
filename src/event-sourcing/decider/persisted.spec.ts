import { eventstore } from "@/event-sourcing";
import type { Decider } from "./decider";
import { Persisted } from "./persisted";

describe("Persisted Decider", () => {
  it("persistes decision to event store", async () => {
    const eventStore = new eventstore.InMemory<TestEvent>();
    const decider = TestDecider();
    const run = Persisted<TestEvent, TestCommand, TestState>(decider, eventStore);

    const command: TestCommand = {
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
    const eventStore = new eventstore.InMemory<TestEvent>();
    const decider = TestDecider();
    const run = Persisted<TestEvent, TestCommand, TestState>(decider, eventStore);

    eventStore.save([
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
    const command: TestCommand = {
      type: "create",
      id: "1",
      value: 1,
    };
    await expect(run(["1"], command)).resolves.toMatchObject([]);
    await expect(eventStore.read({ streamIds: ["1"], offset: 1n })).resolves.toMatchObject([]);
  });
});

type TestEvent = {
  type: "created";
  id: string;
  value: number;
};

type TestState = {
  [id in TestEvent["id"]]?: boolean;
};

type TestCommand = {
  type: "create";
  id: string;
  value: number;
};

const TestDecider = (): Decider<TestCommand, TestState, TestEvent> => {
  return {
    decide: async (command, state) => {
      if (state[command.id]) {
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
      return { ...state, [event.event.id]: true };
    },

    intialState: () => ({}),
  };
};
