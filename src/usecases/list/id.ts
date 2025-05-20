import { ulid } from "ulid";

export type Id = `list_${string}`;

export function newId(): Id {
  return `list_${ulid()}`;
}
