import type { EventStore, PersistedEnvelope } from "./event-store";

export interface TestEvent {
  type: string;
  data: any;
}

export const eventStoreContractTest = (store: () => Promise<EventStore<TestEvent>>) => {
  describe("Event Store Contract Test", () => {
    let eventStore: EventStore<TestEvent>;

    beforeEach(async () => {
      eventStore = await store();
    }, 120_000);

    describe("save", () => {
      it("inserts a single event", async () => {
        const event = {
          streamId: "stream-1",
          eventName: "TestEvent",
          event: { type: "created", data: { foo: "bar" } },
        };

        const result = await eventStore.save([event]);

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);
      });

      it("inserts multiple events in bulk", async () => {
        const events = [
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent1",
            event: { type: "created", data: { foo: "bar" } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { foo: "baz" } },
          },
        ];

        const result = await eventStore.save(events);

        expect(result).toMatchObject([
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent1",
            event: { type: "created", data: { foo: "bar" } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { foo: "baz" } },
          },
        ]);
      });

      it("throws concurrency error when write condition fails", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await expect(
          eventStore.save(
            [
              {
                streamId: "stream-1",
                eventName: "TestEvent2",
                event: { type: "updated", data: { foo: "baz" } },
              },
            ],
            {
              lastEventPosition: BigInt(0),
              query: {
                streamId: ["stream-1"],
                events: ["TestEvent"],
              },
            },
          ),
        ).rejects.toThrow("Concurrency conflict");
      });

      it("succeeds when write condition passes", async () => {
        const [firstEvent] = await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        const result = await eventStore.save(
          [
            {
              streamId: "stream-1",
              eventName: "TestEvent2",
              event: { type: "updated", data: { foo: "baz" } },
            },
          ],
          {
            lastEventPosition: firstEvent.position,
            query: {
              streamId: ["stream-1"],
              events: ["TestEvent"],
            },
          },
        );

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { foo: "baz" } },
          },
        ]);
      });
    });

    describe("read", () => {
      it("reads all events", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 1 } },
          },
        ]);

        const result = await eventStore.read({});

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 1 } },
          },
        ]);
      });

      it("filters by stream ID", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            eventName: "TestEvent3",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        const result = await eventStore.read({ streamIds: ["stream-1"] });

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("filters by multiple stream IDs", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);

        const result = await eventStore.read({ streamIds: ["stream-1", "stream-2"] });

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("filters by event name", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);

        const result = await eventStore.read({ events: ["TestEvent2"] });

        expect(result).toMatchObject([
          {
            streamId: ["stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("filters by upto", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            eventName: "TestEvent3",
            event: { type: "created", data: { id: 3 } },
          },
        ]);
        const allEvents = await eventStore.read({});
        expect(allEvents).toHaveLength(3);

        const result = await eventStore.read({ upto: allEvents[1].position });
        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("limits results", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            eventName: "TestEvent3",
            event: { type: "created", data: { id: 3 } },
          },
        ]);
        const result = await eventStore.read({ limit: 2 });

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("combines filters", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            eventName: "TestEvent2",
            event: { type: "updated", data: { id: 1 } },
          },
        ]);

        const result = await eventStore.read({
          streamIds: ["stream-1"],
          events: ["TestEvent1", "TestEvent2"],
          limit: 1,
        });

        expect(result).toMatchObject([
          {
            streamId: ["stream-1"],
            eventName: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
      });
    });

    describe("concurrency", () => {
      it("prevents concurrent modifications to the same stream", async () => {
        let concurrentOperations: Promise<PersistedEnvelope[]>[] = [];
        const saved = await eventStore.save([
          {
            streamId: "concurrent-stream",
            eventName: "EventHappened",
            event: { type: "concurrent", data: 1 },
          },
        ]);
        for (const i in Array(5).fill(0)) {
          concurrentOperations = [
            ...concurrentOperations,
            eventStore.save(
              [
                {
                  streamId: "concurrent-stream",
                  eventName: `Event${i}`,
                  event: { type: "concurrent", data: 1 },
                },
              ],

              {
                lastEventPosition: saved[0].position,
                query: {
                  streamId: ["concurrent-stream"],
                },
              },
            ),
          ];
        }

        const results = await Promise.all(concurrentOperations.map((p) => p.catch((e) => e)));

        const successes = results.filter((r) => Array.isArray(r));
        const failures = results.filter((r) => r instanceof Error);

        expect(successes).toHaveLength(1);
        expect(failures).toHaveLength(4);
      });
    });
  });
};
