# Implementation Directive: Lightweight TypeScript ORM + Todo App (Monorepo)

You are Antigravity, an autonomous coding agent. You are implementing a complete, submission-ready
company coding assignment: a lightweight TypeScript ORM published as an npm package, consumed by a
deployed Todo application, inside an npm-workspaces monorepo. This document is your full specification.
Treat it as authoritative. Do not ask the user clarifying questions — every architectural decision has
already been made below. Where something is genuinely left open, a default decision is given; use your
judgment only within the bounds explicitly marked "flexible."

Read this entire document before writing any code.

---

## 0. How You Must Work

1. **Inspect before you act.** Before creating anything, check whether a repository already exists at
   your working root (`git status`, `ls -la`, review any existing files). If the repo is empty, scaffold
   from scratch per this spec. If it's partially built, evaluate what exists: keep and build on anything
   that matches this spec, refactor or replace anything that conflicts with it, and note any deviations
   you kept (with justification) in `ARCHITECTURE.md`. Never blindly overwrite existing work without
   first understanding it.
2. **Do not stop at partial completion.** Work through every phase in Section 17 in order, autonomously,
   without pausing to report progress or ask permission to continue. Only stop early if you hit a **hard
   external blocker that cannot be resolved by writing code** — no npm registry credentials available, no
   cloud hosting account/API token available, no network egress to a required service. In that case:
   finish **everything else** in this spec first, then clearly document the exact remaining manual step(s)
   with copy-pasteable commands in `README.md`, and only then stop.
3. **Fixed vs. flexible.** The public ORM API shape, the type-inference guarantees, the SQL
   parameterization rules, the package boundary rules, and the documentation requirements below are
   **fixed** — implement them as specified. Minor internal details (exact helper type names, exact test
   file counts, exact CSS approach, which specific hosting provider you use if your first choice is
   unavailable) are **flexible** — use good engineering judgment.
4. **Validate continuously.** After every phase, run the build and test suite for whatever you just
   touched. Do not move on with a red build.
5. **End state.** When finished, run the full verification checklist in Section 18 and produce the final
   report described in Section 19.

---

## 1. What You Are Building

A monorepo containing:

- **`packages/orm`** — a small, hand-built, type-safe TypeScript ORM for Postgres (compatible with Neon,
  Supabase, and any standard Postgres instance). No code generation step, no reliance on an existing ORM's
  source. This package is published to npm and is the centerpiece of the submission.
- **`apps/todo-app`** — a small full-stack Todo application (Express backend + React/Vite frontend) that
  consumes the ORM **only through its published public API**, never via internal source imports. Deployed
  and publicly accessible.

This is being built to satisfy a take-home evaluation. The evaluators are grading ORM design (35%),
TypeScript usage (25%), package architecture (20%), example app (10%), and code quality (10%). The Todo
app is a thin demonstration harness — do not let it become the largest or most time-consuming part of the
project. The ORM's schema system, type inference, and query generation are what must be excellent.

Guiding aesthetic: this should read like a senior engineer built a small, deliberate ORM — not like dozens
of AI-generated features bolted together. Minimal surface area, strong types, clear abstractions, excellent
tests, excellent docs. Reject any temptation to add scope beyond what's specified here.

---

## 2. Non-Negotiable Requirements Recap

These come directly from the assignment and its FAQ (the FAQ overrides ambiguity in the main brief):

- ORM supports schema definition, CRUD, `where` filtering, and is fully typed (invalid fields must fail
  at **compile time**, not runtime).
- ORM works with serverless Postgres (Neon/Supabase) and any standard Postgres.
- **The ORM MUST be published to npm** — real publish config, not a fake package that only resolves via
  workspace source linking.
- The Todo app **MUST have a frontend UI** and **MUST be deployed and publicly accessible**.
- The Todo app must import the ORM as a normal package (`from "<package-name>"`), never
  `packages/orm/src/...`.
- Must be a monorepo (npm workspaces is your tool — see Section 3).
- README.md and ARCHITECTURE.md with specific required content (Section 12).
- AI tool usage must be disclosed honestly in the README.
- Migrations and relations are explicitly optional — do not implement them; document them as limitations.
- Submission is a GitHub repo, with an optional deployed demo — but per the FAQ, deployment is actually
  mandatory. Treat it as mandatory.

---

## 3. Technology Stack (decided — do not substitute without a hard blocker)

| Concern | Choice | Why |
|---|---|---|
| Monorepo tool | **npm workspaces** | Zero extra tooling, ships with Node, trivially explainable in an interview. Do not add Turborepo/Nx/pnpm — unnecessary complexity for 2 packages. |
| Runtime | **Node.js 20 LTS** | Stable, widely deployed. |
| Language | **TypeScript 5.x, `strict: true`** everywhere | Non-negotiable given 25% of the grade is TS usage. |
| Postgres driver | **`pg` (node-postgres)** via a `Pool` | The standard, best-known Postgres driver. Works identically against Neon, Supabase, and vanilla Postgres via a normal connection string. Simpler and more explainable than a provider-specific HTTP/WebSocket driver. Wrapped behind a small `Driver` interface (Section 5.5) so it is swappable later — this is the ORM's seam for future serverless-edge drivers, and a great interview talking point. |
| Serverless Postgres provider (for the deployed demo) | **Neon** (primary) — Supabase also fully supported since both are standard Postgres | Free tier, instant connection string, no infra to manage. |
| ORM build tool | **tsup** (esbuild-based) | Minimal config, outputs ESM + CJS + `.d.ts` in one command — exactly what a publishable dual-format package needs. |
| ORM test framework | **Vitest** | Fast, native TS/ESM support, no babel config needed. |
| Compile-time type tests | Dedicated `.ts` files using `// @ts-expect-error`, checked via `tsc --noEmit` | No extra dependency; directly demonstrates that invalid usage fails to compile. |
| Todo backend framework | **Express** | Boring, standard, minimal, easy to explain — the point of interest is the ORM, not the web framework. |
| Todo frontend | **React + Vite (TypeScript)** | Small, fast dev loop, compiles to static files the Express server can serve directly (see Section 8 — this collapses deployment to a single service). |
| Styling | Plain CSS or Tailwind, whichever you can implement fastest cleanly | Do not spend significant time on visual polish. Functional and tidy is the bar, not beautiful. |
| Linting/formatting | ESLint (`@typescript-eslint`) + Prettier at the root, shared config | Keep config minimal. |
| Deployment | **Render.com** free web service (single service serving both API and built frontend) — Railway or Fly.io are acceptable fallbacks if Render is unavailable in your environment | One deployable process, one URL, no CORS complexity, no coordinating two hosts. |
| npm publish | Real `npm publish --access public` under a scoped package name | See Section 13. |

