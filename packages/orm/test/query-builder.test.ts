import { describe, it, expect } from "vitest";
import { buildInsert, buildSelect, buildUpdate, buildDelete } from "../src/query-builder";
import { Todo, User } from "./fixtures";

describe("Query Builder", () => {
  describe("buildInsert", () => {
    it("omits database-generated auto-increment PK", () => {
      const { text, values } = buildInsert(Todo as any, { title: "Test" });
      expect(text).toBe('INSERT INTO "todos" ("title","completed") VALUES ($1,$2) RETURNING *');
      expect(values).toEqual(["Test", false]);
    });

    it("includes caller-supplied non-auto-increment PK", () => {
      const { text, values } = buildInsert(User as any, { id: "u1", name: "Alice" });
      expect(text).toBe('INSERT INTO "users" ("id","name","age") VALUES ($1,$2,$3) RETURNING *');
      expect(values).toEqual(["u1", "Alice", 0]); // age has default
    });
  });

  describe("buildSelect", () => {
    it("selects all with no where clause", () => {
      const { text, values } = buildSelect(Todo as any);
      expect(text).toBe('SELECT * FROM "todos"');
      expect(values).toEqual([]);
    });

    it("handles shorthand equality", () => {
      const { text, values } = buildSelect(Todo as any, { where: { completed: false } });
      expect(text).toBe('SELECT * FROM "todos" WHERE "completed" = $1');
      expect(values).toEqual([false]);
    });

    it("handles operators: in, isNull", () => {
      const { text, values } = buildSelect(User as any, {
        where: {
          age: { in: [1, 2] },
          bio: { isNull: true }
        }
      });
      // Order depends on object keys which is deterministic
      expect(text).toBe('SELECT * FROM "users" WHERE "age" = ANY($1) AND "bio" IS NULL');
      expect(values).toEqual([[1, 2]]);
    });

    it("handles pagination", () => {
      const { text, values } = buildSelect(Todo as any, { limit: 10, offset: 20 });
      expect(text).toBe('SELECT * FROM "todos" LIMIT $1 OFFSET $2');
      expect(values).toEqual([10, 20]);
    });
  });

  describe("buildUpdate", () => {
    it("generates correct update SQL", () => {
      const { text, values } = buildUpdate(Todo as any, "id", 1, { completed: true, title: "Done" });
      expect(text).toBe('UPDATE "todos" SET "completed" = $1, "title" = $2 WHERE "id" = $3 RETURNING *');
      expect(values).toEqual([true, "Done", 1]);
    });
  });

  describe("buildDelete", () => {
    it("generates correct delete SQL", () => {
      const { text, values } = buildDelete(Todo as any, "id", 1);
      expect(text).toBe('DELETE FROM "todos" WHERE "id" = $1');
      expect(values).toEqual([1]);
    });
  });
});
