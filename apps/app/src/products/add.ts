import type { decider } from "@groceries/event-sourcing";
import type { Request, Response } from "express";
import { ulid } from "ulid";
import type { product } from "../usecases";

export const add =
  (execute: decider.ExecuteCommand<product.AddProductCommand, product.ProductEvent>) =>
  async (request: Request, response: Response) => {
    const id = `product_${ulid()}` as const;

    await execute([id], {
      type: "product.add",
      id: id,
      name: request.body.name,
    })
      .then(() => {
        const redirectUrl = "/products";

        if (request.headers["hx-request"]) {
          response.setHeader("HX-Redirect", redirectUrl);
          response.status(200).send();
        } else {
          response.redirect(redirectUrl);
        }
      })
      .catch((error) => {
        console.error("Error adding product:", error);
        response.status(500).send("Internal Server Error");
      });
  };
