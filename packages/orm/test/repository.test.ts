import { describe, it, expect, vi } from "vitest";
import { Repository } from "../src/repository";
import { Driver } from "../src/driver";
import { NotFoundError, ValidationError } from "../src/errors";
import { Todo } from "./fixtures";

describe("Repository", () => {
  const mockDriver: Driver = {
    query: vi.fn(),
  };

  const repo = new Repository(Todo, mockDriver);

  it("create() runs insert and returns row", async () => {
    (mockDriver.query as any).mockResolvedValueOnce([{ id: 1, title: "Test", completed: false }]);
    const result = await repo.create({ title: "Test" });
    expect(mockDriver.query).toHaveBeenCalledWith(
      'INSERT INTO "todos" ("title","completed") VALUES ($1,$2) RETURNING *',
      ["Test", false]
    );
    expect(result).toEqual({ id: 1, title: "Test", completed: false });
  });

  it("create() validates keys", async () => {
    await expect(repo.create({ invalidKey: 1 } as any)).rejects.toThrow(ValidationError);
  });

  it("update() throws NotFoundError if no rows returned", async () => {
    (mockDriver.query as any).mockResolvedValueOnce([]);
    await expect(repo.update(1, { title: "New" })).rejects.toThrow(NotFoundError);
  });

  it("delete() throws NotFoundError if no rows returned", async () => {
    (mockDriver.query as any).mockResolvedValueOnce([]);
    await expect(repo.delete(1)).rejects.toThrow(NotFoundError);
  });
});
