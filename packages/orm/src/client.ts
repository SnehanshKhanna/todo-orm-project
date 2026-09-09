import { Model, AnyColumnBuilder } from "./schema";
import { Driver, PgDriver } from "./driver";
import { Repository } from "./repository";

// The mapped type over TModels
export type ColumnsOf<M> = M extends Model<infer C> ? C : never;

export function createClient<
  TModels extends Record<string, Model<Record<string, AnyColumnBuilder>>>
>(
  config: { models: TModels } & ({ connectionString: string } | { driver: Driver })
): { [K in keyof TModels]: Repository<ColumnsOf<TModels[K]>> } {
  let driver: Driver;

  if ("driver" in config) {
    driver = config.driver;
  } else {
    driver = new PgDriver({ connectionString: config.connectionString });
  }

  const client = {} as Record<string, any>;

  for (const [key, model] of Object.entries(config.models)) {
    client[key] = new Repository(model, driver);
  }

  return client as any;
}
