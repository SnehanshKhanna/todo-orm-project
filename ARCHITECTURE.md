# Architecture

## 1. Package Structure

The project is an npm workspaces monorepo containing:
- `packages/orm`: A standalone, publishable npm package exposing the lightweight TypeScript ORM. Built with `tsup` (outputs ESM, CJS, and `.d.ts`), tested with `vitest`, and fully type-checked.
- `apps/todo-app`: An example full-stack application. The backend is an Express server; the frontend is a React SPA built with Vite. It consumes the ORM exclusively via its published package name (`@snehanshkhanna/lite-orm`).

## 2. Type System

The core type system relies on TypeScript's structural typing and conditional types.
When defining a model with `defineModel`, column builders like `string()` or `number()` return objects with a phantom type field (`declare readonly _type: T`) and runtime `metadata`. 

The core inference utilities use conditional types to extract these phantom types and map them to actual shapes:
- **`InferRow`**: Extracts the exact runtime shape returned by Postgres, respecting the `nullable` metadata to union the type with `null` if applicable.
- **`InferCreateInput`**: Separates columns that have a `.default()` (which become optional `?:`) from required columns. It also entirely excludes columns marked with `.primaryKey().autoIncrement()`, as these are database-generated.
- **`InferUpdateInput`**: Makes all fields optional, but completely omits the primary key (so it can't be mutated in the update payload).
- **`InferWhereInput`**: Allows either direct value shorthand or an object of specific operators (e.g., `in`, `eq`, `isNull`).

## 3. Query Flow

`Model API → Repository → Query Builder → { text, values } → Driver → pg → Row mapping → typed object`

1. The consumer invokes a repository method (e.g., `db.todo.create(...)`).
2. The `Repository` runs lightweight runtime validation on the keys and values.
3. It passes the validated input to the pure `query-builder.ts` functions.
4. The Query Builder produces parameterized SQL (`{ text, values }`).
5. The `Repository` passes the SQL/values to the `Driver` abstraction.
6. `PgDriver` executes the query via node-postgres (`pg`) and returns the typed rows.

## 4. SQL Generation & Parameterization

SQL values are **never string-interpolated**. All values passed into the `where` clauses or `data` inputs are converted into parameterized arrays (`$1, $2, ...`) by the `query-builder`. 

Identifiers (table and column names) are structurally validated before reaching the query builder. The repository's `validateKeys` method ensures that keys provided in untyped JS inputs (like `req.body`) actually exist on the statically defined schema before they are used as SQL identifiers.

## 5. Write Safety

Updates and deletes are strictly scoped to the primary key (`db.todo.update(id, data)` and `db.todo.delete(id)`). The API deliberately omits `updateMany` or `deleteMany` to prevent accidental bulk mutations. This enforces a pattern where a user must first query and retrieve IDs before mutating or deleting them.

## 6. Driver Abstraction

The `Driver` interface decouples the ORM's core logic from the specific transport used to talk to the database. The ORM includes a default `PgDriver` (wrapping `pg.Pool`).
This is essential for modern serverless scalability: while a long-lived `pg.Pool` is ideal for a long-running Node/Express app, an edge deployment (e.g., AWS Lambda, Cloudflare Workers) could swap in an HTTP-based serverless Postgres driver (e.g., Neon serverless driver) simply by passing a custom `driver` implementation into `createClient`.

## 7. Design Tradeoffs

- **Object-Args API vs. Fluent Chaining**: `findMany({ where: { completed: false } })` was chosen over `.where("completed", false)`. It yields simpler type structures and is easier to implement robustly without proxy chaining.
- **JS-Applied Defaults vs. DB-Applied Defaults**: We apply `.default()` values in JavaScript during `create()`. This gives the application explicit control over the values without needing to introspect the DB on missing keys.
- **`primaryKey()` vs. `autoIncrement()`**: These are distinct. `id: string().primaryKey()` indicates a caller-supplied UUID, while `id: number().primaryKey().autoIncrement()` is DB-generated. Keeping them orthogonal allows arbitrary types of primary keys.

## 8. Extensibility

- **Adding a new column type**: Add a `date()` builder function returning a `ColumnBuilder<Date, ...>`, and extend the `SqlType` and metadata interfaces.
- **Adding relations**: `defineModel` would accept a `relations` callback that uses foreign-key column definitions to establish joins, mapped recursively in the inference utilities to yield nested row objects.
- **Adding migrations**: Expose a CLI that compares the generated `Model` objects against the DB's information schema to produce incremental DDL scripts.
- **Transactions**: Implement `db.transaction(async (tx) => { ... })` by checking a client out of the `pg.Pool` (`pool.connect()`), issuing `BEGIN`, creating transaction-scoped repositories that run against that specific client rather than the pool, and then issuing `COMMIT` (or `ROLLBACK` on throw).
