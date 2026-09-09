import { Model, AnyColumnBuilder } from "./schema";

export type InferType<C extends AnyColumnBuilder> = C["_type"];

export type IsNullable<C extends AnyColumnBuilder> = C["_metadata"]["nullable"] extends true ? true : false;

export type InferRow<TColumns extends Record<string, AnyColumnBuilder>> = {
  [K in keyof TColumns]: IsNullable<TColumns[K]> extends true
    ? InferType<TColumns[K]> | null
    : InferType<TColumns[K]>;
};

// Filter out columns that are both primaryKey and autoIncrement
export type OmitAutoIncrement<TColumns extends Record<string, AnyColumnBuilder>> = {
  [K in keyof TColumns as TColumns[K]["_metadata"]["autoIncrement"] extends true ? never : K]: TColumns[K];
};

export type RequiredCreateKeys<TColumns extends Record<string, AnyColumnBuilder>> = {
  [K in keyof TColumns]: TColumns[K]["_metadata"]["hasDefault"] extends true
    ? never
    : K;
}[keyof TColumns];

export type OptionalCreateKeys<TColumns extends Record<string, AnyColumnBuilder>> = {
  [K in keyof TColumns]: TColumns[K]["_metadata"]["hasDefault"] extends true
    ? K
    : never;
}[keyof TColumns];

export type InferCreateInput<TColumns extends Record<string, AnyColumnBuilder>> = 
  Omit<
    {
      [K in RequiredCreateKeys<OmitAutoIncrement<TColumns>>]: IsNullable<OmitAutoIncrement<TColumns>[K]> extends true 
        ? InferType<OmitAutoIncrement<TColumns>[K]> | null 
        : InferType<OmitAutoIncrement<TColumns>[K]>;
    } & {
      [K in OptionalCreateKeys<OmitAutoIncrement<TColumns>>]?: IsNullable<OmitAutoIncrement<TColumns>[K]> extends true 
        ? InferType<OmitAutoIncrement<TColumns>[K]> | null 
        : InferType<OmitAutoIncrement<TColumns>[K]>;
    },
    never
  > extends infer O ? { [K in keyof O]: O[K] } : never;

export type PrimaryKeyName<TColumns extends Record<string, AnyColumnBuilder>> = {
  [K in keyof TColumns]: TColumns[K]["_metadata"]["primaryKey"] extends true ? K : never;
}[keyof TColumns];

export type PrimaryKeyType<TColumns extends Record<string, AnyColumnBuilder>> = 
  PrimaryKeyName<TColumns> extends keyof TColumns 
    ? InferType<TColumns[PrimaryKeyName<TColumns>]>
    : never;

export type InferUpdateInput<TColumns extends Record<string, AnyColumnBuilder>> = 
  Partial<Omit<InferRow<TColumns>, PrimaryKeyName<TColumns>>> extends infer O ? { [K in keyof O]: O[K] } : never;

export type NumberStringOps<T> = {
  eq?: T;
  ne?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  in?: T[];
  isNull?: boolean;
};

export type BooleanOps<T> = {
  eq?: T;
  ne?: T;
  in?: T[];
  isNull?: boolean;
};

export type WhereOperators<T> = T extends number | string ? NumberStringOps<T> : BooleanOps<T>;

export type InferWhereInput<TColumns extends Record<string, AnyColumnBuilder>> = {
  [K in keyof TColumns]?: 
    | (IsNullable<TColumns[K]> extends true ? InferType<TColumns[K]> | null : InferType<TColumns[K]>)
    | WhereOperators<InferType<TColumns[K]>>;
};

export type Infer<TModel extends Model<Record<string, AnyColumnBuilder>>> = InferRow<TModel["columns"]>;
