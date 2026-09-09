import { defineModel, string, number, boolean } from "@snehanshkhanna/lite-orm";

export const Todo = defineModel("todos", {
  id: number().primaryKey().autoIncrement(),
  title: string(),
  completed: boolean().default(false),
});
