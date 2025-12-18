import type { decider } from "@groceries/event-sourcing";
import type { Request, Response } from "express";
import type { list } from "../usecases";

export function change(execute: decider.ExecuteCommand<list.ChangeNameCommand, list.ListEvent>) {
  return async (request: Request, response: Response) => {
    const id = request.params.id as list.Id;

    await execute([id], {
      type: "list.change-name",
      id,
      newName: request.body.name,
    }).then(() => {
      const redirectUrl = `/lists/${id}`;

      // Check if this is an HTMX request
      if (request.headers["hx-request"]) {
        // For HTMX, use HX-Redirect header
        response.setHeader("HX-Redirect", redirectUrl);
        response.status(200).send();
      } else {
        // For regular requests, use standard redirect
        response.redirect(redirectUrl);
      }
    });
  };
}
