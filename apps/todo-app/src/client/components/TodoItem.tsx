import React from "react";
import { Todo } from "../api";

interface Props {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: Props) {
  return (
    <li className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
      />
      <span className="title">{todo.title}</span>
      <button className="delete-btn" onClick={() => onDelete(todo.id)}>
        &times;
      </button>
    </li>
  );
}
