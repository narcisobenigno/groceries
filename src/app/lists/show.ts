import type { list } from "@/usecases";
import type { Request, Response } from "express";

export function show(projection: list.InMemoryProjection) {
  return async (request: Request, response: Response) => {
    try {
      await projection.catchup();

      const listId = request.params.id as list.Id;
      const listDetails = await projection.byId(listId);

      response.render("list/show", {
        list: listDetails,
        title: `List: ${listDetails.name}`,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ListNotFoundError") {
        response.status(404).render("error", {
          message: error.message,
          title: "List Not Found",
        });
      } else {
        console.error("Error retrieving list:", error);
        response.status(500).render("error", {
          message: "An unexpected error occurred",
          title: "Error",
        });
      }
    }
  };
}
