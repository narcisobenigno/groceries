import type { Envelope, EventStore, PersistedEnvelope } from "./event-store";

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
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await expect(eventStore.read({})).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
            position: 1n,
          },
        ]);
      });

      it("inserts multiple events in bulk", async () => {
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent1",
            event: { type: "created", data: { foo: "bar" } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { foo: "baz" } },
          },
        ]);

        await expect(eventStore.read({})).resolves.toMatchObject([
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent1",
            event: { type: "created", data: { foo: "bar" } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { foo: "baz" } },
          },
        ]);
      });

      it("throws concurrency error when write condition fails", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await expect(
          eventStore.save(
            [
              {
                streamId: "stream-1",
                type: "TestEvent2",
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
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await eventStore.save(
          [
            {
              streamId: "stream-1",
              type: "TestEvent2",
              event: { type: "updated", data: { foo: "baz" } },
            },
          ],
          {
            lastEventPosition: 1n,
            query: {
              streamId: ["stream-1"],
              events: ["TestEvent"],
            },
          },
        );

        await expect(eventStore.read({ offset: 1n })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent2",
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
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 1 } },
          },
        ]);

        await expect(eventStore.read({})).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 1 } },
          },
        ]);
      });

      it("filters by stream ID", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "TestEvent3",
            event: { type: "created", data: { id: 1 } },
          },
        ]);

        await expect(eventStore.read({ streamIds: ["stream-1"] })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("filters by multiple stream IDs", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);

        await expect(eventStore.read({ streamIds: ["stream-1", "stream-2"] })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("filters by event name", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);

        await expect(eventStore.read({ events: ["TestEvent2"] })).resolves.toMatchObject([
          {
            streamId: ["stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("filters by upto", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "TestEvent3",
            event: { type: "created", data: { id: 3 } },
          },
        ]);
        const allEvents = await eventStore.read({});
        expect(allEvents).toHaveLength(3);

        await expect(eventStore.read({ upto: allEvents[1].position })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("limits results", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "TestEvent3",
            event: { type: "created", data: { id: 3 } },
          },
        ]);

        await expect(eventStore.read({ limit: 2 })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
      });

      it("limits results by default in 1000", async () => {
        const events: Envelope<TestEvent>[] = [];
        for (let i = 0; i < 1001; i++) {
          events.push({
            streamId: `stream-${i}`,
            type: "created",
            event: { type: "created", data: { id: i } },
          });
        }
        await eventStore.save(events);
        const result = await eventStore.read({});

        expect(result).toHaveLength(1000);
      });

      it("offsets result", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: "stream-2",
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: "stream-3",
            type: "TestEvent3",
            event: { type: "created", data: { id: 3 } },
          },
        ]);

        await expect(eventStore.read({ offset: 1n })).resolves.toMatchObject([
          {
            streamId: ["stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: ["stream-3"],
            type: "TestEvent3",
            event: { type: "created", data: { id: 3 } },
          },
        ]);
      });

      it("combines filters", async () => {
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent1",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 3 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 4 } },
          },
        ]);

        await expect(
          eventStore.read({ streamIds: ["stream-1"], events: ["TestEvent1", "TestEvent2"], limit: 2, offset: 1n }),
        ).resolves.toMatchObject([
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "TestEvent2",
            event: { type: "updated", data: { id: 3 } },
          },
        ]);
      });
    });

    describe("concurrency", () => {
      it("prevents concurrent modifications to the same stream", async () => {
        await eventStore.save([
          {
            streamId: "concurrent-stream",
            type: "EventHappened",
            event: { type: "concurrent", data: 1 },
          },
        ]);

        let concurrentOperations: Promise<PersistedEnvelope[]>[] = [];
        for (const i in Array(5).fill(0)) {
          concurrentOperations = [
            ...concurrentOperations,
            eventStore.save(
              [
                {
                  streamId: "concurrent-stream",
                  type: `Event${i}`,
                  event: { type: "concurrent", data: 1 },
                },
              ],

              {
                lastEventPosition: 1n,
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
