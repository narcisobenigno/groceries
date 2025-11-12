import type { decider } from "@/event-sourcing";
import { list } from "@/usecases";
import type { Request, Response } from "express";

export const create =
  (execute: decider.ExecuteCommand<list.CreateCommand, list.ListEvent>) =>
  async (request: Request, response: Response) => {
    const id = list.newId();
    const name = request.body.name;
    await execute([id], {
      type: "list.create",
      id,
      name,
    })
      .then(() => {
        response.setHeader("Content-Type", "text/html");
        response.send(`
            <tr id="item-${id}">
                <td>${name}</td>
                <td>
                    <a href="/lists/${id}">Edit</a>
                </td>
            </tr>
        `);
      })
      .catch((error) => {
        console.error("Error adding list:", error);
        response.status(500).send("Internal Server Error");
      });
  };
