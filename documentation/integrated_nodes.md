## Integrated Nodes

The `AgentNode` can be equipped with a variety of tools to perform a wide range of tasks. Below is a list of the built-in tools and their functionalities.

### Core Tools

*   **finish**: Ends the agent's execution and returns a final output.
    *   `output`: A summary of the final result or the reason for stopping.
*   **user_input**: Prompts the user for input and waits for their response.
    *   `prompt`: The message to display to the user.
*   **interactive_input**: Prompts the user for input via a GUI popup (cross-platform).
    *   `prompt`: The message to display in the input dialog.
    *   `title`: Optional. The title of the input dialog. Defaults to 'QFlow Input'.
    *   `defaultValue`: Optional. The default value to pre-fill in the input field.

### File System

*   **read_file**: Reads the content of a specified file.
    *   `filePath`: The absolute path to the file to read.
*   **write_file**: Writes content to a specified file.
    *   `filePath`: The absolute path to the file to write to.
    *   `content`: The content to write to the file.
*   **append_file**: Appends content to an existing file.
    *   `filePath`: The absolute path to the file to append to.
    *   `content`: The content to append to the file.
*   **list_directory**: Lists the files and subdirectories within a specified directory.
    *   `directoryPath`: The absolute path to the directory to list.

### Web

*   **duckduckgo_search**: Performs a web search using DuckDuckGo.
    *   `query`: The search query.
*   **google_search**: Performs a web search using the Google Custom Search API.
    *   `query`: The search query.
    *   `apiKey`: Your Google API Key.
    *   `cseId`: Your Custom Search Engine ID.
*   **http_request**: Makes a generic HTTP request to any URL.
    *   `url`: The full URL of the API endpoint.
    *   `method`: The HTTP method to use (e.g., 'GET', 'POST').
    *   `headers`: Custom headers for the request.
    *   `body`: The request payload.
    *   `auth`: Authentication configuration.
*   **web_scraper**: Fetches the HTML content of a given URL.
    *   `url`: The URL to scrape.
*   **browser_control**: Controls a web browser to navigate pages, interact with elements, and take screenshots.
    *   `action`: The browser action to perform.
    *   `url`: The URL to navigate to (for 'goto' action).
    *   `selector`: A CSS selector to target an element (for 'click' and 'type' actions).
    *   `text`: The text to type into an input field (for 'type' action).
    *   `path`: The file path to save a screenshot (for 'screenshot' action).

### Data & Code

*   **data_extractor**: Extracts structured data from HTML, JSON, or plain text.
    *   `input`: The content string from which to extract data.
    *   `type`: The type of content to extract from (html, json, or text).
    *   `selector`: A CSS selector to target elements (for HTML).
    *   `jsonPath`: A dot-notation path to extract data (for JSON).
    *   `regex`: A regular expression to match and extract data (for text).
    *   `group`: The capturing group index to return from the regex match.
*   **database**: Interacts with SQL databases.
    *   `connection`: The connection string for the database.
    *   `adapter`: The adapter to use (`sqlite` or `sql`).
    *   `action`: The action to perform (`query`, `insert`, `bulk_insert`, `update`, `delete`, `transaction`).
    *   `query`: The SQL query to execute.
    *   `table`: The name of the table to operate on.
    *   `data`: The data to insert or update.
    *   `where`: The `WHERE` clause for `update` and `delete` actions.
    *   `operations`: An array of operations to execute within a transaction.
*   **code_interpreter**: Executes Python code snippets.
    *   `code`: The Python code snippet to execute.
    *   `timeout`: Maximum execution time in milliseconds.
    *   `args`: Command-line arguments to pass to the script.
    *   `requireConfirmation`: If true, the user will be prompted for confirmation before executing the code.
*   **transform_node**: Transforms input data using a provided JavaScript function.
    *   `input`: The data to be transformed.
    *   `transformFunction`: A JavaScript function string that takes 'data' as an argument and returns the transformed result.
*   **pdf_processor**: Extracts text or images from PDF documents.
    *   `filePath`: The absolute path to the PDF file.
    *   `action`: The action to perform: 'extract_text' or 'extract_images'.
    *   `outputDir`: Optional. Directory to save extracted files. If not provided, a temporary directory will be used.
    *   `pageRange`: Optional. Page range to process (e.g., {start: 1, end: 5}).
    *   `password`: Optional. Password for encrypted PDFs.
*   **spreadsheet**: Reads from and writes to spreadsheet files (.xlsx, .xls, .csv) with advanced manipulation.
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
*   **data_validation**: Validates structured data against a JSON Schema.
    *   `data`: The data to be validated.
    *   `schema`: The JSON Schema object directly.
    *   `schemaPath`: Optional. Path to a JSON Schema file. If provided, 'schema' parameter is ignored.
    *   `action`: The action to perform. Currently only 'validate' is supported.

