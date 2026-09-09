import { Pool } from "pg";

export interface Driver {
  query<T = unknown>(text: string, values: unknown[]): Promise<T[]>;
  close?(): Promise<void>;
}

export class PgDriver implements Driver {
  private pool: Pool;

  constructor(config: { connectionString: string }) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }

  async query<T = unknown>(text: string, values: unknown[]): Promise<T[]> {
    const result = await this.pool.query(text, values);
    return result.rows as T[];
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
