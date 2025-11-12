import type { ListId } from "./id";

export type ListCreated = {
  type: "list.created";
  id: ListId;
  name: string;
};

export type ListNameChanged = {
  type: "list.name-changed";
  id: ListId;
  newName: string;
  oldName: string;
};

export type ListEvent = ListCreated | ListNameChanged;
