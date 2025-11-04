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
