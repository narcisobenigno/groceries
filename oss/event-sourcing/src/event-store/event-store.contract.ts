import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { z } from "zod";
import type { Envelope, Event, EventStore, ParseEvent, PersistedEnvelope } from "./event-store";

export const eventStoreContractTest = (store: <E extends Event>(parser: ParseEvent<E>) => Promise<EventStore<E>>) => {
  describe("Event Store Contract Test", () => {
    let eventStore: EventStore<TestEvent>;

    beforeEach(
      async () => {
        eventStore = await store<TestEvent>(TestEventSchema.parse);
      },
      { timeout: 120_000 },
    );

    describe("save", () => {
      it("inserts a single event", async () => {
        const saved = await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);

        const events = await eventStore.read({});
        assert.deepStrictEqual(Array.from(events), Array.from(saved));
      });

      it("inserts multiple events in bulk", async () => {
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "created",
            event: { type: "created", data: 1 },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
          },
        ]);

        const events = await eventStore.read({});
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1", "stream-2"],
            type: "created",
            event: { type: "created", data: 1 },
            position: 1n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("throws concurrency error when write condition fails", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);

        await assert.rejects(
          eventStore.save(
            [
              {
                streamId: "stream-1",
                type: "updated",
                event: { type: "updated", data: 2 },
              },
            ],
            {
              query: {
                streamId: ["stream-1"],
                events: ["created"],
              },
            },
          ),
          /Concurrency conflict/,
        );
      });

      it("doesn't conflict when different stream", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "created",
            event: { type: "created", data: 2 },
          },
        ]);

        const result = await eventStore.save(
          [
            {
              streamId: "stream-1",
              type: "updated",
              event: { type: "updated", data: 2 },
            },
          ],
          {
            lastEventPosition: BigInt(1),
            query: {
              streamId: ["stream-1"],
              events: ["created"],
            },
          },
        );
        const resultArray = Array.from(result);
        assert.deepStrictEqual(resultArray, [
          {
            streamId: ["stream-1"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 3n,
            timestamp: resultArray[0].timestamp,
          },
        ]);
      });

      it("succeeds when write condition passes", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);

        await eventStore.save(
          [
            {
              streamId: "stream-1",
              type: "updated",
              event: { type: "updated", data: 2 },
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

        const events = await eventStore.read({ offset: 1n });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[0].timestamp,
          },
        ]);
      });

      it("ignores when empty events are passed", async () => {
        const result = await eventStore.save([]);
        assert.deepStrictEqual(result, []);

        const events = await eventStore.read({});
        assert.deepStrictEqual(events, []);
      });
    });

    describe("read", () => {
      it("reads all events", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 1 },
          },
        ]);

        const events = await eventStore.read({});
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: 1 },
            position: 1n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 1 },
            position: 2n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("filters by stream ID", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: 1 },
          },
        ]);

        const events = await eventStore.read({ streamIds: ["stream-1"] });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: 1 },
            position: 1n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("filters by multiple stream IDs", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: 2 },
          },
        ]);

        const events = await eventStore.read({ streamIds: ["stream-1", "stream-2"] });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: 1 },
            position: 1n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("filters by event name", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: 2 },
          },
        ]);

        const events = await eventStore.read({ events: ["updated"] });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[0].timestamp,
          },
        ]);
      });

      it("filters by upto", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: 2 },
          },
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: 3 },
          },
        ]);

        const events = await eventStore.read({ upto: 2n });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: 1 },
            position: 1n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("limits results", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: 2 },
          },
        ]);
        await eventStore.save([
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: 3 },
          },
        ]);

        const events = await eventStore.read({ limit: 2 });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1"],
            type: "created",
            event: { type: "created", data: 1 },
            position: 1n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("limits results by default in 1000", async () => {
        const envelopes: Envelope<TestEvent>[] = [];
        for (let i = 0; i < 1001; i++) {
          envelopes.push({
            streamId: `stream-${i}`,
            type: "created",
            event: { type: "created", data: i },
          });
        }
        await eventStore.save(envelopes);

        const events = await eventStore.read({});
        assert.strictEqual(events.length, 1000);
      });

      it("offsets result", async () => {
        await eventStore.save([
          {
            streamId: "stream-1",
            type: "created",
            event: { type: "created", data: 1 },
          },
          {
            streamId: "stream-2",
            type: "updated",
            event: { type: "updated", data: 2 },
          },
          {
            streamId: "stream-3",
            type: "added",
            event: { type: "added", data: 3 },
          },
        ]);

        const events = await eventStore.read({ offset: 1n });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-3"],
            type: "added",
            event: { type: "added", data: 3 },
            position: 3n,
            timestamp: events[1].timestamp,
          },
        ]);
      });

      it("combines filters", async () => {
        await eventStore.save([
          {
            streamId: ["stream-1", "stream-2"],
            type: "created",
            event: { type: "created", data: 1 },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 3 },
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 4 },
          },
        ]);

        const events = await eventStore.read({
          streamIds: ["stream-1"],
          events: ["created", "updated"],
          limit: 2,
          offset: 1n,
        });
        assert.deepStrictEqual(events, [
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 2 },
            position: 2n,
            timestamp: events[0].timestamp,
          },
          {
            streamId: ["stream-1", "stream-2"],
            type: "updated",
            event: { type: "updated", data: 3 },
            position: 3n,
            timestamp: events[1].timestamp,
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

        let concurrentOperations: Promise<PersistedEnvelope<TestEvent>[]>[] = [];
        for (let i = 0; i < 5; i++) {
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

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 4);
      });
    });
  });
};

const CreatedEventSchema = z.object({
  type: z.literal("created"),
  data: z.number(),
});

const UpdatedEventSchema = z.object({
  type: z.literal("updated"),
  data: z.number(),
});

const AddedEventSchema = z.object({
  type: z.literal("added"),
  data: z.number(),
});

type CreatedEvent = z.infer<typeof CreatedEventSchema>;

type UpdatedEvent = z.infer<typeof UpdatedEventSchema>;

type AddedEvent = z.infer<typeof AddedEventSchema>;

export const TestEventSchema = z.discriminatedUnion("type", [CreatedEventSchema, UpdatedEventSchema, AddedEventSchema]);

export type TestEvent = CreatedEvent | UpdatedEvent | AddedEvent;
