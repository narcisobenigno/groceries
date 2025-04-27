import type { decider } from "@/event-sourcing";
import type { product } from "@/usecases";
import type { Request, Response } from "express";
import { ulid } from "ulid";

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
        response.redirect("/products");
      })
      .catch((error) => {
        console.error("Error adding product:", error);
        response.status(500).send("Internal Server Error");
      });
  };
