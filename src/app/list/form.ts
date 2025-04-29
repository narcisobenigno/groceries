import type { Request, Response } from "express";

export function form() {
  return async (_request: Request, response: Response) => {
    response.render("lists/form", {
      title: "Grocery Lists",
    });
  };
}
