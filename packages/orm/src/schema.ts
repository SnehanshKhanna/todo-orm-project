import { ColumnBuilder, ColumnMetadata } from "./columns";


export type AnyColumnBuilder = ColumnBuilder<unknown, ColumnMetadata<unknown>>;

export interface Model<TColumns extends Record<string, AnyColumnBuilder>> {
  tableName: string;
  columns: TColumns;
}

export function defineModel<TColumns extends Record<string, AnyColumnBuilder>>(
  tableName: string,
  columns: TColumns
): Model<TColumns> {
  let primaryKeyCount = 0;
  for (const key in columns) {
    const col = columns[key];
    if (col.metadata.primaryKey) {
      primaryKeyCount++;
    }
    if (col.metadata.autoIncrement) {
      if (col.metadata.sqlType !== "INTEGER") {
        throw new Error(`Column '${key}' in table '${tableName}' is marked autoIncrement but is not an INTEGER.`);
      }
      if (!col.metadata.primaryKey) {
        throw new Error(`Column '${key}' in table '${tableName}' is marked autoIncrement but is not the primaryKey.`);
      }
    }
  }

  if (primaryKeyCount !== 1) {
    throw new Error(`Model '${tableName}' must have exactly one primary key, found ${primaryKeyCount}`);
  }

  return {
    tableName,
    columns,
  };
}
