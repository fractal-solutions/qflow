
export function getToolDefinitions() {
  return [
    {
      name: "huggingface_llm_reasoning",
      description: "Generates human-like text, reasons, and plans. Not for external actions.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt or question to send to the language model."
          },
          model: {
            type: "string",
            description: "The Hugging Face model ID (e.g., 'HuggingFaceH4/zephyr-7b-beta', 'openai/gpt-oss-20b:novita')."
          },
          hfToken: {
            type: "string",
            description: "Your Hugging Face API token."
          },
          temperature: {
            type: "number",
            description: "Optional. Controls randomness. Defaults to 0.7."
          },
          max_new_tokens: {
            type: "number",
            description: "Optional. Maximum number of tokens to generate. Defaults to 500."
          },
          baseUrl: {
            type: "string",
            description: "Optional. The base URL of the Hugging Face router API. Defaults to 'https://router.huggingface.co/v1'."
          }
        },
        required: ["prompt", "model", "hfToken"]
      }
    },
    {
      name: "semantic_memory_node",
      description: "Stores and retrieves text memories via semantic search (requires Ollama).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["store", "retrieve"],
            description: "The action to perform: 'store' a new memory or 'retrieve' existing ones."
          },
          content: {
            type: "string",
            description: "Required for 'store' action. The text content of the memory to store."
          },
          query: {
            type: "string",
            description: "Required for 'retrieve' action. The text query for semantic search."
          },
          id: {
            type: "string",
            description: "Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated."
          },
          metadata: {
            type: "object",
            description: "Optional for 'store' action. Key-value pairs to store alongside the memory."
          },
          memoryPath: {
            type: "string",
            description: "Optional. The directory path where memories and the index are stored. Defaults to './semantic_memories'."
          },
          embeddingModel: {
            type: "string",
            description: "Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'."
          },
          embeddingBaseUrl: {
            type: "string",
            description: "Optional. The base URL of the Ollama API for embeddings. Defaults to 'http://localhost:11434'."
          },
          topK: {
            type: "number",
            description: "Optional for 'retrieve' action. The number of top similar results to retrieve. Defaults to 5."
          }
        },
        required: ["action"]
      }
    },
    {
      name: "generate_embedding",
      description: "Generates vector embeddings for text (requires Ollama).",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text string to generate an embedding for."
          },
          model: {
            type: "string",
            description: "Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'."
          },
          baseUrl: {
            type: "string",
            description: "Optional. The base URL of the Ollama API (e.g., 'http://localhost:11434'). Defaults to 'http://localhost:11434'."
          }
        },
        required: ["text"]
      }
    },
    {
      name: "transform_node",
      description: "Transforms data using a JavaScript function.",
      parameters: {
        type: "object",
        properties: {
          input: {
            type: "object", // Can be any type of data
            description: "The data to be transformed."
          },
          transformFunction: {
            type: "string",
            description: "A JavaScript function string (e.g., '(data) => data.map(item => item.name)') that takes 'data' as an argument and returns the transformed result."
          }
        },
        required: ["input", "transformFunction"]
      }
    },
    {
      name: "memory_node",
      description: "Stores and retrieves text memories (keyword-based).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["store", "retrieve"],
            description: "The action to perform: 'store' a new memory or 'retrieve' existing ones."
          },
          content: {
            type: "string",
            description: "Required for 'store' action. The text content of the memory to store."
          },
          query: {
            type: "string",
            description: "Required for 'retrieve' action. Keywords to search for within stored memories."
          },
          id: {
            type: "string",
            description: "Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated."
          },
          memoryPath: {
            type: "string",
            description: "Optional. The directory path where memories are stored. Defaults to './agent_memories'."
          }
        },
        required: ["action"]
      }
    },
    {
      name: "llm_reasoning",
      description: "Generates human-like text, reasons, and plans. Not for external actions.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt or question to send to the language model."
          }
        },
        required: ["prompt"]
      }
    },
    
    {
      name: "openrouter_llm_reasoning",
      description: "Generates human-like text, reasons, and plans via OpenRouter. Not for external actions.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt or question to send to the language model."
          },
          model: {
            type: "string",
            description: "The OpenRouter model ID (e.g., 'openai/gpt-4o', 'mistralai/mistral-7b-instruct')."
          },
          apiKey: {
            type: "string",
            description: "Your OpenRouter API key."
          },
          siteUrl: {
            type: "string",
            description: "Optional. Site URL for rankings on openrouter.ai."
          },
          siteTitle: {
            type: "string",
            description: "Optional. Site title for rankings on openrouter.ai."
          }
        },
        required: ["prompt", "model", "apiKey"]
      }
    },
    {
      name: "ollama_llm_reasoning",
      description: "Generates human-like text, reasons, and plans locally via Ollama. Not for external actions.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt or question to send to the local Ollama language model."
          },
          model: {
            type: "string",
            description: "The Ollama model name to use (e.g., 'llama2', 'gemma:2b'). Defaults to 'llama2'."
          },
          baseUrl: {
            type: "string",
            description: "The base URL of the Ollama API (e.g., 'http://localhost:11434'). Defaults to 'http://localhost:11434'."
          }
        },
        required: ["prompt"]
      }
    },
    {
      name: "data_extractor",
      description: "Extracts structured data from HTML, JSON, or text.",
      parameters: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "The content string from which to extract data."
          },
          type: {
            type: "string",
            enum: ["html", "json", "text"],
            description: "The type of content to extract from (html, json, or text)."
          },
          selector: {
            type: "string",
            description: "Required for 'html' type. A CSS selector to target elements."
          },
          jsonPath: {
            type: "string",
            description: "Required for 'json' type. A dot-notation path to extract data (e.g., 'data.items[0].name')."
          },
          regex: {
            type: "string",
            description: "Required for 'text' type. A regular expression to match and extract data."
          },
          group: {
            type: "number",
            description: "Optional for 'text' type. The capturing group index to return from the regex match."
          }
        },
        required: ["input", "type"]
      }
    },
    {
      name: "pdf_processor",
      description: "Extracts text or images from PDF documents.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the PDF file."
          },
          action: {
            type: "string",
            enum: ["extract_text", "extract_images"],
            description: "The action to perform: 'extract_text' or 'extract_images'."
          },
          outputDir: {
            type: "string",
            description: "Optional. Directory to save extracted files. If not provided, a temporary directory will be used."
          },
          pageRange: {
            type: "object",
            properties: {
              start: { type: "number" },
              end: { type: "number" }
            },
            description: "Optional. Page range to process (e.g., {start: 1, end: 5})."
          },
          password: {
            type: "string",
            description: "Optional. Password for encrypted PDFs."
          }
        },
        required: ["filePath", "action"]
      }
    },
    {
      name: "gis",
      description: "Performs Geographic Information System (GIS) operations like geocoding and reverse geocoding.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["geocode", "reverseGeocode"],
            description: "The GIS operation to perform: 'geocode' (address to coordinates) or 'reverseGeocode' (coordinates to address)."
          },
          provider: {
            type: "string",
            enum: ["google", "openstreetmap"],
            default: "openstreetmap",
            description: "The GIS service provider to use. Defaults to 'openstreetmap' (free, open-source)."
          },
          params: {
            type: "object",
            description: "Parameters specific to the operation. For 'geocode', requires { address: string }. For 'reverseGeocode', requires { lat: number, lng: number }."
          }
        },
        required: ["operation", "params"]
      }
    },
    {
      name: "display_image",
      description: "Displays an image file using the system's default image viewer.",
      parameters: {
        type: "object",
        properties: {
          imagePath: {
            type: "string",
            description: "The absolute path to the image file to display."
          }
        },
        required: ["imagePath"]
      }
    },
    {
      name: "hardware_interaction",
      description: "Communicates with local hardware via serial port (UART).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["write", "read_line", "list_ports"],
            description: "The action to perform: 'write' data, 'read_line' from port, or 'list_ports' available."
          },
          portPath: {
            type: "string",
            description: "Required for 'write'/'read_line'. The path to the serial port (e.g., '/dev/ttyUSB0', 'COM1')."
          },
          baudRate: {
            type: "number",
            description: "Optional. The baud rate for serial communication. Defaults to 9600."
          },
          dataToWrite: {
            type: "string",
            description: "Required for 'write'. The data string to send to the serial port."
          },
          timeout: {
            type: "number",
            description: "Optional. Timeout in milliseconds for 'read_line' action. Defaults to 5000."
          }
        },
        required: ["action"]
      }
    },
    {
      name: "webhook",
      description: "Exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.",
      parameters: {
        type: "object",
        properties: {
          port: {
            type: "number",
            description: "Optional. The port number to listen on. Defaults to 3000."
          },
          path: {
            type: "string",
            description: "Optional. The URL path for the webhook endpoint. Defaults to '/webhook'."
          },
          flow: {
            type: "string", // This will be the name of a flow in the flowRegistry
            description: "The name of the qflow AsyncFlow instance to trigger when a webhook is received."
          },
          sharedSecret: {
            type: "string",
            description: "Optional. A shared secret for HMAC verification of incoming webhooks."
          },
          responseStatus: {
            type: "number",
            description: "Optional. The HTTP status code to send back to the webhook sender. Defaults to 200."
          },
          responseBody: {
            type: "object",
            description: "Optional. The JSON body to send back to the webhook sender. Defaults to { status: 'received' }."
          }
        },
        required: ["flow"]
      }
    },
    {
      name: "scheduler",
      description: "Schedules qflow flows for future or recurring execution using cron syntax or a delay.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["start", "stop"],
            description: "The action to perform: 'start' a new schedule or 'stop' an existing one."
          },
          schedule: {
            type: ["string", "number"],
            description: "Required for 'start'. A cron string (e.g., '0 3 * * *') or a number in milliseconds for a one-time delay."
          },
          flow: {
            type: "string", // This will be the name of a flow in the flowRegistry
            description: "Required for 'start'. The name of the qflow AsyncFlow instance to trigger."
          },
          flowParams: {
            type: "object",
            description: "Optional. Parameters (shared object) to pass to the triggered flow's runAsync."
          },
          id: {
            type: "string",
            description: "Optional. A unique ID for the scheduled task (required for 'stop' action). If not provided for 'start', a random one will be generated."
          }
        },
        required: ["action"]
      }
    },
    {
      name: "image_gallery",
      description: "Generates an HTML gallery from multiple image files and opens it in a web browser.",
      parameters: {
        type: "object",
        properties: {
          imagePaths: {
            type: "array",
            items: { type: "string" },
            description: "An array of absolute paths to the image files to display in the gallery."
          },
          title: {
            type: "string",
            description: "Optional. The title of the HTML gallery page. Defaults to 'Image Gallery'."
          },
          description: {
            type: "string",
            description: "Optional. A short description to display on the gallery page. Defaults to 'Generated by QFlow Agent'."
          },
          outputDir: {
            type: "string",
            description: "Optional. Directory to save the generated HTML file and copied images. Defaults to a temporary directory."
          }
        },
        required: ["imagePaths"]
      }
    },
    {
      name: "speech_synthesis",
      description: "Converts text to spoken audio using OS capabilities or cloud APIs.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to convert to speech."
          },
          provider: {
            type: "string",
            enum: ["macos", "linux", "windows", "google"],
            description: "Optional. The speech synthesis provider to use. Defaults to OS-specific. 'google' requires GOOGLE_TTS_API_KEY."
          },
          voice: {
            type: "string",
            description: "Optional. The specific voice to use (e.g., 'Alex' for macOS, 'en-us' for espeak, 'en-US-Wavenet-D' for Google)."
          },
          outputFilePath: {
            type: "string",
            description: "Optional. If provided, saves the audio to this file path instead of playing it directly."
          }
        },
        required: ["text"]
      }
    },
    {
      name: "multimedia_processing",
      description: "Performs various multimedia operations on audio and video files using ffmpeg.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["convert", "trim", "extract_audio", "extract_frame", "custom"],
            description: "The multimedia operation to perform."
          },
          inputPath: {
            type: "string",
            description: "Path to the input multimedia file."
          },
          outputPath: {
            type: "string",
            description: "Path for the output file."
          },
          format: {
            type: "string",
            description: "Required for 'convert' and 'extract_audio'. The output format (e.g., 'mp4', 'mp3', 'gif', 'wav')."
          },
          startTime: {
            type: "string",
            description: "Required for 'trim'. Start time in HH:MM:SS or seconds (e.g., '00:00:10', '10')."
          },
          duration: {
            type: "string",
            description: "Required for 'trim'. Duration in HH:MM:SS or seconds (e.g., '00:00:05', '5')."
          },
          resolution: {
            type: "string",
            description: "Optional for video 'convert'. Resolution (e.g., '1280x720')."
          },
          frameTime: {
            type: "string",
            description: "Required for 'extract_frame'. Time to extract frame from in HH:MM:SS or seconds (e.g., '00:00:05')."
          },
          ffmpegArgs: {
            type: "string",
            description: "Required for 'custom'. Raw ffmpeg arguments to execute directly."
          }
        },
        required: ["action", "inputPath", "outputPath"]
      }
    },
    {
      name: "remote_execution",
      description: "Executes commands on remote machines via SSH.",
      parameters: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "The hostname or IP address of the remote machine."
          },
          port: {
            type: "number",
            description: "Optional. The SSH port. Defaults to 22."
          },
          username: {
            type: "string",
            description: "The username for SSH authentication."
          },
          password: {
            type: "string",
            description: "Optional. The password for SSH authentication (use with caution, prefer privateKey)."
          },
          privateKey: {
            type: "string",
            description: "Optional. The content of the private SSH key or its absolute path."
          },
          passphrase: {
            type: "string",
            description: "Optional. The passphrase for an encrypted private key."
          },
          action: {
            type: "string",
            enum: ["execute_command"],
            description: "The action to perform. Currently only 'execute_command' is supported."
          },
          command: {
            type: "string",
            description: "The command string to execute on the remote machine."
          },
          timeout: {
            type: "number",
            description: "Optional. Timeout in milliseconds for the command execution. Defaults to 30000 (30 seconds)."
          }
        },
        required: ["host", "username", "action", "command"]
      }
    },
    {
      name: "data_validation",
      description: "Validates structured data against a JSON Schema.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "object", // Can be any JSON-compatible type
            description: "The data to be validated."
          },
          schema: {
            type: "object",
            description: "The JSON Schema object directly."
          },
          schemaPath: {
            type: "string",
            description: "Optional. Path to a JSON Schema file. If provided, 'schema' parameter is ignored."
          },
          action: {
            type: "string",
            enum: ["validate"],
            description: "The action to perform. Currently only 'validate' is supported."
          }
        },
        required: ["data"]
      }
    },
    {
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
    },
    {
      name: "code_interpreter",
      description: "Executes Python code (requires user confirmation).",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The Python code snippet to execute."
          },
          timeout: {
            type: "number",
            description: "Optional. Maximum execution time in milliseconds. Defaults to 30000 (30 seconds)."
          },
          args: {
            type: "array",
            items: { type: "string" },
            description: "Optional. Command-line arguments to pass to the script."
          },
          requireConfirmation: {
            type: "boolean",
            description: "Optional. If true, the user will be prompted for confirmation before executing the code. Defaults to true."
          }
        },
        required: ["code"]
      }
    },
    {
      name: "duckduckgo_search",
      description: "Performs web searches via DuckDuckGo.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query."
          }
        },
        required: ["query"]
      }
    },
    {
      name: "google_search",
      description: "Performs web searches via Google Custom Search (requires API key).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query."
          },
          apiKey: {
            type: "string",
            description: "Your Google API Key."
          },
          cseId: {
            type: "string",
            description: "Your Custom Search Engine ID."
          }
        },
        required: ["query", "apiKey", "cseId"]
      }
    },
    {
      name: "shell_command",
      description: "Executes shell commands.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The full shell command to execute (e.g., 'ls -l', 'npm install cheerio')."
          }
        },
        required: ["command"]
      }
    },
    {
      name: "read_file",
      description: "Reads file content.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the file to read."
          }
        },
        required: ["filePath"]
      }
    },
    {
      name: "write_file",
      description: "Writes content to a file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the file to write to."
          },
          content: {
            type: "string",
            description: "The content to write to the file."
          }
        },
        required: ["filePath", "content"]
      }
    },
    {
      name: "append_file",
      description: "Appends content to a file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the file to append to."
          },
          content: {
            type: "string",
            description: "The content to append to the file."
          }
        },
        required: ["filePath", "content"]
      }
    },
    {
      name: "list_directory",
      description: "Lists directory contents.",
      parameters: {
        type: "object",
        properties: {
          directoryPath: {
            type: "string",
            description: "The absolute path to the directory to list."
          }
        },
        required: ["directoryPath"]
      }
    },
    {
      name: "http_request",
      description: "Makes HTTP requests.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the API endpoint."
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            default: "GET",
            description: "The HTTP method to use."
          },
          headers: {
            type: "object",
            description: "Custom headers for the request (key-value pairs)."
          },
          body: {
            type: "object", // Can be any type, but object is common for JSON
            description: "The request payload. If an object, it will be stringified as JSON."
          },
          auth: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["bearer", "basic"],
                description: "The type of authentication."
              },
              token: {
                type: "string",
                description: "The bearer token."
              },
              username: {
                type: "string",
                description: "The username for basic auth."
              },
              password: {
                type: "string",
                description: "The password for basic auth."
              }
            },
            description: "Authentication configuration."
          }
        },
        required: ["url"]
      }
    },
    {
      name: "web_scraper",
      description: "Fetches HTML content from a URL. Use with 'data_extractor' for specifics.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to scrape."
          }
        },
        required: ["url"]
      }
    },
    {
      name: "user_input",
      description: "Prompts user for input.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The message to display to the user."
          }
        },
        required: ["prompt"]
      }
    },
    {
      name: "interactive_input",
      description: "Prompts the user for input via a GUI popup (cross-platform).",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The message to display in the input dialog."
          },
          title: {
            type: "string",
            description: "Optional. The title of the input dialog. Defaults to 'QFlow Input'."
          },
          defaultValue: {
            type: "string",
            description: "Optional. The default value to pre-fill in the input field."
          }
        },
        required: ["prompt"]
      }
    },
    {
      name: "system_notification",
      description: "Displays a system-level notification across OSs.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The main message content of the notification."
          },
          title: {
            type: "string",
            description: "Optional. The title of the notification. Defaults to 'QFlow Notification'."
          },
          icon: {
            type: "string",
            description: "Optional. Path to an icon file or a system icon name (Linux specific). Ignored on macOS/Windows."
          }
        },
        required: ["message"]
      }
    },
    {
      name: "sub_flow",
      description: "Executes a sub-flow.",
      parameters: {
        type: "object",
        properties: {
          flow: {
            type: "string",
            description: "The name of the flow to execute, as registered in the flow registry."
          },
          shared: {
            type: "object",
            description: "The shared object to pass to the sub-flow."
          }
        },
        required: ["flow"]
      }
    },
    {
      name: "iterator",
      description: "Iterates items, executes sub-flow for each.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "The list of items to iterate over."
          },
          flow: {
            type: "string",
            description: "The name of the flow to execute for each item, as registered in the flow registry."
          }
        },
        required: ["items", "flow"]
      }
    },
    {
      name: "browser_control",
      description: "Controls a web browser to navigate pages, interact with elements, and take screenshots.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["goto", "click", "type", "screenshot", "close"],
            description: "The browser action to perform."
          },
          url: {
            type: "string",
            description: "The URL to navigate to (for 'goto' action)."
          },
          selector: {
            type: "string",
            description: "A CSS selector to target an element (for 'click' and 'type' actions)."
          },
          text: {
            type: "string",
            description: "The text to type into an input field (for 'type' action)."
          },
          path: {
            type: "string",
            description: "The file path to save a screenshot (for 'screenshot' action)."
          }
        },
        required: ["action"]
      }
    },
    {
      name: "git",
      description: "Performs Git operations like clone, add, commit, and push.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["clone", "init", "add", "commit", "push", "pull", "status"],
            description: "The Git action to perform."
          },
          repoPath: {
            type: "string",
            description: "The local path to the repository."
          },
          remoteUrl: {
            type: "string",
            description: "The URL of the remote repository (for 'clone' action)."
          },
          files: {
            type: "array",
            items: {
              type: "string"
            },
            description: "An array of file paths to add to the staging area (for 'add' action)."
          },
          message: {
            type: "string",
            description: "The commit message (for 'commit' action)."
          },
          branch: {
            type: "string",
            description: "The branch to push to or pull from."
          },
          remote: {
            type: "string",
            description: "The name of the remote (e.g., 'origin')."
          }
        },
        required: ["action"]
      }
    },
    {
      name: "finish",
      description: "Ends agent execution, returns final output.",
      parameters: {
        type: "object",
        properties: {
          output: {
            type: "string",
            description: "A summary of the final result or the reason for stopping."
          }
        },
        required: ["output"]
      }
    }
  ];
}
