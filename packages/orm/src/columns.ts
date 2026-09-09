export type SqlType = "TEXT" | "INTEGER" | "BOOLEAN";

export interface ColumnMetadata<T> {
  sqlType: SqlType;
  nullable: boolean;
  hasDefault: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: T;
}

export class ColumnBuilder<T, M extends ColumnMetadata<T>> {
  declare readonly _type: T;
  declare readonly _metadata: M;
  
  constructor(public metadata: M) {}

  nullable(): ColumnBuilder<T | null, Omit<M, "nullable"> & { nullable: true }> {
    return new ColumnBuilder<T | null, Omit<M, "nullable"> & { nullable: true }>({ 
      ...this.metadata, 
      nullable: true 
    });
  }

  default(value: NonNullable<T>): ColumnBuilder<T, Omit<M, "hasDefault" | "defaultValue"> & { hasDefault: true; defaultValue: NonNullable<T> }> {
    return new ColumnBuilder<T, Omit<M, "hasDefault" | "defaultValue"> & { hasDefault: true; defaultValue: NonNullable<T> }>({ 
      ...this.metadata, 
      hasDefault: true, 
      defaultValue: value 
    });
  }

  primaryKey(): ColumnBuilder<T, Omit<M, "primaryKey"> & { primaryKey: true }> {
    return new ColumnBuilder<T, Omit<M, "primaryKey"> & { primaryKey: true }>({ 
      ...this.metadata, 
      primaryKey: true 
    });
  }

  autoIncrement(): ColumnBuilder<T, Omit<M, "autoIncrement"> & { autoIncrement: true }> {
    if (this.metadata.sqlType !== "INTEGER") {
      throw new Error("autoIncrement can only be used on numeric columns");
    }
    return new ColumnBuilder<T, Omit<M, "autoIncrement"> & { autoIncrement: true }>({ 
      ...this.metadata, 
      autoIncrement: true 
    });
  }
}

export function string() {
  return new ColumnBuilder<string, { sqlType: "TEXT"; nullable: false; hasDefault: false; primaryKey: false; autoIncrement: false }>({
    sqlType: "TEXT",
    nullable: false,
    hasDefault: false,
    primaryKey: false,
    autoIncrement: false,
  });
}

export function number() {
  return new ColumnBuilder<number, { sqlType: "INTEGER"; nullable: false; hasDefault: false; primaryKey: false; autoIncrement: false }>({
    sqlType: "INTEGER",
    nullable: false,
    hasDefault: false,
    primaryKey: false,
    autoIncrement: false,
  });
}

export function boolean() {
  return new ColumnBuilder<boolean, { sqlType: "BOOLEAN"; nullable: false; hasDefault: false; primaryKey: false; autoIncrement: false }>({
    sqlType: "BOOLEAN",
    nullable: false,
    hasDefault: false,
    primaryKey: false,
    autoIncrement: false,
  });
}
