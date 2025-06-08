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
        response.setHeader("Content-Type", "text/vnd.turbo-stream.html");
        response.send(`
            <turbo-stream action="append" target="lists-items">
            <template>
            <tr id="item-${id}">
                <td>${name}</td>
                <td>
                    <a href="/lists/${id}">Edit</a>
                </td>
            </tr>
            </template>
            </turbo-stream>
        `);
      })
      .catch((error) => {
        console.error("Error adding list:", error);
        response.status(500).send("Internal Server Error");
      });
  };
