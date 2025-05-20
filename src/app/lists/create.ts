import type { decider } from "@/event-sourcing";
import type { list } from "@/usecases";
import type { Request, Response } from "express";

export const create =
  (execute: decider.ExecuteCommand<list.CreateCommand, list.ListEvent>) =>
  async (request: Request, response: Response) => {
    const id = list.newId();

    await execute([id], {
      type: "list.create",
      id: id,
      name: request.body.name,
    })
      .then(() => {
        response.redirect(`/lists/${id}`);
      })
      .catch((error) => {
        console.error("Error adding list:", error);
        response.status(500).send("Internal Server Error");
      });
  };
