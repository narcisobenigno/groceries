import path from "node:path";
import { fileURLToPath } from "node:url";
import { decider, eventstore } from "@/event-sourcing";
import { list, product } from "@/usecases";
import express, { type NextFunction, type Request, type Response } from "express";
import expressLayouts from "express-ejs-layouts";
import helmet from "helmet";
import morgan from "morgan";
import * as lists from "./lists";
import * as products from "./products";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ExpressApp = ReturnType<typeof express>;
export const createApp = configure((app) => {
  const eventStore = new eventstore.InMemory<product.ProductEvent>();
  const listEventStore = new eventstore.InMemory<list.ListEvent>();

  app.get("/", lists.form(list.InMemoryProjection(listEventStore)));
  app.post(
    "/lists",
    lists.create(
      decider.Persisted<list.CreateCommand, list.CreateState, list.ListEvent>(list.Create(), listEventStore),
    ),
  );
  app.get("/lists/:id", lists.show(list.InMemoryProjection(listEventStore)));
  app.post(
    "/lists/:id/change",
    lists.change(
      decider.Persisted<list.ChangeNameCommand, list.ChangeNameState, list.ListEvent>(
        list.ChangeName(),
        listEventStore,
      ),
    ),
  );

  app.get("/products", products.form(product.InMemoryProjection(eventStore)));
  app.post(
    "/products",
    products.add(
      decider.Persisted<product.AddProductCommand, product.AddProductState, product.ProductEvent>(
        product.AddProduct(),
        eventStore,
      ),
    ),
  );

  app.get("/products/:id/edit", products.edit(product.InMemoryProjection(eventStore)));
  app.post(
    "/products/:id/edit",
    products.change(
      decider.Persisted<product.ChangeNameCommand, product.ChangeNameState, product.ProductEvent>(
        product.ChangeName(),
        eventStore,
      ),
    ),
  );
});

function configure(routes: (_: ExpressApp) => void): () => ExpressApp {
  return () => {
    const app = express();

    app.set("view engine", "ejs");
    app.set("views", [path.join(__dirname, "views"), path.join(__dirname, "views", "partials")]);

    app.set("layout", path.join("layouts", "basic"));
    app.use(expressLayouts);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, "public")));
    app.use(helmet({}));
    app.use(morgan("combined"));

    routes(app);

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error("error handling", err.stack);
      res.status(500).render("error", { title: "Oops!" });
    });

    return app;
  };
}