### Memory & Embeddings

*   **memory_node**: Stores and retrieves text memories (keyword-based).
    *   `action`: The action to perform: 'store' or 'retrieve'.
    *   `content`: Required for 'store' action. The text content of the memory to store.
    *   `query`: Required for 'retrieve' action. Keywords to search for within stored memories.
    *   `id`: Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated.
    *   `memoryPath`: Optional. The directory path where memories are stored. Defaults to './agent_memories'.
*   **semantic_memory_node**: Stores and retrieves text memories via semantic search (requires Ollama).
    *   `action`: The action to perform: 'store' or 'retrieve'.
    *   `content`: Required for 'store' action. The text content of the memory to store.
    *   `query`: Required for 'retrieve' action. The text query for semantic search.
    *   `id`: Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated.
    *   `metadata`: Optional for 'store' action. Key-value pairs to store alongside the memory.
    *   `memoryPath`: Optional. The directory path where memories and the index are stored. Defaults to './semantic_memories'.
    *   `embeddingModel`: Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'.
    *   `embeddingBaseUrl`: Optional. The base URL of the Ollama API for embeddings. Defaults to 'http://localhost:11434'.
    *   `topK`: Optional for 'retrieve' action. The number of top similar results to retrieve. Defaults to 5.
*   **generate_embedding**: Generates vector embeddings for text (requires Ollama).
    *   `text`: The text string to generate an embedding for.
    *   `model`: Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'.
    *   `baseUrl`: Optional. The base URL of the Ollama API (e.g., 'http://localhost:11434'). Defaults to 'http://localhost:11434'.

### Flow Control

*   **sub_flow**: Executes a sub-flow.
    *   `flow`: The name of the flow to execute, as registered in the flow registry.
    *   `shared`: The shared object to pass to the sub-flow.
*   **iterator**: Iterates items, executes sub-flow for each.
    *   `items`: The list of items to iterate over.
    *   `flow`: The name of the flow to execute for each item, as registered in the flow registry.
*   **scheduler**: Schedules qflow flows for future or recurring execution using cron syntax or a delay.
    *   `action`: The action to perform: 'start' a new schedule or 'stop' an existing one.
    *   `schedule`: Required for 'start'. A cron string (e.g., '0 3 * * *') or a number in milliseconds for a one-time delay.
    *   `flow`: Required for 'start'. The name of the qflow AsyncFlow instance to trigger.
    *   `flowParams`: Optional. Parameters (shared object) to pass to the triggered flow's runAsync.
    *   `id`: Optional. A unique ID for the scheduled task (required for 'stop' action). If not provided for 'start', a random one will be generated.

### LLM Reasoning

*   **huggingface_llm_reasoning**: Generates human-like text, reasons, and plans. Not for external actions.
    *   `prompt`: The prompt or question to send to the language model.
    *   `model`: The Hugging Face model ID (e.g., 'HuggingFaceH4/zephyr-7b-beta', 'openai/gpt-oss-20b:novita').
    *   `hfToken`: Your Hugging Face API token.
    *   `temperature`: Optional. Controls randomness. Defaults to 0.7.
    *   `max_new_tokens`: Optional. Maximum number of tokens to generate. Defaults to 500.
    *   `baseUrl`: Optional. The base URL of the Hugging Face router API. Defaults to 'https://router.huggingface.co/v1'.
*   **llm_reasoning**: Generates human-like text, reasons, and plans. Not for external actions.
    *   `prompt`: The prompt or question to send to the language model.
*   **openrouter_llm_reasoning**: Generates human-like text, reasons, and plans via OpenRouter. Not for external actions.
    *   `prompt`: The prompt or question to send to the language model.
    *   `model`: The OpenRouter model ID (e.g., 'openai/gpt-4o', 'mistralai/mistral-7b-instruct').
    *   `apiKey`: Your OpenRouter API key.
    *   `siteUrl`: Optional. Site URL for rankings on openrouter.ai.
    *   `siteTitle`: Optional. Site title for rankings on openrouter.ai.
*   **ollama_llm_reasoning**: Generates human-like text, reasons, and plans locally via Ollama. Not for external actions.
    *   `prompt`: The prompt or question to send to the local Ollama language model.
    *   `model`: The Ollama model name to use (e.g., 'llama2', 'gemma:2b'). Defaults to 'llama2'.
    *   `baseUrl`: The base URL of the Ollama API (e.g., 'http://localhost:11434'). Defaults to 'http://localhost:11434'.

### System & Hardware

*   **shell_command**: Executes shell commands.
    *   `command`: The full shell command to execute (e.g., 'ls -l', 'npm install cheerio').