---

## 4. Monorepo Layout

```text
<repo-root>/
├── packages/
│   └── orm/
│       ├── src/
│       │   ├── columns.ts        # string(), number(), boolean() column builders
│       │   ├── schema.ts         # defineModel()
│       │   ├── types.ts          # all type-inference utilities (the heart of the type system)
│       │   ├── query-builder.ts  # pure functions: model + args -> { text, values }
│       │   ├── driver.ts         # Driver interface + PgDriver (pg-based) implementation
│       │   ├── repository.ts     # Repository class: create/findMany/findFirst/findById/update/delete
│       │   ├── client.ts         # createClient() — wires models -> repositories -> db.<model>
│       │   ├── errors.ts         # OrmError, ValidationError, NotFoundError
│       │   └── index.ts          # PUBLIC EXPORTS ONLY
│       ├── test/
│       │   ├── fixtures.ts       # test-only models exercising nullable/default/string-PK edge cases
│       │   ├── columns.test.ts
│       │   ├── query-builder.test.ts
│       │   ├── repository.test.ts
│       │   ├── types.test-types.ts   # @ts-expect-error compile-time tests
│       │   └── integration.test.ts   # gated on process.env.DATABASE_URL, skipped otherwise
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
├── apps/
│   └── todo-app/
│       ├── src/
│       │   ├── server/
│       │   │   ├── server.ts      # Express app, serves /api/* and static frontend build
│       │   │   ├── db.ts          # createClient() instance for this app
│       │   │   ├── models.ts      # const Todo = defineModel("todos", {...})
│       │   │   └── routes/
│       │   │       └── todos.ts
│       │   └── client/
│       │       ├── main.tsx
│       │       ├── App.tsx
│       │       ├── api.ts         # thin fetch wrapper around /api/todos
│       │       ├── components/
│       │       │   ├── TodoForm.tsx
│       │       │   ├── TodoList.tsx
│       │       │   ├── TodoItem.tsx
│       │       │   └── FilterTabs.tsx
│       │       └── styles.css
│       ├── db/
│       │   └── schema.sql         # DDL matching models.ts (migrations are out of scope — see limitations)
│       ├── index.html             # Vite entry point
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── package.json                   # root: "workspaces": ["packages/*", "apps/*"]
├── tsconfig.base.json             # shared strict compiler options
├── .eslintrc.cjs (or eslint.config.js)
├── .prettierrc
├── .gitignore
├── .env.example
├── README.md
├── ARCHITECTURE.md
└── LICENSE
```

The Todo app must depend on the ORM package **by its published package name** in
`apps/todo-app/package.json` (e.g. `"@YOUR_NPM_USERNAME/lite-orm": "*"`), relying on npm workspaces to
symlink it to the local workspace package during development. It must **never** import from
`packages/orm/src/...` or any relative path reaching into the ORM package's internals — only
`import { ... } from "@YOUR_NPM_USERNAME/lite-orm"`. Enforce and verify this (grep for any such deep
import as part of your final audit).

---

## 5. The ORM Package — Detailed Design

### 5.1 Public API surface

This is the entire developer-facing surface. Nothing else should be exported from `index.ts`.

```ts
import { defineModel, string, number, boolean, createClient, NotFoundError, ValidationError } from "<pkg>";
import type { Infer, Driver } from "<pkg>";

// --- schema ---
const Todo = defineModel("todos", {
  id: number().primaryKey().autoIncrement(),
  title: string(),
  completed: boolean().default(false),
});

type TodoRow = Infer<typeof Todo>; // { id: number; title: string; completed: boolean }

// --- client ---
const db = createClient({
  connectionString: process.env.DATABASE_URL!,
  models: { todo: Todo },
});

// --- CRUD ---
const created = await db.todo.create({ title: "Finish assignment" }); // completed optional (has default)
const all = await db.todo.findMany();
const active = await db.todo.findMany({ where: { completed: false } });
const one = await db.todo.findFirst({ where: { title: { eq: "Finish assignment" } } });
const byId = await db.todo.findById(1);
const updated = await db.todo.update(1, { completed: true });
await db.todo.delete(1);
```

`createClient` must also accept `{ driver: Driver, models }` as an alternative to `{ connectionString }`,
for testability and to prove the driver seam is real, not decorative. Because consumers are explicitly
allowed to supply their own `Driver` implementation this way, `Driver` is a first-class part of the public
API, not an internal detail — see Section 5.5 and Section 5.9.

### 5.2 Column builders & schema (`columns.ts`, `schema.ts`)

Implement `string()`, `number()`, `boolean()` as factory functions returning a **column builder** object.
Each builder carries:

- A **phantom type-only field** (never actually assigned a runtime value, e.g. `readonly _type: TsType`)
  used purely so TypeScript can `infer` the field's type later via conditional types. This is the standard
  trick used by schema libraries like Zod/Drizzle — be prepared to explain it in the interview: it holds
  no runtime value, it exists only so the structural type system has something to extract from.
- Runtime metadata used to generate SQL and to compute derived types: `sqlType`, `nullable`, `hasDefault`,
  `primaryKey`, `autoIncrement`, and (if applicable) the actual default value.
