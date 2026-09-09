import { describe, it, expect } from "vitest";
import { string, number, boolean } from "../src/columns";

describe("Column Builders", () => {
  it("creates a string column", () => {
    const col = string();
    expect(col.metadata.sqlType).toBe("TEXT");
    expect(col.metadata.nullable).toBe(false);
    expect(col.metadata.hasDefault).toBe(false);
    expect(col.metadata.primaryKey).toBe(false);
    expect(col.metadata.autoIncrement).toBe(false);
  });

  it("chains nullable correctly", () => {
    const col = string().nullable();
    expect(col.metadata.nullable).toBe(true);
  });

  it("chains default correctly", () => {
    const col = number().default(42);
    expect(col.metadata.hasDefault).toBe(true);
    expect(col.metadata.defaultValue).toBe(42);
  });

  it("chains primaryKey correctly", () => {
    const col = string().primaryKey();
    expect(col.metadata.primaryKey).toBe(true);
    expect(col.metadata.autoIncrement).toBe(false); // Does not implicitly set autoIncrement
  });

  it("chains autoIncrement correctly on INTEGER", () => {
    const col = number().primaryKey().autoIncrement();
    expect(col.metadata.primaryKey).toBe(true);
    expect(col.metadata.autoIncrement).toBe(true);
  });

  it("throws if autoIncrement is chained on a non-INTEGER", () => {
    expect(() => string().primaryKey().autoIncrement()).toThrow("autoIncrement can only be used on numeric columns");
  });
});
