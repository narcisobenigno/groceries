import type { Envelope, Event, EventStore, PersistedEnvelope } from "./event-store";

export const eventStoreContractTest = (store: <E extends Event>() => Promise<EventStore<E>>) => {
  describe("Event Store Contract Test", () => {
    let eventStore: EventStore<TestEvent>;

    beforeEach(async () => {
      eventStore = await store<TestEvent>();
    }, 120_000);

    describe("save", () => {
      it("inserts a single event", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await expect(eventStore.read({})).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: { foo: "bar" } },
            position: 1n,
          },
        ]);
      });

      it("inserts multiple events in bulk", async () => {
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "created",
            event: { type: "created", data: { foo: "bar" } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { foo: "baz" } },
          },
        ]);

        await expect(eventStore.read({})).resolves.toMatchObject([
          {
            streamId: ["stream-1", "stream-2"],
            type: "created",
            event: { type: "created", data: { foo: "bar" } },
            position: 1n,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { foo: "baz" } },
            position: 2n,
          },
        ]);
      });

      it("throws concurrency error when write condition fails", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await expect(
          eventStore.save(
            [
              {
                streamId: "stream-1",
                type: "updated",
                event: { type: "updated", data: { foo: "baz" } },
              },
            ],
            {
              lastEventPosition: BigInt(0),
              query: {
                streamId: ["stream-1"],
                events: ["created"],
              },
            },
          ),
        ).rejects.toThrow("Concurrency conflict");
      });

      it("succeeds when write condition passes", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { foo: "bar" } },
          },
        ]);

        await eventStore.save(
          [
            {
              streamId: "stream-1",
              type: "updated",
              event: { type: "updated", data: { foo: "baz" } },
            },
          ],
          {
            lastEventPosition: 1n,
            query: {
              streamId: ["stream-1"],
              events: ["created"],
            },
          },
        );

        await expect(eventStore.read({ offset: 1n })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "updated",
            event: { type: "updated", data: { foo: "baz" } },
            position: 2n,
          },
        ]);
      });
    });

    describe("read", () => {
      it("reads all events", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 1 } },
          },
        ]);

        await expect(eventStore.read({})).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: { id: 1 } },
            position: 1n,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 1 } },
            position: 2n,
          },
        ]);
      });

      it("filters by stream ID", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: { id: 1 } },
          },
        ]);

        await expect(eventStore.read({ streamIds: ["stream-1"] })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: { id: 1 } },
            position: 1n,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
          },
        ]);
      });

      it("filters by multiple stream IDs", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);

        await expect(eventStore.read({ streamIds: ["stream-1", "stream-2"] })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: { id: 1 } },
            position: 1n,
          },
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
          },
        ]);
      });

      it("filters by event name", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);

        await expect(eventStore.read({ events: ["updated"] })).resolves.toMatchObject([
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
          },
        ]);
      });

      it("filters by upto", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: { id: 3 } },
          },
        ]);

        await expect(eventStore.read({ upto: 2n })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: { id: 1 } },
            position: 1n,
          },
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
          },
        ]);
      });

      it("limits results", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: { id: 3 } },
          },
        ]);

        await expect(eventStore.read({ limit: 2 })).resolves.toMatchObject([
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: { id: 1 } },
            position: 1n,
          },
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
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

        await expect(eventStore.read({})).resolves.toHaveLength(1000);
      });

      it("offsets result", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: { id: 3 } },
          },
        ]);

        await expect(eventStore.read({ offset: 1n })).resolves.toMatchObject([
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
          },
          {
            streamId: ["stream-3"],
            type: "added",
            event: { type: "added", data: { id: 3 } },
            position: 3n,
          },
        ]);
      });

      it("combines filters", async () => {
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "created",
            event: { type: "created", data: { id: 1 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 3 } },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 4 } },
          },
        ]);

        await expect(
          eventStore.read({ streamIds: ["stream-1"], events: ["created", "updated"], limit: 2, offset: 1n }),
        ).resolves.toMatchObject([
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 2 } },
            position: 2n,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: { id: 3 } },
            position: 3n,
          },
        ]);
      });
    });

    describe("concurrency", () => {
      it("prevents concurrent modifications to the same stream", async () => {
        await eventStore.save([
          {
            streamId: "concurrent-stream",
            type: "created",
            event: { type: "created", data: 1 },
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
                  type: "created",
                  event: { type: "created", data: i },
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

type CreatedEvent = {
  type: "created";
  data: any;
};

type UpdatedEvent = {
  type: "updated";
  data: any;
};

type AddedEvent = {
  type: "added";
  data: any;
};

export type TestEvent = CreatedEvent | UpdatedEvent | AddedEvent;
