import { AsyncNode } from '../qflow.js';
import { SQL } from 'bun';
import { Database as SQLiteDatabase } from 'bun:sqlite';

export class DatabaseNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "database",
      description: "Interacts with a database.",
      parameters: {
        type: "object",
        properties: {
          adapter: {
            type: "string",
            enum: ["sqlite", "postgres", "mysql"],
            description: "The database adapter to use."
          },
          connection: {
            type: "string",
            description: "The connection string for the database."
          },
          action: {
            type: "string",
            enum: ["query", "insert", "bulk_insert", "update", "delete", "transaction"],
            description: "The action to perform."
          },
          query: {
            type: "string",
            description: "The SQL query to execute (for the 'query' action)."
          },
          table: {
            type: "string",
            description: "The name of the table to operate on."
          },
          data: {
            type: "object",
            description: "The data to insert or update."
          },
          where: {
            type: "string",
            description: "The WHERE clause for 'update' and 'delete' actions."
          },
          operations: {
            type: "array",
            description: "An array of operations to execute within a transaction."
          }
        },
        required: ["adapter", "connection", "action"]
      }
    };
  }

  #db = null;

  async prepAsync(shared) {
    const { connection, adapter } = this.params;
    if (!shared.db_connections) {
        shared.db_connections = {};
    }

    if (shared.db_connections[connection]) {
        this.#db = shared.db_connections[connection];
    } else {
      if (adapter === 'sqlite') {
        this.#db = new SQLiteDatabase(connection);
      } else {
        this.#db = new SQL(connection || process.env.DATABASE_URL);
      }
      shared.db_connections[connection] = this.#db;
    }
  }

  async execAsync(prepRes, shared) {
    const { action, query, table, data, where, operations } = this.params;

    if (this.#db instanceof SQLiteDatabase) {
        // bun:sqlite logic
        switch (action) {
            case 'query':
                return this.#db.query(query).all();
            case 'insert':
                const keys = Object.keys(data).map(k => k.replace('$','')).join(', ');
                const values = Object.keys(data).map(k => k).join(', ');
                const statement = this.#db.prepare(`INSERT INTO ${table} (${keys}) VALUES (${values})`);
                return statement.run(data);
            case 'bulk_insert':
                const bulkKeys = Object.keys(data[0]).map(k => k.replace('$','')).join(', ');
                const bulkValues = Object.keys(data[0]).map(k => k).join(', ');
                const bulkStatement = this.#db.prepare(`INSERT INTO ${table} (${bulkKeys}) VALUES (${bulkValues})`);
                return this.#db.transaction(items => {
                    for (const item of items) bulkStatement.run(item);
                })(data);
            case 'update':
                const setClause = Object.keys(data).map(k => `${k.replace('$','')} = ${k}`).join(', ');
                const updateStatement = this.#db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${where}`);
                return updateStatement.run(data);
            case 'delete':
                const deleteStatement = this.#db.prepare(`DELETE FROM ${table} WHERE ${where}`);
                return deleteStatement.run();
            case 'transaction':
                return this.#db.transaction(() => {
                    for (const op of operations) {
                        this.#db.run(op.query, op.params);
                    }
                })();
            default:
                throw new Error(`Unsupported database action for sqlite: ${action}`);
        }
    } else {
        // bun:sql logic
        switch (action) {
            case 'query':
                return this.#db.query(query);
            case 'insert':
                return this.#db.query`INSERT INTO ${this.#db(table)} ${this.#db(data)}`;
            case 'bulk_insert':
                return this.#db.query`INSERT INTO ${this.#db(table)} ${this.#db(data)}`;
            case 'update':
                return this.#db.query`UPDATE ${this.#db(table)} SET ${this.#db(data)} WHERE ${this.#db.unsafe(where)}`;
            case 'delete':
                return this.#db.query`DELETE FROM ${this.#db(table)} WHERE ${this.#db.unsafe(where)}`;
            case 'transaction':
                return this.#db.begin(async tx => {
                    for (const op of operations) {
                        await tx.query(op.query, op.params);
                    }
                });
            default:
                throw new Error(`Unsupported database action for bun:sql: ${action}`);
        }
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.db_result = execRes;
    return 'default';
  }
}