- Chainable modifier methods that return a **new builder with an updated type parameter**, not just an
  updated runtime value — the modifiers must be visible to TypeScript, not just to the object at runtime:
  - `.nullable()` → widens the inferred TS type to `T | null`
  - `.default(value: T)` → makes the field optional in the create-input type
  - `.primaryKey()` → identifies the column as the model's primary key, for lookups/updates/deletes. This
    does **not**, by itself, imply auto-generation: a primary key without `.autoIncrement()` is a normal,
    caller-supplied value and remains part of the create-input type (required, unless it also carries
    `.default()`).
  - `.autoIncrement()` → indicates the database generates the value automatically (`SERIAL`/`IDENTITY`).
    Only valid on a numeric column that is also marked `.primaryKey()` — validate this combination at
    schema-definition time and throw a clear runtime error if `.autoIncrement()` is used on a non-numeric
    column or without `.primaryKey()`. A column marked `.primaryKey().autoIncrement()` is entirely
    database-generated: it is omitted from the create-input type entirely (never a valid key in
    `create()`), omitted from the generated `INSERT` column list, and its value is read back via
    `RETURNING *`.

**Important distinction — get this right, it matters for both correctness and your interview answer on
"how does create() know which fields are required":**

- `.default(value)` is an **application-level default**. If the caller omits the field in `create()`, the
  repository fills in the default value in JavaScript before building the `INSERT`, and an explicit value
  is sent to Postgres for that column.
- `.primaryKey()` + `.autoIncrement()` together are **database-generated**. The repository must never send
  a value for this column on insert — it must be entirely omitted from the generated `INSERT` column list
  so Postgres's `SERIAL`/`IDENTITY` sequence assigns it, and the generated id is read back via
  `RETURNING *`.
- `.primaryKey()` **without** `.autoIncrement()` is just an ordinary caller-supplied column that happens to
  be the primary key (e.g. a string ID like `"user-123"`). It is required in create input like any other
  non-defaulted column, and the caller is responsible for supplying a unique value.

These are different mechanisms and must not be conflated.

`defineModel(tableName, columns)` returns a `Model<TColumns>` carrying the table name and the columns
record, with `TColumns` preserved as a type parameter so downstream utility types can walk it. At runtime,
`defineModel` should validate that **exactly one** column is marked `.primaryKey()` and throw a clear error
immediately if zero or more than one are found (simple runtime check — do not attempt to enforce "exactly
one primary key" at the type level; that requires disproportionately complex conditional-type arity
counting for little practical benefit given the model is defined once at startup and any mistake fails
loudly immediately). It should similarly validate `.autoIncrement()` usage as described above.

### 5.3 Type inference utilities (`types.ts`) — the core of the type-safety grade

Implement (names are flexible, behavior is not):

- `InferRow<TColumns>` — the shape of a row as returned from the database. Nullable columns become
  `T | null`; everything else is required.
- `InferCreateInput<TColumns>` — required keys are columns with no `.default()` that are not a
  database-generated primary key (i.e. not `.primaryKey().autoIncrement()`); optional keys (`?:`) are
  columns with `.default()`. A primary key that is also `.autoIncrement()` is **absent entirely** (never a
  valid key in create input) because it is database-generated. A primary key that is **not**
  `.autoIncrement()` remains a normal key in create input — required unless it also has `.default()`.
