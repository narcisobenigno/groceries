import { newListId } from "@groceries/domain-events/list"
import type { decider } from "@groceries/event-sourcing"
import type { Request, Response } from "express"
import type { list } from "../usecases"

export const create =
  (execute: decider.ExecuteCommand<list.CreateCommand, list.ListEvent>) =>
  async (request: Request, response: Response) => {
    const id = newListId()
    const name = request.body.name
    await execute([id], {
      type: "list.create",
      id,
      name,
    })
      .then(() => {
        response.setHeader("Content-Type", "text/html")
        response.send(`
            <tr id="item-${id}">
                <td>${name}</td>
                <td>
                    <a href="/lists/${id}">Edit</a>
                </td>
            </tr>
        `)
      })
      .catch((error) => {
        console.error("Error adding list:", error)
        response.status(500).send("Internal Server Error")
      })
  }
