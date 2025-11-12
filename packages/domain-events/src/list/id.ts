import { ulid } from "ulid";

export type ListId = `list_${string}`;

export function newListId(): ListId {
  return `list_${ulid()}`;
}
