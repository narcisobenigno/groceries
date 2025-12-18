import type { decider } from "@groceries/event-sourcing";
import type { Request, Response } from "express";
import type { product } from "../usecases";

export function change(execute: decider.ExecuteCommand<product.ChangeNameCommand, product.ProductEvent>) {
  return async (request: Request, response: Response) => {
    const id = request.params.id as product.Id;

    await execute([id], {
      type: "product.change-name",
      id,
      newName: request.body.name,
    }).then(() => {
      const redirectUrl = "/products";

      if (request.headers["hx-request"]) {
        response.setHeader("HX-Redirect", redirectUrl);
        response.status(200).send();
      } else {
        response.redirect(redirectUrl);
      }
    });
  };
}
