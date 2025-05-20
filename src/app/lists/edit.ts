import type { product } from "@/usecases";
import type { Request, Response } from "express";

export function edit(projection: product.InMemoryProjection) {
  return async (request: Request, response: Response) => {
    await projection.catchup();

    response.render("products/edit", {
      products: await projection.all(),
      edited: await projection.byId(request.params.id as product.Id),
      title: "Grocery Products",
    });
  };
}
