import { AsyncFlow } from '../src/qflow.js';
import { DatabaseNode } from '../src/nodes/index.js';

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