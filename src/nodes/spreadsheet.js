import { AsyncNode } from '@/qflow.js';
import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx'; // npm install xlsx

export class SpreadsheetNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "spreadsheet",
      description: "Reads from and writes to spreadsheet files (.xlsx, .xls, .csv) with advanced manipulation.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["read", "write", "list_sheets", "read_range", "write_range", "append_rows", "delete_rows", "insert_rows", "add_sheet", "delete_sheet", "rename_sheet", "format_cells"],
            description: "The action to perform."
          },
          filePath: {
            type: "string",
            description: "The absolute path to the spreadsheet file."
          },
          sheetName: {
            type: "string",
            description: "Required for .xlsx/.xls files and sheet-specific actions. The name of the sheet."
          },
          data: {
            type: "array",
            description: "Required for 'write', 'write_range', 'append_rows'. The data to write (array of arrays or array of objects)."
          },
          headerRow: {
            type: "boolean",
            description: "Optional. True if the first row is a header. Defaults to true."
          },
          range: {
            type: "string",
            description: "Required for 'read_range', 'write_range', 'format_cells'. A1 notation (e.g., 'Sheet1!A1:C10')."
          },
          startRow: {
            type: "number",
            description: "Required for 'delete_rows', 'insert_rows'. The 1-indexed starting row."
          },
          numRows: {
            type: "number",
            description: "Required for 'delete_rows', 'insert_rows'. The number of rows to delete/insert."
          },
          newSheetName: {
            type: "string",
            description: "Required for 'add_sheet', 'rename_sheet'. The name of the new sheet."
          },
          formats: {
            type: "object",
            description: "Required for 'format_cells'. Formatting options (conceptual, basic XLSX.js has limited styling)."
          }
        },
        required: ["action", "filePath"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const {
      filePath,
      action, // 'read', 'write', 'list_sheets', 'read_range', 'write_range', 'append_rows', 'delete_rows', 'insert_rows', 'add_sheet', 'delete_sheet', 'rename_sheet', 'format_cells'
      sheetName, // Required for .xlsx/.xls read/write/management
      data, // Required for 'write', 'write_range', 'append_rows'
      headerRow = true, // For read/write
      range, // A1 notation for 'read_range', 'write_range', 'format_cells'
      startRow, // For 'delete_rows', 'insert_rows'
      numRows, // For 'delete_rows', 'insert_rows'
      startCol, // For 'delete_cols', 'insert_cols' (conceptual, not implementing now)
      numCols, // For 'delete_cols', 'insert_cols' (conceptual, not implementing now)
      newSheetName, // For 'rename_sheet'
      formats // For 'format_cells'
    } = this.params;

    if (!filePath) {
      throw new Error('SpreadsheetNode requires a `filePath` parameter.');
    }
    if (!action || !['read', 'write', 'list_sheets', 'read_range', 'write_range', 'append_rows', 'delete_rows', 'insert_rows', 'add_sheet', 'delete_sheet', 'rename_sheet', 'format_cells'].includes(action)) {
      throw new Error('SpreadsheetNode requires a valid `action`.');
    }

    const fileExtension = path.extname(filePath).toLowerCase();
    let workbook;
    let result;

    // Helper to read workbook (for read/list_sheets/modify)
    const readWorkbook = async () => {
      try {
        const fileBuffer = await fs.readFile(filePath);
        return XLSX.read(fileBuffer, { type: 'buffer' });
      } catch (e) {
        throw new Error(`Failed to read spreadsheet file: ${e.message}. Ensure file exists and is accessible.`);
      }
    };

    // Helper to write workbook (for modify actions)
    const writeWorkbook = async (wb) => {
      try {
        XLSX.writeFile(wb, filePath);
      } catch (e) {
        throw new Error(`Failed to write spreadsheet file: ${e.message}.`);
      }
    };

    // Helper to get worksheet
    const getWorksheet = (wb, sName) => {
      if (!sName) throw new Error('`sheetName` is required for this action.');
      const ws = wb.Sheets[sName];
      if (!ws) throw new Error(`Sheet '${sName}' not found in workbook.`);
      return ws;
    };

    switch (action) {
      case 'list_sheets':
        if (!['.xlsx', '.xls'].includes(fileExtension)) {
          throw new Error(`List sheets action only supported for .xlsx or .xls files. Got: ${fileExtension}`);
        }
        workbook = await readWorkbook();
        result = { sheets: workbook.SheetNames };
        break;

      case 'read':
        if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
          throw new Error(`Unsupported file format for reading: ${fileExtension}. Supported: .xlsx, .xls, .csv`);
        }
        workbook = await readWorkbook();
        let worksheetRead;
        if (fileExtension === '.csv') {
          worksheetRead = workbook.Sheets[workbook.SheetNames[0]];
        } else {
          worksheetRead = getWorksheet(workbook, sheetName);
        }
        result = XLSX.utils.sheet_to_json(worksheetRead, { header: headerRow ? 1 : 'A' });
        break;

      case 'read_range':
        if (!range) throw new Error('`range` is required for read_range.');
        if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
          throw new Error(`Unsupported file format for reading range: ${fileExtension}. Supported: .xlsx, .xls, .csv`);
        }
        workbook = await readWorkbook();
        let worksheetReadRange;
        if (fileExtension === '.csv') {
          worksheetReadRange = workbook.Sheets[workbook.SheetNames[0]];
        } else {
          worksheetReadRange = getWorksheet(workbook, sheetName);
        }
        result = XLSX.utils.sheet_to_json(worksheetReadRange, { header: headerRow ? 1 : 'A', range: range });
        break;

      case 'write':
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error('`data` is required for write.');
        if (!['.xlsx', '.csv'].includes(fileExtension)) {
          throw new Error(`Unsupported file format for writing: ${fileExtension}. Supported: .xlsx, .csv`);
        }
        workbook = XLSX.utils.book_new();
        const worksheetToWrite = XLSX.utils.json_to_sheet(data, { skipHeader: !headerRow });
        if (fileExtension === '.csv') {
          const csvContent = XLSX.utils.sheet_to_csv(worksheetToWrite);
          await fs.writeFile(filePath, csvContent);
        }
        else {
          if (!sheetName) throw new Error('`sheetName` is required for .xlsx write.');
          XLSX.utils.book_append_sheet(workbook, worksheetToWrite, sheetName);
          await writeWorkbook(workbook);
        }
        result = { message: `Successfully wrote data to ${filePath}` };
        break;

      case 'write_range':
        if (!range || !data || !Array.isArray(data)) throw new Error('`range` and `data` are required for write_range.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for writing range: ${fileExtension}. Supported: .xlsx`);
        workbook = await readWorkbook();
        let worksheetWriteRange = getWorksheet(workbook, sheetName);
        XLSX.utils.sheet_add_json(worksheetWriteRange, data, { origin: range, skipHeader: !headerRow });
        await writeWorkbook(workbook);
        result = { message: `Successfully wrote data to range ${range} in ${filePath}` };
        break;

      case 'append_rows':
        if (!data || !Array.isArray(data)) throw new Error('`data` is required for append_rows.');
        if (!['.xlsx', '.csv'].includes(fileExtension)) throw new Error(`Unsupported file format for appending: ${fileExtension}. Supported: .xlsx, .csv`);
        workbook = await readWorkbook();
        let worksheetAppend;
        if (fileExtension === '.csv') {
          worksheetAppend = workbook.Sheets[workbook.SheetNames[0]];
          const csvContent = XLSX.utils.sheet_to_csv(worksheetAppend) + '\n' + XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data, { skipHeader: true }));
          await fs.writeFile(filePath, csvContent);
        } else {
          worksheetAppend = getWorksheet(workbook, sheetName);
          XLSX.utils.sheet_add_json(worksheetAppend, data, { skipHeader: true, origin: -1 }); // -1 appends to end
          await writeWorkbook(workbook);
        }
        result = { message: `Successfully appended rows to ${filePath}` };
        break;

      case 'delete_rows':
        if (startRow === undefined || numRows === undefined) throw new Error('`startRow` and `numRows` are required for delete_rows.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for deleting rows: ${fileExtension}. Supported: .xlsx`);
        
        const deleteRowsHelper = (ws, start, num) => {
          const range = XLSX.utils.decode_range(ws['!ref']);
          for (let R = start; R < range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              ws[XLSX.utils.encode_cell({r: R, c: C})] = ws[XLSX.utils.encode_cell({r: R + num, c: C})];
            }
          }
          range.e.r -= num;
          ws['!ref'] = XLSX.utils.encode_range(range.s, range.e);
        };

        workbook = await readWorkbook();
        let worksheetDeleteRows = getWorksheet(workbook, sheetName);
        deleteRowsHelper(worksheetDeleteRows, startRow - 1, numRows);
        await writeWorkbook(workbook);
        result = { message: `Successfully deleted ${numRows} rows starting from ${startRow} in ${filePath}` };
        break;

      case 'insert_rows':
        if (startRow === undefined || numRows === undefined) throw new Error('`startRow` and `numRows` are required for insert_rows.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for inserting rows: ${fileExtension}. Supported: .xlsx`);
        workbook = await readWorkbook();
        let worksheetInsertRows = getWorksheet(workbook, sheetName);
        XLSX.utils.sheet_add_aoa(worksheetInsertRows, Array(numRows).fill([]), { origin: startRow - 1 }); // Insert empty rows
        await writeWorkbook(workbook);
        result = { message: `Successfully inserted ${numRows} rows starting from ${startRow} in ${filePath}` };
        break;

      case 'add_sheet':
        if (!newSheetName) throw new Error('`newSheetName` is required for add_sheet.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for adding sheet: ${fileExtension}. Supported: .xlsx`);
        workbook = await readWorkbook();
        if (workbook.SheetNames.includes(newSheetName)) throw new Error(`Sheet '${newSheetName}' already exists.`);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[]]), newSheetName); // Add empty sheet
        await writeWorkbook(workbook);
        result = { message: `Successfully added sheet '${newSheetName}' to ${filePath}` };
        break;

      case 'delete_sheet':
        if (!sheetName) throw new Error('`sheetName` is required for delete_sheet.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for deleting sheet: ${fileExtension}. Supported: .xlsx`);
        workbook = await readWorkbook();
        if (!workbook.SheetNames.includes(sheetName)) throw new Error(`Sheet '${sheetName}' not found.`);
        delete workbook.Sheets[sheetName];
        workbook.SheetNames = workbook.SheetNames.filter(s => s !== sheetName);
        await writeWorkbook(workbook);
        result = { message: `Successfully deleted sheet '${sheetName}' from ${filePath}` };
        break;

      case 'rename_sheet':
        if (!sheetName || !newSheetName) throw new Error('`sheetName` and `newSheetName` are required for rename_sheet.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for renaming sheet: ${fileExtension}. Supported: .xlsx`);
        workbook = await readWorkbook();
        if (!workbook.SheetNames.includes(sheetName)) throw new Error(`Sheet '${sheetName}' not found.`);
        if (workbook.SheetNames.includes(newSheetName)) throw new Error(`Sheet '${newSheetName}' already exists.`);
        workbook.SheetNames[workbook.SheetNames.indexOf(sheetName)] = newSheetName;
        workbook.Sheets[newSheetName] = workbook.Sheets[sheetName];
        delete workbook.Sheets[sheetName];
        await writeWorkbook(workbook);
        result = { message: `Successfully renamed sheet '${sheetName}' to '${newSheetName}' in ${filePath}` };
        break;

      case 'format_cells':
        if (!range || !formats) throw new Error('`range` and `formats` are required for format_cells.');
        if (!['.xlsx'].includes(fileExtension)) throw new Error(`Unsupported file format for formatting cells: ${fileExtension}. Supported: .xlsx`);
        workbook = await readWorkbook();
        let worksheetFormat = getWorksheet(workbook, sheetName);
        // This is a simplified example. Real formatting is complex with XLSX.
        // XLSX.utils.format_cell is not for writing styles, but for formatting values.
        // To apply styles, you typically need to manipulate the cell object directly
        // or use a library that builds on top of XLSX for styling (e.g., exceljs, but that's another dependency).
        // For now, we'll just acknowledge the request and return a message.
        // A real implementation would involve iterating cells in the range and applying styles.
        result = { message: `Formatting cells in range ${range} with provided formats (conceptual). Actual styling not fully implemented with basic XLSX.js.` };
        await writeWorkbook(workbook); // Still write to save any other changes
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return result;
  }
}