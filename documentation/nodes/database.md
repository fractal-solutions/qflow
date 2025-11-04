## DatabaseNode

The `DatabaseNode` provides a powerful and flexible way to interact with SQL databases directly within your qflow workflows. It supports both `bun:sqlite` for lightweight, file-based databases and `bun:sql` for connecting to more robust database systems like PostgreSQL and MySQL.

### Adapters

The `DatabaseNode` supports two adapters:

*   `sqlite`: Uses `bun:sqlite` for interacting with SQLite databases.
*   `sql`: Uses `bun:sql` for interacting with other SQL databases.

### Actions

The `DatabaseNode` supports the following actions:

*   `query`: Executes a raw SQL query.
*   `insert`: Inserts a single record into a table.
*   `bulk_insert`: Inserts multiple records into a table.
*   `update`: Updates records in a table based on a `where` clause.
*   `delete`: Deletes records from a table based on a `where` clause.
*   `transaction`: Executes a series of SQL operations within a transaction.

### Parameters

*   `connection`: The connection string for the database. For `sqlite`, this is the path to the database file.
*   `adapter`: The adapter to use (`sqlite` or `sql`).
*   `action`: The action to perform.
*   `query`: The SQL query to execute (for the `query` action).
*   `table`: The name of the table to operate on.
*   `data`: The data to insert or update. For `insert`, this is an object. For `bulk_insert`, this is an array of objects.
*   `where`: The `WHERE` clause for `update` and `delete` actions.
*   `operations`: An array of operations to execute within a transaction (for the `transaction` action).

### Example Usage

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

  // --- Bulk Insert users ---
  const bulkInsertUsers = new DatabaseNode();
  bulkInsertUsers.setParams({
      adapter: 'sqlite',
      connection: ':memory:',
      action: 'bulk_insert',
      table: 'users',
      data: [
          { '$name': 'Bob', '$email': 'bob@example.com' },
          { '$name': 'Charlie', '$email': 'charlie@example.com' }
      ]
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
    console.log('--- Users after insert ---');
    console.log(execRes);
    return 'default';
  };

  // --- Update a user ---
  const updateUser = new DatabaseNode();
  updateUser.setParams({
      adapter: 'sqlite',
      connection: ':memory:',
      action: 'update',
      table: 'users',
      data: { '$email': 'alice.new@example.com' },
      where: 'name = \'Alice\''
  });

  // --- Query users after update ---
  const queryUsersAfterUpdate = new DatabaseNode();
  queryUsersAfterUpdate.setParams({
      adapter: 'sqlite',
      connection: ':memory:',
      action: 'query',
      query: 'SELECT * FROM users;'
  });

  queryUsersAfterUpdate.postAsync = async (shared, prepRes, execRes) => {
      console.log('--- Users after update ---');
      console.log(execRes);
      return 'default';
  };

  // --- Delete a user ---
  const deleteUser = new DatabaseNode();
  deleteUser.setParams({
      adapter: 'sqlite',
      connection: ':memory:',
      action: 'delete',
      table: 'users',
      where: 'name = \'Bob\''
  });

  // --- Query users after delete ---
  const queryUsersAfterDelete = new DatabaseNode();
  queryUsersAfterDelete.setParams({
      adapter: 'sqlite',
      connection: ':memory:',
      action: 'query',
      query: 'SELECT * FROM users;'
  });

  queryUsersAfterDelete.postAsync = async (shared, prepRes, execRes) => {
      console.log('--- Users after delete ---');
      console.log(execRes);
      return 'default';
  };



  createTable.next(insertUser)
      .next(bulkInsertUsers)
      .next(queryUsers)
      .next(updateUser)
      .next(queryUsersAfterUpdate)
      .next(deleteUser)
      .next(queryUsersAfterDelete);

  const flow = new AsyncFlow(createTable);
  await flow.runAsync({});
})();
```
