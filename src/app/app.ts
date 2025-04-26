import path from "node:path";
import { fileURLToPath } from "node:url";
import { decider, eventstore } from "@/event-sourcing";
import { product } from "@/usecases";
import express, { type NextFunction, type Request, type Response } from "express";
import * as products from "./products";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = (): ReturnType<typeof express> => {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "public")));

  const eventStore = new eventstore.InMemory<product.ProductAdded>();

  app.get("/products", products.form(eventStore));
  app.post(
    "/products",
    products.add(
      decider.Persisted<product.AddProductCommand, product.AddProductState, product.ProductAdded>(
        product.AddProduct(),
        eventStore,
      ),
    ),
  );

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("error handling", err.stack);
    res.status(500).render("error");
  });

  return app;
};