*   **system_notification**: Displays a system-level notification across OSs.
    *   `message`: The main message content of the notification.
    *   `title`: Optional. The title of the notification. Defaults to 'QFlow Notification'.
    *   `icon`: Optional. Path to an icon file or a system icon name (Linux specific). Ignored on macOS/Windows.
*   **display_image**: Displays an image file using the system's default image viewer.
    *   `imagePath`: The absolute path to the image file to display.
*   **hardware_interaction**: Communicates with local hardware via serial port (UART).
    *   `action`: The action to perform: 'write', 'read_line', 'list_ports'.
    *   `portPath`: Required for 'write'/'read_line'. The path to the serial port (e.g., '/dev/ttyUSB0', 'COM1').
    *   `baudRate`: Optional. The baud rate for serial communication. Defaults to 9600.
    *   `dataToWrite`: Required for 'write'. The data string to send to the serial port.
    *   `timeout`: Optional. Timeout in milliseconds for 'read_line' action. Defaults to 5000.
*   **image_gallery**: Generates an HTML gallery from multiple image files and opens it in a web browser.
    *   `imagePaths`: An array of absolute paths to the image files to display in the gallery.
    *   `title`: Optional. The title of the HTML gallery page. Defaults to 'Image Gallery'.
    *   `description`: Optional. A short description to display on the gallery page. Defaults to 'Generated by QFlow Agent'.
    *   `outputDir`: Optional. Directory to save the generated HTML file and copied images. Defaults to a temporary directory.
*   **speech_synthesis**: Converts text to spoken audio using OS capabilities or cloud APIs.
    *   `text`: The text to convert to speech.
    *   `provider`: Optional. The speech synthesis provider to use. Defaults to OS-specific. 'google' requires GOOGLE_TTS_API_KEY.
    *   `voice`: Optional. The specific voice to use (e.g., 'Alex' for macOS, 'en-us' for espeak, 'en-US-Wavenet-D' for Google).
    *   `outputFilePath`: Optional. If provided, saves the audio to this file path instead of playing it directly.
*   **multimedia_processing**: Performs various multimedia operations on audio and video files using ffmpeg.
    *   `action`: The multimedia operation to perform.
    *   `inputPath`: Path to the input multimedia file.
    *   `outputPath`: Path for the output file.
    *   `format`: Required for 'convert' and 'extract_audio'. The output format (e.g., 'mp4', 'mp3', 'gif', 'wav').
    *   `startTime`: Required for 'trim'. Start time in HH:MM:SS or seconds (e.g., '00:00:10', '10').
    *   `duration`: Required for 'trim'. Duration in HH:MM:SS or seconds (e.g., '00:00:05', '5').
    *   `resolution`: Optional for video 'convert'. Resolution (e.g., '1280x720').
    *   `frameTime`: Required for 'extract_frame'. Time to extract frame from in HH:MM:SS or seconds (e.g., '00:00:05').
    *   `ffmpegArgs`: Required for 'custom'. Raw ffmpeg arguments to execute directly.
*   **remote_execution**: Executes commands on remote machines via SSH.
    *   `host`: The hostname or IP address of the remote machine.
    *   `port`: Optional. The SSH port. Defaults to 22.
    *   `username`: The username for SSH authentication.
    *   `password`: Optional. The password for SSH authentication (use with caution, prefer privateKey).
    *   `privateKey`: Optional. The content of the private SSH key or its absolute path.
    *   `passphrase`: Optional. The passphrase for an encrypted private key.
    *   `action`: The action to perform. Currently only 'execute_command' is supported.
    *   `command`: The command string to execute on the remote machine.
    *   `timeout`: Optional. Timeout in milliseconds for the command execution. Defaults to 30000 (30 seconds).
*   **webhook**: Exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.
    *   `port`: Optional. The port number to listen on. Defaults to 3000.
    *   `path`: Optional. The URL path for the webhook endpoint. Defaults to '/webhook'.
    *   `flow`: The name of the qflow AsyncFlow instance to trigger when a webhook is received.
    *   `sharedSecret`: Optional. A shared secret for HMAC verification of incoming webhooks.
    *   `responseStatus`: Optional. The HTTP status code to send back to the webhook sender. Defaults to 200.
    *   `responseBody`: Optional. The JSON body to send back to the webhook sender. Defaults to { status: 'received' }.
*   **git**: Performs Git operations like clone, add, commit, and push.
    *   `action`: The Git action to perform.
    *   `repoPath`: The local path to the repository.
    *   `remoteUrl`: The URL of the remote repository (for 'clone' action).
    *   `files`: An array of file paths to add to the staging area (for 'add' action).
    *   `message`: The commit message (for 'commit' action).
    *   `branch`: The branch to push to or pull from.
    *   `remote`: The name of the remote (e.g., 'origin').
