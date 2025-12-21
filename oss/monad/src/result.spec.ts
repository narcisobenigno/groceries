import * as assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Err, Ok } from "./result"

describe("Ok", () => {
  it("maps value", () => {
    assert.deepStrictEqual(
      new Ok(1).map((x) => x + 1),
      new Ok(2),
    )
  })

  it("flatMap chains result", () => {
    assert.deepStrictEqual(
      new Ok(1).flatMap((x) => new Ok(x * 2)),
      new Ok(2),
    )
  })

  it("flatMap propagates Err", () => {
    assert.deepStrictEqual(
      new Ok(1).flatMap(() => new Err("error")),
      new Err("error"),
    )
  })

  it("mapErr returns self", () => {
    const ok = new Ok(1)
    assert.strictEqual(
      ok.mapErr(() => "new error"),
      ok,
    )
  })

  it("getOrElse returns value", () => {
    assert.strictEqual(new Ok(1).getOrElse(99), 1)
  })

  it("isOk returns true", () => {
    assert.strictEqual(new Ok(1).isOk(), true)
  })

  it("isErr returns false", () => {
    assert.strictEqual(new Ok(1).isErr(), false)
  })
})

describe("Err", () => {
  it("map returns self", () => {
    const err = new Err("error")
    assert.strictEqual(
      err.map((x) => x + 1),
      err,
    )
  })

  it("mapErr transforms error", () => {
    assert.deepStrictEqual(
      new Err("error").mapErr((e) => e.toUpperCase()),
      new Err("ERROR"),
    )
  })

  it("flatMap returns self", () => {
    const err = new Err("error")
    assert.strictEqual(
      err.flatMap(() => new Ok(1)),
      err,
    )
  })

  it("getOrElse returns default", () => {
    assert.strictEqual(new Err("error").getOrElse(99), 99)
  })

  it("isOk returns false", () => {
    assert.strictEqual(new Err("error").isOk(), false)
  })

  it("isErr returns true", () => {
    assert.strictEqual(new Err("error").isErr(), true)
  })
})