- `InferUpdateInput<TColumns>` — all row fields optional, **excluding the primary key** (the primary key
  can never be part of the update payload; it's how you locate the row).
- `InferWhereInput<TColumns>` — every field optional; each field accepts either a direct value (shorthand
  equality) or an operator object: `{ eq?, ne?, gt?, gte?, lt?, lte?, in?, isNull? }`. `gt/gte/lt/lte`
  should only type-check for `number` and `string` columns (not `boolean`) — use a conditional type to
  restrict the operator set per column type rather than allowing nonsensical comparisons to compile.
- `PrimaryKeyName<TColumns>` / `PrimaryKeyType<TColumns>` — extracted via a mapped type that finds the key
  whose column metadata has `primaryKey: true`, so `findById`/`update`/`delete` are typed against the
  actual primary key type (which may be `number` or `string` depending on the model — do not hardcode
  `number`).
- `Infer<TModel>` — the single public utility type re-exported from `index.ts`, letting a consumer write
  `type Todo = Infer<typeof TodoModel>` without importing internal generic machinery.

Write these with real generics and real `infer` usage. Do **not** fall back to `any` anywhere in this
file, and do not use `any` anywhere else in `packages/orm/src` either — that defeats the entire point of
the assignment and is explicitly called out as unacceptable (see Section 13). Where a generic needs a
constraint, use `unknown`, a properly-bounded generic parameter, or a concrete constrained type — never
`any` as a shortcut to make something compile. Do not mechanically swap `any` for `unknown` if that would
destroy useful inference (e.g. collapsing `InferCreateInput`/`InferUpdateInput`/`InferWhereInput`/
`PrimaryKeyType` back down to an untyped shape); use real generic constraints that preserve the actual
relationships between the model, its columns, the inferred row, the create input, the update input, the
where input, and the primary-key type.

### 5.4 Query builder (`query-builder.ts`) — pure, driver-agnostic, fully unit-testable

Implement pure functions with no I/O that take a table name + column metadata + call arguments and return
`{ text: string, values: unknown[] }`. Follow this exact contract:

```text
INSERT:
  INSERT INTO "table" ("colA","colB") VALUES ($1,$2) RETURNING *
  values = [valueForColA, valueForColB]
  (a column that is both .primaryKey() and .autoIncrement() is database-generated and is omitted from the
   column list entirely; a .primaryKey() column WITHOUT .autoIncrement() is a normal caller-supplied value
   and IS included in the column list like any other column)

SELECT (findMany/findFirst):
  SELECT * FROM "table"
  [WHERE "colA" = $1 AND "colB" > $2 ...]
  [ORDER BY "col" ASC|DESC]
  [LIMIT $n] [OFFSET $n]
  - shorthand equality {completed: false} -> "completed" = $n
  - {in: [...]} -> "col" = ANY($n), passing the array itself as a single parameter — do NOT hand-expand
    IN ($1,$2,$3,...) with a dynamic placeholder count; pg supports array parameters with = ANY() cleanly
    and this avoids a common, fiddly bug class.
  - {isNull: true} -> "col" IS NULL   /   {isNull: false} -> "col" IS NOT NULL  (no parameter placeholder)
  - no where clauses at all -> omit WHERE entirely (SELECT/list-all is intentional, not a bug)

UPDATE (always scoped by primary key — see Section 6 on write safety):
  UPDATE "table" SET "colA" = $1, "colB" = $2 WHERE "pk" = $3 RETURNING *

DELETE (always scoped by primary key):
  DELETE FROM "table" WHERE "pk" = $1
```

Rules that must hold everywhere:

- **Values are always parameterized.** Never interpolate a caller-supplied value into the SQL string.
- **Identifiers (table/column names) come only from the schema defined via `defineModel`**, not from
  request bodies — but the query builder and/or repository must still validate that every key present in
  a `where`/`data` object corresponds to an actual column on the model, and throw `ValidationError` for
  unknown keys, **before** using that key as a SQL identifier. This matters because TypeScript's
  compile-time checks are erased at runtime — an Express route handler receives `req.body` as untyped
  JSON, so this runtime key-validation is the actual enforcement boundary protecting the SQL generator
  from unexpected input, not just the compiler. Be ready to explain this distinction in the interview.
- Every function here must be covered by unit tests asserting the **exact** `text` and `values` output —
  not just "it doesn't throw."

### 5.5 Driver abstraction (`driver.ts`)

```ts
export interface Driver {
  query<T = unknown>(text: string, values: unknown[]): Promise<T[]>;
  close?(): Promise<void>;
}
```

`Driver` is the ORM's public extension point: consumers are explicitly allowed to pass their own `Driver`
implementation to `createClient({ driver, models })` (Section 5.1), so it must be exported as a public
type from `index.ts` (Section 5.9), not treated as an internal implementation detail.

Implement `PgDriver` backed by a `pg.Pool` as the ORM's **built-in** implementation of `Driver`. `PgDriver`
itself stays internal — it does not need to be exported — since consumers only need the `Driver` interface
to write a compatible alternative; the concrete Postgres implementation is not something they need to
construct directly. Configure SSL appropriately for Neon/Supabase (both require SSL; use
`?sslmode=require` in the connection string and/or `ssl: { rejectUnauthorized: false }` on the pool —
document whichever you use, and why, in `ARCHITECTURE.md`). Keep the pool small (`max: 5` is plenty for
this project). This interface is intentionally the ORM's seam for swapping in a different transport later
(e.g. an HTTP-based serverless driver for true edge/Lambda deployments) without touching the query builder
or repository — call this out explicitly in `ARCHITECTURE.md` as a scaling note (see Section 12).

### 5.6 Repository (`repository.ts`)

One `Repository<TColumns>` class (constructed per model by `createClient`) implementing:

- `create(data)` — validates keys against the schema, applies `.default()` values for omitted optional
  fields, omits the DB-generated (`.primaryKey().autoIncrement()`) primary key from the insert (a
  `.primaryKey()` column without `.autoIncrement()` is included like any other required/optional column),
  runs the INSERT, returns the single typed row from `RETURNING *`.
- `findMany(args?: { where?, orderBy?, limit?, offset? })` — returns `TRow[]`.
- `findFirst(args?: { where? })` — returns `TRow | null`.
- `findById(id)` — sugar for `findFirst` scoped to the primary key; returns `TRow | null`.
- `update(id, data)` — validates keys, runs the UPDATE scoped by primary key, throws `NotFoundError` if
  zero rows were affected (check the `RETURNING *` result length), otherwise returns the updated row.
- `delete(id)` — runs the DELETE scoped by primary key, throws `NotFoundError` if zero rows were affected.

Do **not** implement `updateMany`/`deleteMany` in the core scope — by-id update/delete plus a filtered
`findMany` covers every Todo-app use case, and restricting mutation to primary-key scoping is a deliberate
safety choice (it makes an accidental full-table update/delete structurally impossible from this API).
Document this explicitly as a design decision in `ARCHITECTURE.md`, including how you'd extend it (a
`deleteMany({ where })` that requires a non-empty `where`, or an explicit `deleteAll: true` escape hatch).

Add a lightweight **runtime validation** step at the top of `create`/`update`: for each key in the input,
confirm it's a real column on the model (reject unknown keys) and that `typeof value` matches the column's
expected primitive type (respecting `nullable`). Throw `ValidationError` with a clear message on mismatch.
This is not a full schema-validation library — just a cheap, honest boundary check — and it's important
precisely because JS objects arriving from an HTTP request body are not actually type-checked by anything
at runtime.

### 5.7 Client (`client.ts`)

```ts
export function createClient<TModels extends Record<string, Model<Record<string, unknown>>>>(
  config: { models: TModels } & ({ connectionString: string } | { driver: Driver })
): { [K in keyof TModels]: Repository<ColumnsOf<TModels[K]>> }
```

Do not write this as `TModels extends Record<string, Model<any>>` — that `any` is not an acceptable
shortcut for "a model with any columns." Constrain the generic with a real, bounded type (e.g. `Model<
Record<string, unknown>>`, or whatever your actual `Model`/`ColumnBuilder` generic shape requires) so the
constraint is genuine rather than a stand-in that happens to compile. `ColumnsOf<TModels[K]>` must still
resolve to the model's real, specific columns record for each key — the constraint on `TModels` narrows
what's *accepted*, it must not collapse what's *inferred* per model back down to `any`/`unknown`.

Use a mapped type over `keyof TModels` so the returned client object has exactly one correctly-typed
repository property per model key supplied — this is the mechanism behind `db.todo` being fully typed
with zero manual wiring. Be ready to explain this mapped type in the interview.

### 5.8 Errors (`errors.ts`)

`OrmError` (base), `ValidationError extends OrmError`, `NotFoundError extends OrmError`. Keep messages
useful (include table name and offending key/id) without leaking raw parameter values into logs
unnecessarily.

