import type { ProductId } from "./id";

export type ProductAdded = {
  type: "product.added";
  id: ProductId;
  name: string;
};

export type ProductNameChanged = {
  type: "product.name-changed";
  id: ProductId;
  newName: string;
  oldName: string;
};

export type ProductEvent = ProductAdded | ProductNameChanged;
