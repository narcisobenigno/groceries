import type { decider } from "@/event-sourcing";
import type { list } from "@/usecases";
import type { Request, Response } from "express";

export function change(execute: decider.ExecuteCommand<list.ChangeNameCommand, list.ListEvent>) {
  return async (request: Request, response: Response) => {
    const id = request.params.id as list.Id;

    await execute([id], {
      type: "list.change-name",
      id,
      newName: request.body.name,
    }).then(() => {
      response.redirect("/products");
    });
  };
}
