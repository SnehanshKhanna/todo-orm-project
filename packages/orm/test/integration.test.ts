import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "../src/client";
import { defineModel, string, number, boolean } from "../src";

const Todo = defineModel("todos", {
  id: number().primaryKey().autoIncrement(),
  title: string(),
  completed: boolean().default(false),
});

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("Integration Tests", () => {
  let db: ReturnType<typeof createClient<{ todo: typeof Todo }>>;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    db = createClient({
      connectionString: process.env.DATABASE_URL,
      models: { todo: Todo },
    });

    // Create table if not exists for the test
    const pool = (db.todo as any).driver.pool;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false
      );
    `);
    await pool.query('TRUNCATE TABLE todos');
  });

  afterAll(async () => {
    if (db) {
      await (db.todo as any).driver.close();
    }
  });

  it("performs full CRUD lifecycle", async () => {
    // Create
    const created = await db.todo.create({ title: "Integration Task" });
    expect(created.id).toBeTypeOf("number");
    expect(created.title).toBe("Integration Task");
    expect(created.completed).toBe(false);

    // Read Many
    const list = await db.todo.findMany();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(created.id);

    // Update
    const updated = await db.todo.update(created.id, { completed: true });
    expect(updated.completed).toBe(true);

    // Read by ID
    const found = await db.todo.findById(created.id);
    expect(found?.completed).toBe(true);

    // Delete
    await db.todo.delete(created.id);
    const notFound = await db.todo.findById(created.id);
    expect(notFound).toBeNull();
  });
});
