import type { ProductAdded } from "./add";
import type { NameChanged } from "./change-name";

export type ProductEvent = ProductAdded | NameChanged;
