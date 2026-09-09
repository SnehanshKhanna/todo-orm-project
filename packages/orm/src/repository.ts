import { Model, AnyColumnBuilder } from "./schema";
import { Driver } from "./driver";
import { buildInsert, buildSelect, buildUpdate, buildDelete } from "./query-builder";
import { ValidationError, NotFoundError } from "./errors";
import { InferRow, InferCreateInput, InferUpdateInput, InferWhereInput, PrimaryKeyType } from "./types";

export class Repository<TColumns extends Record<string, AnyColumnBuilder>> {
  private primaryKeyColumn: string;

  constructor(
    private model: Model<TColumns>,
    private driver: Driver
  ) {
    let pkName = "";
    for (const [key, col] of Object.entries(model.columns)) {
      if (col.metadata.primaryKey) {
        pkName = key;
        break;
      }
    }
    this.primaryKeyColumn = pkName;
  }

  private validateKeys(data: Record<string, unknown>, requireAllNonDefault: boolean = false) {
    for (const key of Object.keys(data)) {
      if (!(key in this.model.columns)) {
        throw new ValidationError(`Unknown column '${key}' in table '${this.model.tableName}'`);
      }
      const val = data[key];
      const col = this.model.columns[key];

      if (val === null || val === undefined) {
        if (!col.metadata.nullable) {
          throw new ValidationError(`Column '${key}' is not nullable`);
        }
        continue;
      }

      if (col.metadata.sqlType === "TEXT" && typeof val !== "string") {
        throw new ValidationError(`Column '${key}' expects string, got ${typeof val}`);
      }
      if (col.metadata.sqlType === "INTEGER" && typeof val !== "number") {
        throw new ValidationError(`Column '${key}' expects number, got ${typeof val}`);
      }
      if (col.metadata.sqlType === "BOOLEAN" && typeof val !== "boolean") {
        throw new ValidationError(`Column '${key}' expects boolean, got ${typeof val}`);
      }
    }

    if (requireAllNonDefault) {
      for (const [key, col] of Object.entries(this.model.columns)) {
        if (col.metadata.primaryKey && col.metadata.autoIncrement) continue;
        if (!col.metadata.hasDefault && !(key in data)) {
          if (!col.metadata.nullable) {
             throw new ValidationError(`Missing required column '${key}'`);
          }
        }
      }
    }
  }

  private validateWhere(where: Record<string, unknown>) {
    for (const key of Object.keys(where)) {
      if (!(key in this.model.columns)) {
        throw new ValidationError(`Unknown column '${key}' in table '${this.model.tableName}'`);
      }
    }
  }

  async create(data: InferCreateInput<TColumns>): Promise<InferRow<TColumns>> {
    const input = { ...data } as Record<string, unknown>;
    this.validateKeys(input, true);

    const { text, values } = buildInsert(this.model, input);
    const rows = await this.driver.query<InferRow<TColumns>>(text, values);
    return rows[0];
  }

  async findMany(args?: {
    where?: InferWhereInput<TColumns>;
    limit?: number;
    offset?: number;
  }): Promise<InferRow<TColumns>[]> {
    if (args?.where) {
      this.validateWhere(args.where);
    }
    const { text, values } = buildSelect(this.model, args);
    return await this.driver.query<InferRow<TColumns>>(text, values);
  }

  async findFirst(args?: { where?: InferWhereInput<TColumns> }): Promise<InferRow<TColumns> | null> {
    const rows = await this.findMany({ ...args, limit: 1 });
    return rows[0] || null;
  }

  async findById(id: PrimaryKeyType<TColumns>): Promise<InferRow<TColumns> | null> {
    const where = { [this.primaryKeyColumn]: id } as InferWhereInput<TColumns>;
    return await this.findFirst({ where });
  }

  async update(id: PrimaryKeyType<TColumns>, data: InferUpdateInput<TColumns>): Promise<InferRow<TColumns>> {
    const input = { ...data } as Record<string, unknown>;
    
    if (Object.keys(input).length === 0) {
      // Nothing to update, but we should return the row or throw NotFound?
      // For a lightweight ORM, we'll try to find it.
      const row = await this.findById(id);
      if (!row) {
         throw new NotFoundError(`Row with id ${id} not found in '${this.model.tableName}'`);
      }
      return row;
    }

    if (this.primaryKeyColumn in input) {
      throw new ValidationError(`Cannot update primary key column '${this.primaryKeyColumn}'`);
    }
    
    this.validateKeys(input, false);

    const { text, values } = buildUpdate(this.model, this.primaryKeyColumn, id, input);
    const rows = await this.driver.query<InferRow<TColumns>>(text, values);

    if (rows.length === 0) {
      throw new NotFoundError(`Row with id ${id} not found in '${this.model.tableName}'`);
    }

    return rows[0];
  }

  async delete(id: PrimaryKeyType<TColumns>): Promise<void> {
    const { text, values } = buildDelete(this.model, this.primaryKeyColumn, id);
    // the pg driver doesn't return row count easily from just query() unless we use pool.query directly, but we can do a RETURNING id to check
    const queryWithReturning = text + " RETURNING " + `"${this.primaryKeyColumn}"`;
    const rows = await this.driver.query(queryWithReturning, values);

    if (rows.length === 0) {
      throw new NotFoundError(`Row with id ${id} not found in '${this.model.tableName}'`);
    }
  }
}
