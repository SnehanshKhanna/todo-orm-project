import React, { useState, useEffect } from "react";
import { fetchTodos, createTodo, updateTodo, deleteTodo, Todo, FilterType } from "./api";
import { TodoForm } from "./components/TodoForm";
import { TodoList } from "./components/TodoList";
import { FilterTabs } from "./components/FilterTabs";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    loadTodos(filter);
  }, [filter]);

  async function loadTodos(f: FilterType) {
    try {
      const data = await fetchTodos(f);
      setTodos(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAdd(title: string) {
    try {
      const newTodo = await createTodo(title);
      if (filter !== "completed") {
        setTodos((prev) => [...prev, newTodo]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    try {
      const updated = await updateTodo(id, { completed });
      if (filter === "all") {
        setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } else {
        // If filtering, removing the item is appropriate
        setTodos((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="app-container">
      <h1>Todo App</h1>
      <p className="subtitle">Powered by @YOUR_NPM_USERNAME/lite-orm</p>
      
      <TodoForm onAdd={handleAdd} />
      <FilterTabs current={filter} onChange={setFilter} />
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
}
