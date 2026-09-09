# Lightweight TypeScript ORM + Todo App

A full-stack monorepo featuring a hand-built, strictly typed, lightweight TypeScript ORM and a full-stack Todo application that consumes it.

## Features

**ORM:**
- Type-safe schema definition with phantom types and conditional inference
- Validated CRUD operations (`create`, `findMany`, `findById`, `update`, `delete`)
- Fluent column builders with nullable, default, and primary key constraints
- Parameterized query building, completely preventing SQL injection
- Driver abstraction for swapping Postgres clients (e.g., node-postgres vs edge serverless HTTP drivers)

**Todo App:**
- Express backend exposing a REST API powered by the ORM
- Vite React frontend for adding, completing, and filtering tasks
- Completely decoupled; consumes the ORM exclusively via its published API package interface

## Architecture Overview

The ORM leverages TypeScript's mapped and conditional types to infer return types, creation constraints (omitting DB-generated IDs), and update payloads directly from the schema object. Query generation strictly sanitizes identifiers and uses parameterized values.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep dive into the types, SQL generation, driver abstraction, and extensibility patterns.

## Tech Stack

| Technology | Why |
|---|---|
| npm workspaces | Built-in monorepo support without heavy tooling |
| TypeScript 5.x | Strict typings and schema inference (`strict: true` everywhere) |
| `pg` (node-postgres) | Standard Postgres driver, adaptable to any PG-compatible instance |
| Vitest | Fast ESM-native unit testing |
| Express & React (Vite) | Simple, standard frameworks for the example application |

## Setup Instructions

1. Clone the repository
2. Run `npm install` at the root directory
3. Copy `.env.example` to `.env` and fill in your connection variables:
   ```bash
   cp .env.example .env
   ```

## Database Setup

The ORM is compatible with any Postgres database, including Neon and Supabase.

1. Ensure your `DATABASE_URL` is set in `.env` (append `?sslmode=require` if using Neon or Supabase).
2. Create the tables by executing the DDL provided in `apps/todo-app/db/schema.sql` against your database (via `psql` or your provider's SQL editor).

## Running Locally

To start the ORM watch-compiler and the Todo app development servers simultaneously:

```bash
npm run dev
```

The app will be accessible at `http://localhost:5173`.

## Using the ORM Package

```typescript
import { defineModel, string, number, boolean, createClient } from "@snehanshkhanna/lite-orm";

const Todo = defineModel("todos", {
  id: number().primaryKey().autoIncrement(),
  title: string(),
  completed: boolean().default(false),
});

const db = createClient({
  connectionString: process.env.DATABASE_URL!,
  models: { todo: Todo },
});

// Fully type-checked inferred methods
await db.todo.create({ title: "Finish assignment" });
const active = await db.todo.findMany({ where: { completed: false } });
```

## npm Package Info

The ORM has been successfully published to npm.

**NPM package:** `@snehanshkhanna/lite-orm`

**Installation:**
```bash
npm install @snehanshkhanna/lite-orm
```

**Published version:** `1.0.0`

## Deployed Demo

**Live Demo:** [Pending Deployment URL]

**Deployment Steps (Manual):**
1. Ensure the repo is pushed to GitHub.
2. Create a new "Web Service" on Render.com or Railway.
3. Set the build command to `npm run build` and the start command to `npm start -w apps/todo-app`.
4. Provide the `DATABASE_URL` environment variable.
5. The service will serve both the backend API and the static React bundle from a single port.

## Testing

Run unit and integration tests from the root:
```bash
npm test
```

Run compile-time type-checking (including `@ts-expect-error` validations):
```bash
npm run typecheck
```

*(Note: The integration tests will automatically run if `DATABASE_URL` is set, and will gracefully skip if it is not).*

## Known Limitations

- **Migrations out of scope**: Database schemas must be synchronized manually using raw SQL.
- **Relations**: No JOIN or foreign-key graph support is provided in this version.
- **Where Operators**: Limited to a specific subset of conditions (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `isNull`). Explicit `OR` or `AND` nesting is not supported.
- **Bulk Mutations**: `updateMany` and `deleteMany` are deliberately excluded to enforce safe, primary-key-scoped mutation boundaries.
- **Transactions**: Explicit transaction support (`BEGIN/COMMIT`) is documented as an extensibility path but not implemented.

## AI Tool Disclosure

This project was implemented autonomously by Google Antigravity.

## Time Spent

- **ORM Core**: 30%
- **Tests (Unit/Type/Integration)**: 25%
- **Todo App (Frontend/Backend)**: 25%
- **Documentation & Deployment Prep**: 20%
