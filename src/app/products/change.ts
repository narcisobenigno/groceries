import type { decider } from "@/event-sourcing";
import type { product } from "@/usecases";
import type { Request, Response } from "express";

export function change(execute: decider.ExecuteCommand<product.ChangeNameCommand, product.ProductEvent>) {
  return async (request: Request, response: Response) => {
    const id = request.params.id as product.Id;

    await execute([id], {
      type: "product.change-name",
      id,
      newName: request.body.name,
    }).then(() => {
      response.redirect("/products");
    });
  };
}