### 5.9 `index.ts` — the entire public surface

```ts
export { defineModel } from "./schema";
export { string, number, boolean } from "./columns";
export { createClient } from "./client";
export { OrmError, ValidationError, NotFoundError } from "./errors";
export type { Infer } from "./types";
export type { Driver } from "./driver";
```

Nothing else is exported. `Driver` is exported as a type because it is the public abstraction/extension
point consumers use to supply a custom driver (Section 5.5); `PgDriver` is the built-in Postgres
implementation and stays internal unless you have a compelling reason to expose it. `query-builder.ts`,
the concrete `PgDriver` class, and `repository.ts` internals (the `Repository` class itself, query-builder
helpers, etc.) are implementation detail — do not export repository internals or query-builder internals
beyond what's listed above.

---

## 6. Write-Safety Summary (restated for emphasis)

- No string interpolation of values into SQL, ever — parameters only.
- Identifiers only ever come from schema-defined column/table names, and are validated against the schema
  before use even when reached via runtime-untyped input.
- `update`/`delete` are always scoped by primary key at the API level — there is no code path that can
  generate an unscoped `UPDATE`/`DELETE`.
- Every SQL-generating function has a unit test asserting exact output.

---

## 7. ORM Package Testing (`packages/orm/test`)

- `columns.test.ts` — builder chaining produces correct metadata (`nullable`, `hasDefault`, `primaryKey`,
  `autoIncrement`), including that `.primaryKey()` alone does not set `autoIncrement`.
