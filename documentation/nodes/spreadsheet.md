## SpreadsheetNode

The `SpreadsheetNode` reads from and writes to spreadsheet files (.xlsx, .xls, .csv) with advanced manipulation.

### Parameters

*   `action`: The action to perform.
*   `filePath`: The absolute path to the spreadsheet file.
*   `sheetName`: Required for .xlsx/.xls files and sheet-specific actions. The name of the sheet.
*   `data`: Required for 'write', 'write_range', 'append_rows'. The data to write (array of arrays or array of objects).
*   `headerRow`: Optional. True if the first row is a header. Defaults to true.
*   `range`: Required for 'read_range', 'write_range', 'format_cells'. A1 notation (e.g., 'Sheet1!A1:C10').
*   `startRow`: Required for 'delete_rows', 'insert_rows'. The 1-indexed starting row.
*   `numRows`: Required for 'delete_rows', 'insert_rows'. The number of rows to delete/insert.
*   `newSheetName`: Required for 'add_sheet', 'rename_sheet'. The name of the new sheet.
*   `formats`: Required for 'format_cells'. Formatting options (conceptual, basic XLSX.js has limited styling).

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SpreadsheetNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {
  console.log('--- Running SpreadsheetNode Example ---');

  const tempDir = os.tmpdir();
  const csvFilePath = path.join(tempDir, 'sample_data.csv');

  // --- IMPORTANT: Prerequisites ---
  console.log("[Setup] Please ensure you have the 'xlsx' library installed (`npm install xlsx` or `bun add xlsx`).");

  // --- Create initial dummy CSV file ---
  const dummyCsvContent = "Name,Age,City\nAlice,30,New York\nBob,24,London\nCharlie,35,Paris";
  try {
    await fs.writeFile(csvFilePath, dummyCsvContent);
    console.log(`[Setup] Created dummy CSV file: ${csvFilePath}`);
  } catch (error) {
    console.error('[Setup] Failed to create dummy CSV file:', error);
    return;
  }

  // --- Example: Read data from CSV ---
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

  console.log('\n--- SpreadsheetNode Example Finished ---');

  // --- Cleanup ---
  try {
    console.log('\n[Cleanup] Removing generated files...');
    await fs.unlink(csvFilePath).catch(() => {});
    console.log('[Cleanup] Cleanup complete.');
  } catch (e) {
    console.warn('[Cleanup] Failed to remove some temporary files:', e.message);
  }
})();
```
