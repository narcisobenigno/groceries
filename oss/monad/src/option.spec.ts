import * as assert from "node:assert/strict"
import { describe, it } from "node:test"
import { None, Some } from "./option"

describe("Some", () => {
  it("maps value", () => {
    assert.deepStrictEqual(
      new Some(1).map((x) => x + 1),
      new Some(2),
    )
  })

  it("flatMap chains option", () => {
    assert.deepStrictEqual(
      new Some(1).flatMap((x) => new Some(x * 2)),
      new Some(2),
    )
  })

  it("flatMap propagates None", () => {
    assert.deepStrictEqual(
      new Some(1).flatMap(() => new None()),
      new None(),
    )
  })

  it("filter keeps value when predicate true", () => {
    const some = new Some(5)
    assert.strictEqual(
      some.filter((x) => x > 0),
      some,
    )
  })

  it("filter returns None when predicate false", () => {
    assert.deepStrictEqual(
      new Some(5).filter((x) => x < 0),
      new None(),
    )
  })

  it("getOrElse returns value", () => {
    assert.strictEqual(new Some(1).getOrElse(99), 1)
  })

  it("isSome returns true", () => {
    assert.strictEqual(new Some(1).isSome(), true)
  })

  it("isNone returns false", () => {
    assert.strictEqual(new Some(1).isNone(), false)
  })
})

describe("None", () => {
  it("map returns None", () => {
    assert.deepStrictEqual(
      new None().map((x) => x + 1),
      new None(),
    )
  })

  it("flatMap returns None", () => {
    assert.deepStrictEqual(
      new None().flatMap(() => new Some(1)),
      new None(),
    )
  })

  it("filter returns None", () => {
    assert.deepStrictEqual(
      new None().filter(() => true),
      new None(),
    )
  })

  it("getOrElse returns default", () => {
    assert.strictEqual(new None().getOrElse(99), 99)
  })

  it("isSome returns false", () => {
    assert.strictEqual(new None().isSome(), false)
  })

  it("isNone returns true", () => {
    assert.strictEqual(new None().isNone(), true)
  })
})
