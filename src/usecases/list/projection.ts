import type { list } from "@/usecases";

export type List = {
  id: list.Id;
  name: string;
};

export interface Projection {
  all(): Promise<List[]>;
  byId(id: list.Id): Promise<List>;
}
