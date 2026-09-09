// Expected errors should not prevent compilation, this file is just for type checking

import { defineModel, string, number, boolean } from "../src";
import { createClient } from "../src/client";
import { PgDriver } from "../src/driver";

const Todo = defineModel("todos", {
  id: number().primaryKey().autoIncrement(),
  title: string(),
  completed: boolean().default(false),
});

const User = defineModel("users", {
  id: string().primaryKey(),
  name: string(),
  bio: string().nullable(),
  age: number().default(0),
});

const db = createClient({
  driver: new PgDriver({ connectionString: "dummy" }),
  models: { todo: Todo, user: User },
});

// Compile-time checks

// 1. db.todo.create({ nonsense: true }) -> error
// @ts-expect-error
db.todo.create({ nonsense: true });

// 2. db.todo.create({}) when a required field is missing -> error
// @ts-expect-error
db.todo.create({});

// 3. db.todo.create({ id: 1, title: "x" }) supplying a database-generated primary key -> error
// @ts-expect-error
db.todo.create({ id: 1, title: "x" });

// 4. db.user.create({ name: "Alice" }) omitting non-auto-increment id -> error
// @ts-expect-error
db.user.create({ name: "Alice" });

// 5. db.todo.findMany({ where: { completed: "yes" } }) wrong primitive type -> error
// @ts-expect-error
db.todo.findMany({ where: { completed: "yes" } });

// 6. db.todo.findMany({ where: { doesNotExist: 1 } }) -> error
// @ts-expect-error
db.todo.findMany({ where: { doesNotExist: 1 } });

// Valid usages that must NOT error

db.todo.create({ title: "Task 1" });
db.todo.create({ title: "Task 1", completed: true });

db.user.create({ id: "user_1", name: "Alice", bio: null });
db.user.create({ id: "user_1", name: "Alice", bio: "Hello", age: 30 });

db.todo.findMany();
db.todo.findMany({ where: { completed: false } });
db.todo.findMany({ where: { title: { in: ["a", "b"] } } });
db.user.findMany({ where: { age: { gt: 10, lte: 40 }, bio: { isNull: false } } });

db.todo.update(1, { title: "New" });
db.user.update("user_1", { age: 31 });
