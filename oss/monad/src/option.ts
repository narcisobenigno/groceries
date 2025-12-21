export type Option<T> = Some<T> | None

export class Some<T> {
  readonly _tag = "Some" as const

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Option<U> {
    return new Some(fn(this.value))
  }

  flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value)
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : new None()
  }

  getOrElse(_defaultValue: T): T {
    return this.value
  }

  isSome(): this is Some<T> {
    return true
  }

  isNone(): this is None {
    return false
  }
}

export class None {
  readonly _tag = "None" as const

  map<U>(_fn: (value: never) => U): Option<U> {
    return new None()
  }

  flatMap<U>(_fn: (value: never) => Option<U>): Option<U> {
    return new None()
  }

  filter(_predicate: (value: never) => boolean): Option<never> {
    return new None()
  }

  getOrElse<T>(defaultValue: T): T {
    return defaultValue
  }

  isSome(): this is Some<never> {
    return false
  }

  isNone(): this is None {
    return true
  }
}
