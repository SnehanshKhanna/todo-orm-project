import { defineModel, string, number, boolean } from "../src";

export const Todo = defineModel("todos", {
  id: number().primaryKey().autoIncrement(),
  title: string(),
  completed: boolean().default(false),
});

export const User = defineModel("users", {
  id: string().primaryKey(),
  name: string(),
  bio: string().nullable(),
  age: number().default(0),
});
