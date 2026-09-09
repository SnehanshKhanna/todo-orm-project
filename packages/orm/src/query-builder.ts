import { Model, AnyColumnBuilder } from "./schema";

export function buildInsert(
  model: Model<Record<string, AnyColumnBuilder>>,
  data: Record<string, unknown>
): { text: string; values: unknown[] } {
  const columns: string[] = [];
  const values: unknown[] = [];
  const placeholders: string[] = [];

  let idx = 1;
  for (const [key, col] of Object.entries(model.columns)) {
    // Skip database-generated auto-increment primary key
    if (col.metadata.primaryKey && col.metadata.autoIncrement) {
      continue;
    }

    if (key in data) {
      columns.push(`"${key}"`);
      values.push(data[key]);
      placeholders.push(`$${idx++}`);
    } else if (col.metadata.hasDefault) {
      columns.push(`"${key}"`);
      values.push(col.metadata.defaultValue);
      placeholders.push(`$${idx++}`);
    }
    // If not in data and no default, it will either fail at DB level or is nullable.
    // The repository runtime validation should catch missing required keys anyway.
  }

  const text = `INSERT INTO "${model.tableName}" (${columns.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`;
  return { text, values };
}

export function buildSelect(
  model: Model<Record<string, AnyColumnBuilder>>,
  args?: { where?: Record<string, unknown>; limit?: number; offset?: number }
): { text: string; values: unknown[] } {
  let text = `SELECT * FROM "${model.tableName}"`;
  const values: unknown[] = [];
  let idx = 1;

  if (args?.where) {
    const whereClauses: string[] = [];
    for (const [key, val] of Object.entries(args.where)) {
      if (val === null || val === undefined) {
        continue;
      }
      
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        // Operator object
        if ("eq" in val) {
          whereClauses.push(`"${key}" = $${idx++}`);
          values.push(val.eq);
        }
        if ("ne" in val) {
          whereClauses.push(`"${key}" != $${idx++}`);
          values.push(val.ne);
        }
        if ("gt" in val) {
          whereClauses.push(`"${key}" > $${idx++}`);
          values.push(val.gt);
        }
        if ("gte" in val) {
          whereClauses.push(`"${key}" >= $${idx++}`);
          values.push(val.gte);
        }
        if ("lt" in val) {
          whereClauses.push(`"${key}" < $${idx++}`);
          values.push(val.lt);
        }
        if ("lte" in val) {
          whereClauses.push(`"${key}" <= $${idx++}`);
          values.push(val.lte);
        }
        if ("in" in val) {
          whereClauses.push(`"${key}" = ANY($${idx++})`);
          values.push(val.in);
        }
        if ("isNull" in val) {
          if (val.isNull) {
            whereClauses.push(`"${key}" IS NULL`);
          } else {
            whereClauses.push(`"${key}" IS NOT NULL`);
          }
        }
      } else {
        // Shorthand equality
        whereClauses.push(`"${key}" = $${idx++}`);
        values.push(val);
      }
    }
    if (whereClauses.length > 0) {
      text += ` WHERE ${whereClauses.join(" AND ")}`;
    }
  }

  if (args?.limit !== undefined) {
    text += ` LIMIT $${idx++}`;
    values.push(args.limit);
  }

  if (args?.offset !== undefined) {
    text += ` OFFSET $${idx++}`;
    values.push(args.offset);
  }

  return { text, values };
}

export function buildUpdate(
  model: Model<Record<string, AnyColumnBuilder>>,
  idColumn: string,
  idValue: unknown,
  data: Record<string, unknown>
): { text: string; values: unknown[] } {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(data)) {
    setClauses.push(`"${key}" = $${idx++}`);
    values.push(val);
  }

  const text = `UPDATE "${model.tableName}" SET ${setClauses.join(", ")} WHERE "${idColumn}" = $${idx++} RETURNING *`;
  values.push(idValue);

  return { text, values };
}

export function buildDelete(
  model: Model<Record<string, AnyColumnBuilder>>,
  idColumn: string,
  idValue: unknown
): { text: string; values: unknown[] } {
  const text = `DELETE FROM "${model.tableName}" WHERE "${idColumn}" = $1`;
  const values = [idValue];

  return { text, values };
}
