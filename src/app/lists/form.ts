import type { list } from "@/usecases";
import type { Request, Response } from "express";

export function form(projection: list.InMemoryProjection) {
  return async (_request: Request, response: Response) => {
    await projection.catchup();

    response.render("list/form", {
      products: await projection.all(),
      title: "Grocery Lists",
    });
  };
}
