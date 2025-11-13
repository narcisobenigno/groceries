import type { product } from "..";

export type Product = {
  id: product.Id;
  name: string;
};

export interface Projection {
  all(): Promise<Product[]>;
  byId(id: product.Id): Promise<Product>;
}