- `query-builder.test.ts` — exact `text`/`values` assertions for insert (covering both a database-generated
  auto-increment primary key that's omitted from the column list, and a non-auto-increment primary key
  that's included like any other column), select with each where operator (including `in` and `isNull`),
  select with no where, update, delete.
- `repository.test.ts` — inject a mock `Driver` (a `vi.fn()`-based fake, no real Postgres) and assert the
  repository calls it with the expected SQL/params and correctly maps/returns results, including the
  `NotFoundError` path for update/delete on zero affected rows.
- `types.test-types.ts` — a battery of `// @ts-expect-error` compile-time assertions checked via a
  `typecheck` script (`tsc --noEmit`), proving invalid usage fails to compile:
  - `db.todo.create({ nonsense: true })` → error
  - `db.todo.create({})` when a required field is missing → error
  - `db.todo.create({ id: 1, title: "x" })` on the Todo model, where `id` is `.primaryKey().autoIncrement()`
    (supplying a database-generated primary key) → error
  - `db.user.create({ name: "Alice" })` on the fixture `User` model, omitting its non-auto-increment
    `id: string().primaryKey()` (which is required, not database-generated) → error
  - `db.todo.findMany({ where: { completed: "yes" } })` (wrong primitive type) → error
  - `db.todo.findMany({ where: { doesNotExist: 1 } })` → error
  - A valid, fully-typed call of each CRUD method must compile with **no** error, proving you haven't
    just made everything reject — including a valid `create()` call on the `User` fixture that supplies
    its string primary key.
- `fixtures.ts` — define at least one **additional** test-only model beyond Todo (e.g. a `User` model with
  `id: string().primaryKey()`, `name: string()`, `bio: string().nullable()`, `age: number().default(0)`)
  purely to exercise nullable columns, application-level defaults, and a **non-numeric, non-auto-increment**
  primary key that must be supplied by the caller in `create()`. The Todo model alone (all non-null
  columns, one numeric auto-increment PK) does not exercise these branches of the type system or query
  builder — this fixture model is what proves the design generalizes.
- `integration.test.ts` — a real end-to-end create→find→update→delete against a live Postgres instance,
  gated with `describe.skipIf(!process.env.DATABASE_URL)` so it runs when a real database is configured
  and is silently skipped otherwise (never let this block `npm test` in an environment with no database).

All non-integration tests must pass with zero external dependencies. Run `npm run test` and
`npm run typecheck` inside `packages/orm` and confirm both are green before moving on.

---

## 8. The Todo Application

### 8.1 Backend (`apps/todo-app/src/server`)

- `models.ts` — `export const Todo = defineModel("todos", { id: number().primaryKey().autoIncrement(),
  title: string(), completed: boolean().default(false) })`.
- `db.ts` — `export const db = createClient({ connectionString: process.env.DATABASE_URL!, models: { todo:
  Todo } })`, imported **only** from `"<published-package-name>"`.
- `routes/todos.ts` + `server.ts` — Express routes:
  - `GET /api/todos?filter=all|active|completed` → `findMany` with the appropriate `where` (or none for
    `all`)
  - `POST /api/todos` — body `{ title: string }` → `db.todo.create({ title, completed: false })`
  - `PATCH /api/todos/:id` — body `{ completed?: boolean; title?: string }` → `db.todo.update(id, body)`
  - `DELETE /api/todos/:id` → `db.todo.delete(id)`
  - Map `ValidationError` → `400`, `NotFoundError` → `404`, anything else → `500` with a generic message
    (don't leak internals).
- In production, `server.ts` also serves the built frontend (`express.static(...)`) and falls back to
  `index.html` for client-side routing, so the whole app is one deployable process on one port.
- `db/schema.sql` — the actual `CREATE TABLE` DDL matching `models.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false
  );
  ```
  Document running this against Neon/Supabase (via `psql "$DATABASE_URL" -f db/schema.sql` or the
  provider's SQL editor) as a required setup step in the README. Note explicitly, in the limitations
  section, that keeping this DDL in sync with `models.ts` is currently manual because migrations are out
  of scope — this is expected and fine to state plainly.

### 8.2 Frontend (`apps/todo-app/src/client`)

Small React + TypeScript app, built with Vite:

- `TodoForm` — add a new todo
- `TodoList` / `TodoItem` — list, toggle complete, delete
- `FilterTabs` — All / Active / Completed, refetches (or filters) accordingly
- `api.ts` — thin `fetch` wrapper around the four endpoints above; no other state-management library needed
  for something this small (plain `useState`/`useEffect` is sufficient and easier to explain)

Keep styling simple and clean; do not spend disproportionate time here. This app exists to demonstrate the
ORM, not to be a portfolio frontend piece.

### 8.3 Scripts & workspace wiring

- Root `package.json`: `"workspaces": ["packages/*", "apps/*"]`.
- ORM's `dev` script runs `tsup --watch` so local changes rebuild `dist/` continuously.
- Root `dev` script runs the ORM watch-build and the todo-app dev server concurrently (use the
  `concurrently` package) — Vite serves the frontend with a dev-time proxy of `/api` to the Express
  server; Express serves the built frontend statically in production. This proves genuine workspace
  package consumption (the app imports the **built** package output, not raw TS source) rather than a
  fake pass-through.
- `apps/todo-app/package.json` depends on the ORM by its published name and a version range that always
  resolves to the local workspace copy (e.g. `"*"`), per standard npm workspaces resolution — no
  `workspace:` protocol (that's pnpm/yarn syntax, not npm).
- Root `build` script builds the ORM first, then the todo-app (backend `tsc` + `vite build`).

---

## 9. npm Publishing

The ORM **must** be a real, publishable npm package — not something that only works via workspace source
linking. That said, external publishing access should never be allowed to block or degrade the core
project. Follow this priority order:

1. Complete the entire project locally first — the ORM package, its full test suite, the Todo app
   (backend + frontend), documentation, and packaging.
2. Get the ORM build, unit tests, type tests, Todo app, documentation, packaging, and the verification
   checklist (Section 18) all green **before** attempting any real publish.
3. Prepare the npm publishing configuration described below regardless of whether you can actually publish.
4. If publish credentials/account/network access are already available in your environment, attempt the
   real publish.
5. If external credentials or account access are unavailable, do not fabricate a publish that didn't
   happen — finish all remaining local work regardless, and document the exact manual steps needed to
   publish once credentials are available.

Concretely:

- Package name: use the placeholder `@YOUR_NPM_USERNAME/lite-orm` throughout. Attempt `npm whoami` in your
  environment; if it returns a logged-in user, replace the placeholder with the real scope everywhere
  (`package.json`, imports, README). If not logged in / no credentials available, leave the placeholder
  consistently in place and call it out as the one manual substitution needed before publishing.
- `packages/orm/package.json` must include correct `main`, `module`, `types`, and an `exports` map
  covering both ESM and CJS consumers, `files: ["dist", "README.md", "LICENSE"]`, `sideEffects: false`,
  `engines.node`, and a `prepublishOnly` script that runs the build.
- Include a package-level `README.md` inside `packages/orm` (this is what npm displays on the package
  page) covering install, quick usage example, and a link to the full repo.
- Before attempting to publish: run `npm pack --dry-run` inside `packages/orm` and inspect the file list —
  confirm `dist/*.js`, `dist/*.cjs`, and `dist/*.d.ts` are present and nothing extraneous (source `.ts`
  files, tests, `node_modules`) is included.
- If publish credentials/network access are available in your environment: run the real
  `npm publish --access public` and record the resulting package URL in the README.
- If not: leave the package **fully publish-ready** and add an explicit "Publishing" section to the README
  with the exact commands the user must run locally (`npm login`, confirm the package name/scope, `npm
  publish --access public` from `packages/orm`). Do not fabricate a package URL that doesn't exist.

The final submission is still expected to include a real published npm package if the necessary external
access is available — this workflow only governs how to sequence the work so an unavailable credential
never leaves the ORM itself incomplete or untested.

---

## 10. Deployment

The Todo app must be deployed and publicly reachable — this is a hard requirement per the FAQ, not
optional. As with publishing (Section 9), finish and green-light everything you can build locally before
attempting real deployment, and never let an unavailable hosting credential leave core work undone —
document the exact manual steps instead of fabricating a live URL.

- Preferred: a single Render.com free **Web Service** running the built `apps/todo-app` server, which also
  serves the built frontend statically (see Section 8.1) — one service, one URL, no CORS coordination.
  Build command builds the ORM package then the todo-app; start command runs the built Express server.
  Environment variables: `DATABASE_URL` (Neon or Supabase connection string), `PORT` (Render injects this;
  read `process.env.PORT`).
- If Render is not usable in your environment, Railway or Fly.io are acceptable equivalents — same
  single-service topology.
- If you have the necessary CLI/API access and credentials to actually provision and deploy the service,
  do so, verify the public URL responds correctly (hit `/api/todos` and confirm the frontend loads), and
  record the live URL in the README.
- If you do not have deployment credentials/account access available in your environment: prepare
  everything needed for a one-command deploy — a `render.yaml` blueprint (or Dockerfile, if you judge that
  cleaner) with build/start commands and the required env vars documented — and add an explicit
  "Deployment" section to the README with exact step-by-step instructions to finish deployment manually.
  Do not fabricate a live URL that doesn't exist.
- `.env.example` at the repo root documenting `DATABASE_URL` (with a comment noting Neon/Supabase require
  `sslmode=require`) and `PORT`.
- The final submission is still expected to include a real, publicly deployed Todo app if the necessary
  external access is available — as with publishing, this only governs sequencing, not the requirement
  itself.

---

## 11. Git/Repo Hygiene

- Proper `.gitignore`: `node_modules`, `dist`, `.env`, editor/OS junk.
- No secrets committed anywhere, ever — confirm `.env` is git-ignored and never staged.
- No `node_modules` or build output committed.
- Commit in sensible, logical chunks as you complete phases (scaffold → ORM core → tests → todo backend →
  todo frontend → docs → deploy prep) rather than one giant commit, if your environment supports git
  operations.
- LICENSE file (MIT is fine).

---

## 12. Documentation

### `README.md` (root) must include, in this order:

1. Project overview (one paragraph: what this is, ORM + Todo app in a monorepo)
2. Features (bullet list, ORM and app)
3. Architecture overview (short — link to `ARCHITECTURE.md` for depth)
4. Tech stack and why (short version of Section 3's table)
5. Setup instructions (clone, `npm install` at root, env vars)
6. Database setup (Neon/Supabase connection string, running `db/schema.sql`)
7. Running locally (dev scripts, ports)
8. Using the ORM package (the code example from Section 5.1, plus a note that it works identically in any
   Node/TS project once installed from npm)
9. npm package info (name, install command, link — or the manual publish steps if not yet published)
10. Deployed demo link (or manual deployment steps if not yet deployed)
11. Testing (how to run unit tests, type tests, and the gated integration test)
12. **Known limitations** — be explicit and honest: no relations, limited `where` operators (`eq/ne/gt/gte
    /lt/lte/in/isNull`, no `OR`), no migrations (DDL is hand-maintained in `db/schema.sql`), no
    `updateMany`/`deleteMany` (mutations are always scoped by primary key, by design), no transaction
    support (documented as future work — see `ARCHITECTURE.md`), column names must match SQL column names
    exactly (no camelCase↔snake_case mapping).
13. **AI tool disclosure** — state plainly which AI tools were used (including this agent) and for what
    portions of the work. Do not understate or omit this.
14. **Time spent** — an honest breakdown by area (ORM core, tests, todo app, docs, deployment).

### `ARCHITECTURE.md` (root) must include:

1. Package/repo structure explained
2. The type system: how `defineModel` + column builders produce `InferRow`/`InferCreateInput`/
   `InferUpdateInput`/`InferWhereInput`, with the phantom-type explanation and a couple of the actual
   generic type definitions inline as examples
3. Query flow diagram: `Model API → Repository → Query Builder → { text, values } → Driver → pg → Row
   mapping → typed object`
4. How SQL is generated and parameterized; the identifier-validation safety boundary explained plainly
5. How the primary-key-scoped write safety works and why
6. Driver abstraction and why it exists (the serverless-scaling note from Section 5.5 belongs here:
   explain that a long-lived `pg.Pool` is correct for this single-service deployment, but a true
   edge/Lambda deployment would need a connection-pooling-aware or HTTP-based driver instead, and that the
   `Driver` interface is exactly the seam that would let you swap it in without touching the rest of the
   ORM; also note that `Driver` is public specifically so a consumer could supply that alternative
   implementation themselves)
7. Design tradeoffs explicitly called out: object-args query API vs. fluent chaining (chosen: object-args,
   simpler types, easier to explain); JS-applied defaults vs. DB-applied defaults; the `primaryKey()` vs.
   `autoIncrement()` split and why they're separate concerns; runtime key/type validation as the actual
   security boundary given TS types vanish at runtime
8. Extensibility: how you'd add a new column type (e.g. a `date()` builder), how you'd add relations, how
   you'd add a migration system, how you'd add transactions (`db.transaction(async (tx) => {...})` via
   checking a client out of the pool and running `BEGIN`/`COMMIT`/`ROLLBACK` with transaction-scoped
   repositories bound to that client) — a paragraph each, since these are exactly the live-interview "how
   would you extend this" questions. Transactions are documentation/discussion only in this version — see
   Section 14.

---

## 13. Explicitly Forbidden Failure Modes

Do not produce any of the following:

- `any` used to paper over a type that should be inferred properly, anywhere in `packages/orm/src`
  (including generic constraints like `Model<any>` used merely to make something compile — constrain with
  `unknown`, a real generic parameter, or a properly bounded type instead)
- Generic type parameters that are declared but never actually constrain anything ("fake" generics)
- Any SQL built via string/template interpolation of a caller-supplied **value**
- The Todo app importing anything from `packages/orm/src/...` instead of the package's public entry point
- A workspace dependency that only resolves because of an accidental relative path or manual symlink hack
  rather than proper npm workspaces resolution
- A published/publish-ready package missing `.d.ts` declaration files or missing from `exports`
- A "deployed" URL that isn't actually live, or a "published" package that isn't actually on npm, stated
  as if they are — always be truthful in the README about what was actually completed vs. what remains a
  documented manual step
- Business logic (Todo-specific behavior) leaking into the ORM package — the ORM must know nothing about
  "todos"
- Unnecessary abstraction layers, design patterns, or configurability not asked for by this spec
- Untested query-generation code paths
- The frontend consuming a disproportionate share of implementation time relative to the ORM
- Conflating `.primaryKey()` with auto-generation — a non-auto-increment primary key must remain part of
  create input, and an auto-increment primary key must never be a valid create-input key

---

## 14. Transactions — Documented Extensibility Only (Not Implemented)

Do not implement transaction support in this version. The required scope already contains enough
substantial work — schema builders, type inference, CRUD, filtering, query generation, parameterized SQL,
runtime validation, driver abstraction, the full ORM test suite, npm packaging, the Todo backend, the React
frontend, deployment, and documentation — and completing and polishing all of that is a higher priority
than any additional feature.

Transactions should appear only as a documented extensibility discussion in `ARCHITECTURE.md` (Section
12.8): explain conceptually how you would add `db.transaction(async (tx) => { await tx.todo.create(...);
... })` by checking a client out of the pool, running `BEGIN`/`COMMIT`/`ROLLBACK`, and providing
transaction-scoped repositories bound to that client instead of the pool — and note that this is a natural
live-interview discussion topic. Do not write any transaction implementation code.

Do not add relations, migrations, CLI tooling, or other unrequested bonus scope either — these remain
explicitly out of scope per Section 2, documented as limitations/future work only.

---

## 15. Implementation Phases

Work through these in order:

0. Inspect the existing repository state (Section 0.1).
1. Scaffold the monorepo: root `package.json` with workspaces, `tsconfig.base.json` (strict), `.gitignore`,
   ESLint/Prettier, `LICENSE`, folder skeleton.
2. ORM type system & schema API: `columns.ts`, `schema.ts`, `types.ts`. Write the compile-time
   (`@ts-expect-error`) tests early, against this layer, before building anything on top of it — this is
   the highest-risk, highest-value part of the project.
3. Query builder (`query-builder.ts`), pure and fully unit tested with exact SQL/param assertions.
4. Driver abstraction + `PgDriver` (`driver.ts`) + `errors.ts`.
5. Repository + `createClient` wiring (`repository.ts`, `client.ts`), including runtime validation and
   `NotFoundError` semantics.
6. Finish ORM package tests (fixture model edge cases, repository tests with a mock driver, gated
   integration test) + `tsup` build config + verify `npm pack --dry-run` output.
7. Todo backend: `models.ts`, `db.ts`, Express routes, `db/schema.sql`.
8. Todo frontend: Vite React app, components, styling.
9. Wire root dev/build/start scripts end-to-end; verify the whole app runs locally against a real (or
   integration-test) Postgres database with no deep/internal imports anywhere.
10. npm publishing prep (and real publish if credentials are available), per the priority order in
    Section 9.
11. Deployment prep (and real deploy if credentials are available), per the priority order in Section 10.
12. Write `README.md` and `ARCHITECTURE.md` per Section 12.
13. Full final audit against Section 18's checklist; fix any gaps found.
14. Produce the final report (Section 19).

---

## 16. Validating the Finished Project End-to-End

Before declaring the project done:

- `npm install` at the repo root succeeds cleanly.
- `npm run build` at the repo root builds both the ORM package and the todo-app with zero errors.
- `npm run typecheck` (ORM + app) passes with zero errors, including the `@ts-expect-error` type tests
  actually erroring where expected (if an expected error stops occurring, `tsc` must fail — confirm this
  is genuinely wired up, not just present as inert files).
- `npm test` in `packages/orm` passes (integration test skips gracefully if no `DATABASE_URL`).
- Locally running the todo-app (dev mode) end-to-end: create a todo, list it, toggle it complete, filter
  by active/completed, delete it — confirm each round-trips correctly through the real ORM and a real
  Postgres database if one is reachable from your environment.
- If deployed: hit the live URL and confirm the frontend loads and the API responds correctly.
- If published: confirm the package actually appears on the npm registry under the stated name, or
  clearly state in the README that it does not yet and why.
- `grep -rn "packages/orm/src" apps/` returns nothing — confirming no internal imports leaked into the app.

---

## 17. Final Verification Checklist

Go through this literally before finishing. Fix anything unchecked.

- [ ] Schema definition via `defineModel` + `string()`/`number()`/`boolean()` works as specified
- [ ] Full CRUD (`create`, `findMany`, `findFirst`, `findById`, `update`, `delete`) implemented and typed
- [ ] `where` filtering works, including operator objects (`eq/ne/gt/gte/lt/lte/in/isNull`)
- [ ] Invalid fields in `create`/`update`/`where` fail at **compile time** (proven by passing
      `@ts-expect-error` tests)
- [ ] `create()`'s required vs. optional fields correctly reflect defaults vs. database-generated
      (`.primaryKey().autoIncrement()`) primary keys — and a `.primaryKey()` column **without**
      `.autoIncrement()` is correctly required (or optional if it also has `.default()`) in create input,
      never silently dropped
- [ ] Returned rows, create input, update input, and where input are all independently and correctly typed
      — no shared `any`
- [ ] `packages/orm/src` contains no unnecessary `any` usage — including in `createClient`'s generic
      constraints (no `Model<any>`); generics use `unknown` or properly bounded type parameters instead
      without collapsing per-model type inference
- [ ] `Driver` is exported as a public type from `index.ts`; `PgDriver` remains internal
- [ ] All SQL uses parameterized values; no value is ever string-interpolated
- [ ] Unknown keys in `where`/`data` are rejected at runtime with `ValidationError` before touching SQL
- [ ] `update`/`delete` are always scoped by primary key; no unscoped mutation code path exists
- [ ] Driver abstraction exists and `PgDriver` is the only concrete implementation used in the app
- [ ] Todo app imports the ORM only via its package name, never via internal source paths (verified with
      grep)
- [ ] Todo app supports add, list, complete/uncomplete, delete, and active/completed/all filtering, with a
      working frontend UI
- [ ] Monorepo uses npm workspaces correctly; `npm install` + `npm run build` at root works from a clean
      clone
- [ ] ORM package builds to ESM + CJS + `.d.ts` via tsup; `npm pack --dry-run` output is correct and
      minimal
- [ ] ORM is either actually published to npm, or fully publish-ready with exact manual steps documented,
      per the priority order in Section 9
- [ ] Todo app is either actually deployed and publicly reachable, or fully deploy-ready with exact manual
      steps documented, per the priority order in Section 10
- [ ] Unit tests cover column builders, query builder (exact SQL/params), and repository behavior
      (including `NotFoundError`)
- [ ] Compile-time type tests exist and are wired into `npm run typecheck`, including the
      non-auto-increment-primary-key-required and auto-increment-primary-key-forbidden cases
- [ ] A second fixture model (nullable column, default, non-numeric, non-auto-increment PK required in
      create input) exists in the ORM's own test suite
- [ ] No transaction implementation exists anywhere in `packages/orm/src` — transactions are documented in
      `ARCHITECTURE.md` only
- [ ] `README.md` contains every section listed in Section 12, including honest AI disclosure and time
      spent
- [ ] `ARCHITECTURE.md` contains every section listed in Section 12
- [ ] No secrets committed; `.env` is git-ignored; `.env.example` exists
- [ ] No `node_modules`/`dist` committed; sensible `.gitignore`
- [ ] Nothing from Section 13's forbidden list is present anywhere in the codebase

---

## 18. Final Report

When everything above is complete, produce a concise summary (as a `SUBMISSION.md` at the repo root, or as
your final message if you have no way to persist a separate file) covering:

- What was built, in one paragraph
- Exact local run instructions
- npm package name and link (or the manual steps remaining)
- Deployed URL (or the manual steps remaining)
- Test results summary (unit, type tests, integration if run)
- Confirmation of every checklist item in Section 18, with a one-line note on any item that could not be
  fully completed and why
- Known limitations (mirrors the README section)

Now begin at Phase 0.
