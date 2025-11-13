import type { Request, Response } from "express";
import type { product } from "../usecases";

export function form(projection: product.InMemoryProjection) {
  return async (_request: Request, response: Response) => {
    await projection.catchup();

    response.render("products/form", {
      products: await projection.all(),
      title: "Grocery Products",
    });
  };
}
