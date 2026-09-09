import { Router } from "express";
import { db } from "../db";
import { ValidationError, NotFoundError } from "@snehanshkhanna/lite-orm";

export const todosRouter = Router();

todosRouter.get("/", async (req, res) => {
  try {
    const filter = req.query.filter as string;
    
    let where;
    if (filter === "active") {
      where = { completed: false };
    } else if (filter === "completed") {
      where = { completed: true };
    }

    const todos = await db.todo.findMany({ where });
    res.json(todos);
  } catch (err: any) {
    console.error("GET /api/todos error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

todosRouter.post("/", async (req, res) => {
  try {
    const { title } = req.body;
    const todo = await db.todo.create({ title, completed: false });
    res.status(201).json(todo);
  } catch (err: any) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

todosRouter.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body;
    const todo = await db.todo.update(id, body);
    res.json(todo);
  } catch (err: any) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
    } else if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

todosRouter.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.todo.delete(id);
    res.status(204).end();
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
