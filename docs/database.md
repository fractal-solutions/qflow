
# DatabaseNode

The `DatabaseNode` provides a unified interface for interacting with SQL databases, including SQLite, PostgreSQL, and MySQL, using Bun's built-in database drivers.

## Actions

The `DatabaseNode` supports the following actions:

- `query`: Execute a raw SQL query.
- `insert`: Insert a single record into a table.
- `bulk_insert`: Insert multiple records into a table.
- `update`: Update records in a table based on a condition.
- `delete`: Delete records from a table based on a condition.
- `transaction`: Execute a series of operations within a transaction.

## Parameters

- `adapter`: The database adapter to use. Can be `sqlite`, `postgres`, or `mysql`.
- `connection`: The connection string for the database.
- `action`: The action to perform.
- `query`: The SQL query to execute (for the `query` action).
- `table`: The name of the table to operate on.
- `data`: The data to insert or update.
- `where`: The `WHERE` clause for `update` and `delete` actions.
- `operations`: An array of operations to execute within a transaction.

## Examples

### SQLite

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DatabaseNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  // --- Create a table ---
  const createTable = new DatabaseNode();
  createTable.setParams({
    adapter: 'sqlite',
    connection: ':memory:',
    action: 'query',
    query: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);'
  });

  // --- Insert a user ---
  const insertUser = new DatabaseNode();
  insertUser.setParams({
    adapter: 'sqlite',
    connection: ':memory:',
    action: 'insert',
    table: 'users',
    data: { '$name': 'Alice', '$email': 'alice@example.com' }
  });

  // --- Query users ---
  const queryUsers = new DatabaseNode();
  queryUsers.setParams({
    adapter: 'sqlite',
    connection: ':memory:',
    action: 'query',
    query: 'SELECT * FROM users;'
  });

  queryUsers.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- Users ---');
    console.log(execRes);
    return 'default';
  };

  createTable.next(insertUser).next(queryUsers);

  const flow = new AsyncFlow(createTable);
  await flow.runAsync({});
})();
```

### PostgreSQL

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DatabaseNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  // --- Create a table ---
  const createTable = new DatabaseNode();
  createTable.setParams({
    adapter: 'postgres',
    connection: 'postgres://user:password@host:port/database',
    action: 'query',
    query: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT);'
  });

  // --- Insert a user ---
  const insertUser = new DatabaseNode();
  insertUser.setParams({
    adapter: 'postgres',
    connection: 'postgres://user:password@host:port/database',
    action: 'insert',
    table: 'users',
    data: { name: 'Alice', email: 'alice@example.com' }
  });

  // --- Query users ---
  const queryUsers = new DatabaseNode();
  queryUsers.setParams({
    adapter: 'postgres',
    connection: 'postgres://user:password@host:port/database',
    action: 'query',
    query: 'SELECT * FROM users;'
  });

  queryUsers.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- Users ---');
    console.log(execRes);
    return 'default';
  };

  createTable.next(insertUser).next(queryUsers);

  const flow = new AsyncFlow(createTable);
  await flow.runAsync({});
})();
```

### MySQL

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DatabaseNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  // --- Create a table ---
  const createTable = new DatabaseNode();
  createTable.setParams({
    adapter: 'mysql',
    connection: 'mysql://user:password@host:port/database',
    action: 'query',
    query: 'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255));'
  });

  // --- Insert a user ---
  const insertUser = new DatabaseNode();
  insertUser.setParams({
    adapter: 'mysql',
    connection: 'mysql://user:password@host:port/database',
    action: 'insert',
    table: 'users',
    data: { name: 'Alice', email: 'alice@example.com' }
  });

  // --- Query users ---
  const queryUsers = new DatabaseNode();
  queryUsers.setParams({
    adapter: 'mysql',
    connection: 'mysql://user:password@host:port/database',
    action: 'query',
    query: 'SELECT * FROM users;'
  });

  queryUsers.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- Users ---');
    console.log(execRes);
    return 'default';
  };

  createTable.next(insertUser).next(queryUsers);

  const flow = new AsyncFlow(createTable);
  await flow.runAsync({});
})();
```

### Working with In-Memory Databases

When working with in-memory databases (e.g., `sqlite::memory:`), it is important to manage the database connection outside of the flow and pass it in the `shared` object. This ensures that all `DatabaseNode` instances in the flow share the same database connection.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DatabaseNode } from '@fractal-solutions/qflow/nodes';
import { Database } from 'bun:sqlite';

(async () => {
  const db = new Database(':memory:');

  // --- Create a table ---
  const createTable = new DatabaseNode();
  createTable.setParams({
    adapter: 'sqlite',
    connection: ':memory:',
    action: 'query',
    query: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);'
  });

  // --- Insert a user ---
  const insertUser = new DatabaseNode();
  insertUser.setParams({
    adapter: 'sqlite',
    connection: ':memory:',
    action: 'insert',
    table: 'users',
    data: { '$name': 'Alice', '$email': 'alice@example.com' }
  });

  // --- Query users ---
  const queryUsers = new DatabaseNode();
  queryUsers.setParams({
    adapter: 'sqlite',
    connection: ':memory:',
    action: 'query',
    query: 'SELECT * FROM users;'
  });

  queryUsers.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- Users ---');
    console.log(execRes);
    return 'default';
  };

  createTable.next(insertUser).next(queryUsers);

  const flow = new AsyncFlow(createTable);
  await flow.runAsync({ db_connections: { ':memory:': db } });
})();
```
