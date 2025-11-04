## PDFProcessorNode

The `PDFProcessorNode` extracts text or images from PDF documents.

### Parameters

*   `filePath`: The absolute path to the PDF file.
*   `action`: The action to perform: 'extract_text' or 'extract_images'.
*   `outputDir`: Optional. Directory to save extracted files. If not provided, a temporary directory will be used.
*   `pageRange`: Optional. Page range to process (e.g., {start: 1, end: 5}).
*   `password`: Optional. Password for encrypted PDFs.
