import { AsyncFlow } from '@fractal-solutions/qflow';
import { SpreadsheetNode, WriteFileNode, ReadFileNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx'; // Required for dummy XLSX creation

(async () => {
  console.log('--- Running SpreadsheetNode Example ---');

  const tempDir = os.tmpdir();
  const csvFilePath = path.join(tempDir, 'sample_data.csv');
  const outputCsvFilePath = path.join(tempDir, 'output_data.csv');
  const outputXlsxFilePath = path.join(tempDir, 'output_data.xlsx');
  const modifyXlsxFilePath = path.join(tempDir, 'modify_sample.xlsx'); // For advanced operations

  // --- IMPORTANT: Prerequisites ---
  console.log("[Setup] Please ensure you have the 'xlsx' library installed (`npm install xlsx` or `bun add xlsx`).");

  // --- Create initial dummy files ---
  const dummyCsvContent = "Name,Age,City\nAlice,30,New York\nBob,24,London\nCharlie,35,Paris";
  try {
    await fs.writeFile(csvFilePath, dummyCsvContent);
    console.log(`[Setup] Created dummy CSV file: ${csvFilePath}`);
  } catch (error) {
    console.error('[Setup] Failed to create dummy CSV file:', error);
    return;
  }

  // Create a dummy XLSX file for advanced operations
  const initialXlsxData = [
    ['ID', 'Product', 'Quantity', 'Price'],
    [1, 'Laptop', 10, 1200],
    [2, 'Mouse', 50, 25],
    [3, 'Keyboard', 20, 75]
  ];
  const initialXlsxWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(initialXlsxWorkbook, XLSX.utils.aoa_to_sheet(initialXlsxData), "Sheet1");
  XLSX.utils.book_append_sheet(initialXlsxWorkbook, XLSX.utils.aoa_to_sheet([['Task', 'Status']]), "Tasks");
  XLSX.writeFile(initialXlsxWorkbook, modifyXlsxFilePath);
  console.log(`[Setup] Created dummy XLSX for modification: ${modifyXlsxFilePath}`);


  // --- Example 1: Read data from CSV ---
  console.log('\n--- Reading data from CSV ---');
  const readCsvNode = new SpreadsheetNode();
  readCsvNode.setParams({
    action: 'read',
    filePath: csvFilePath,
    headerRow: true
  });

  try {
    const result = await new AsyncFlow(readCsvNode).runAsync({});
    console.log('Read CSV Result:', result);
  } catch (error) {
    console.error('Read CSV Failed:', error.message);
  }

  // --- Example 2: Write data to a new CSV file ---
  console.log('\n--- Writing data to a new CSV file ---');
  const dataToWrite = [
    { Product: 'Laptop', Price: 1200 },
    { Product: 'Mouse', Price: 25 },
    { Product: 'Keyboard', Price: 75 }
  ];
  const writeCsvNode = new SpreadsheetNode();
  writeCsvNode.setParams({
    action: 'write',
    filePath: outputCsvFilePath,
    data: dataToWrite,
    headerRow: true
  });

  try {
    const result = await new AsyncFlow(writeCsvNode).runAsync({});
    console.log('Write CSV Result:', result);
  } catch (error) {
    console.error('Write CSV Failed:', error.message);
  }

  // --- Example 3: Write data to an XLSX file ---
  console.log('\n--- Writing data to an XLSX file ---');
  const writeXlsxNode = new SpreadsheetNode();
  writeXlsxNode.setParams({
    action: 'write',
    filePath: outputXlsxFilePath,
    sheetName: 'Products',
    data: dataToWrite,
    headerRow: true
  });

  try {
    const result = await new AsyncFlow(writeXlsxNode).runAsync({});
    console.log('Write XLSX Result:', result);
  }
  catch (error) {
    console.error('Write XLSX Failed:', error.message);
  }

  // --- Example 4: List sheets from an existing XLSX file ---
  console.log('\n--- Listing sheets from an existing XLSX file ---');
  const listSheetsNode = new SpreadsheetNode();
  listSheetsNode.setParams({
    action: 'list_sheets',
    filePath: modifyXlsxFilePath
  });

  try {
    const result = await new AsyncFlow(listSheetsNode).runAsync({});
    console.log('List Sheets Result:', result);
  } catch (error) {
    console.error('List Sheets Failed:', error.message);
  }

  // --- Example 5: Read data from a specific range in XLSX ---
  console.log('\n--- Reading data from range "A2:B3" in Sheet1 of XLSX ---');
  const readRangeNode = new SpreadsheetNode();
  readRangeNode.setParams({
    action: 'read_range',
    filePath: modifyXlsxFilePath,
    sheetName: 'Sheet1',
    range: 'A2:B3',
    headerRow: false // Read raw values without header assumption
  });

  try {
    const result = await new AsyncFlow(readRangeNode).runAsync({});
    console.log('Read Range Result:', result);
  } catch (error) {
    console.error('Read Range Failed:', error.message);
  }

  // --- Example 6: Write data to a specific range in XLSX ---
  console.log('\n--- Writing data to range "E1" in Sheet1 of XLSX ---');
  const writeRangeData = [['New Col1', 'New Col2'], ['Val1', 'Val2']];
  const writeRangeNode = new SpreadsheetNode();
  writeRangeNode.setParams({
    action: 'write_range',
    filePath: modifyXlsxFilePath,
    sheetName: 'Sheet1',
    range: 'E1',
    data: writeRangeData,
    headerRow: false
  });

  try {
    const result = await new AsyncFlow(writeRangeNode).runAsync({});
    console.log('Write Range Result:', result);
  } catch (error) {
    console.error('Write Range Failed:', error.message);
  }

  // --- Example 7: Append rows to an existing sheet ---
  console.log('\n--- Appending rows to Sheet1 of XLSX ---');
  const appendData = [['Appended1', 'Appended2', 'Appended3'], ['Appended4', 'Appended5', 'Appended6']];
  const appendRowsNode = new SpreadsheetNode();
  appendRowsNode.setParams({
    action: 'append_rows',
    filePath: modifyXlsxFilePath,
    sheetName: 'Sheet1',
    data: appendData
  });

  try {
    const result = await new AsyncFlow(appendRowsNode).runAsync({});
    console.log('Append Rows Result:', result);
  } catch (error) {
    console.error('Append Rows Failed:', error.message);
  }

  // --- Example 8: Add a new sheet ---
  console.log('\n--- Adding a new sheet "Summary" to XLSX ---');
  const addSheetNode = new SpreadsheetNode();
  addSheetNode.setParams({
    action: 'add_sheet',
    filePath: modifyXlsxFilePath,
    newSheetName: 'Summary'
  });

  try {
    const result = await new AsyncFlow(addSheetNode).runAsync({});
    console.log('Add Sheet Result:', result);
  } catch (error) {
    console.error('Add Sheet Failed:', error.message);
  }

  // --- Example 9: Rename a sheet ---
  console.log('\n--- Renaming "Tasks" sheet to "Project Tasks" ---');
  const renameSheetNode = new SpreadsheetNode();
  renameSheetNode.setParams({
    action: 'rename_sheet',
    filePath: modifyXlsxFilePath,
    sheetName: 'Tasks',
    newSheetName: 'Project Tasks'
  });

  try {
    const result = await new AsyncFlow(renameSheetNode).runAsync({});
    console.log('Rename Sheet Result:', result);
  } catch (error) {
    console.error('Rename Sheet Failed:', error.message);
  }

  // --- Example 10: Delete rows from a sheet ---
  console.log('\n--- Deleting 2 rows starting from row 2 in Sheet1 ---');
  const deleteRowsNode = new SpreadsheetNode();
  deleteRowsNode.setParams({
    action: 'delete_rows',
    filePath: modifyXlsxFilePath,
    sheetName: 'Sheet1',
    startRow: 2, // 1-indexed
    numRows: 2
  });

  try {
    const result = await new AsyncFlow(deleteRowsNode).runAsync({});
    console.log('Delete Rows Result:', result);
  } catch (error) {
    console.error('Delete Rows Failed:', error.message);
  }

  // --- Example 11: Insert rows into a sheet ---
  console.log('\n--- Inserting 3 rows at row 2 in Sheet1 ---');
  const insertRowsNode = new SpreadsheetNode();
  insertRowsNode.setParams({
    action: 'insert_rows',
    filePath: modifyXlsxFilePath,
    sheetName: 'Sheet1',
    startRow: 2, // 1-indexed
    numRows: 3
  });

  try {
    const result = await new AsyncFlow(insertRowsNode).runAsync({});
    console.log('Insert Rows Result:', result);
  } catch (error) {
    console.error('Insert Rows Failed:', error.message);
  }

  // --- Example 12: Format cells (Conceptual) ---
  console.log('\n--- Formatting cells in Sheet1 (Conceptual) ---');
  const formatCellsNode = new SpreadsheetNode();
  formatCellsNode.setParams({
    action: 'format_cells',
    filePath: modifyXlsxFilePath,
    sheetName: 'Sheet1',
    range: 'A1:C1',
    formats: { bold: true, color: 'red' } // These formats are conceptual for XLSX.js
  });

  try {
    const result = await new AsyncFlow(formatCellsNode).runAsync({});
    console.log('Format Cells Result:', result);
  } catch (error) {
    console.error('Format Cells Failed:', error.message);
  }

  // --- Example 13: Delete a sheet ---
  console.log('\n--- Deleting "Project Tasks" sheet ---');
  const deleteSheetNode = new SpreadsheetNode();
  deleteSheetNode.setParams({
    action: 'delete_sheet',
    filePath: modifyXlsxFilePath,
    sheetName: 'Project Tasks'
  });

  try {
    const result = await new AsyncFlow(deleteSheetNode).runAsync({});
    console.log('Delete Sheet Result:', result);
  } catch (error) {
    console.error('Delete Sheet Failed:', error.message);
  }


  console.log('\n--- SpreadsheetNode Example Finished ---');

  // --- Cleanup ---
  try {
    console.log('\n[Cleanup] Removing generated files...');
    await fs.unlink(csvFilePath).catch(() => {});
    await fs.unlink(outputCsvFilePath).catch(() => {});
    await fs.unlink(outputXlsxFilePath).catch(() => {});
    await fs.unlink(modifyXlsxFilePath).catch(() => {});
    console.log('[Cleanup] Cleanup complete.');
  } catch (e) {
    console.warn('[Cleanup] Failed to remove some temporary files:', e.message);
  }
})();