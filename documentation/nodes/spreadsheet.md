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
