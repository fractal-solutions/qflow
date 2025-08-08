
export function getToolDefinitions() {
  return [
    {
      name: "huggingface_llm_reasoning",
      description: "A powerful language model for general reasoning, problem-solving, and generating text, using Hugging Face's OpenAI-compatible router. Use this when you need to think, plan, or generate human-like responses. Do NOT use this for external actions like searching the web or interacting with files.",
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
      description: "Stores and retrieves text-based memories using vector embeddings for semantic search. Requires a local Ollama server running an embedding model (e.g., 'nomic-embed-text').",
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
      description: "Generates a vector embedding for a given text using a local Ollama embedding model. Requires Ollama to be running.",
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
      description: "Transforms input data using a provided JavaScript function. Useful for filtering, reformatting, or combining data from other tools.",
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
      description: "Stores and retrieves text-based memories or knowledge from the agent's local file system. Useful for long-term memory and keyword-based retrieval.",
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
      description: "A powerful language model for general reasoning, problem-solving, and generating text. Use this when you need to think, plan, or generate human-like responses. Do NOT use this for external actions like searching the web or interacting with files.",
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
      description: "A powerful language model for general reasoning, problem-solving, and generating text, using OpenRouter. Use this when you need to think, plan, or generate human-like responses. Do NOT use this for external actions like searching the web or interacting with files.",
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
      description: "A powerful local language model for general reasoning, problem-solving, and generating text, running via Ollama. Use this when you need to think, plan, or generate human-like responses locally. Do NOT use this for external actions like searching the web or interacting with files.",
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
      description: "Extracts structured data from input content (HTML, JSON, or plain text) using selectors, JSON paths, or regular expressions.",
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
      name: "code_interpreter",
      description: "Executes Python code snippets in a sandboxed environment. Requires user confirmation for execution.",
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
      description: "Performs a web search using DuckDuckGo's HTML-only interface. Use this to find information on the internet when you don't have a specific URL.",
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
      description: "Performs a web search using the Google Custom Search JSON API. Requires an API key and CSE ID. Use this for more robust and reliable web searches.",
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
      description: "Executes a shell command on the local system. Use this for system interactions, running scripts, or installing packages. Be cautious with commands that modify the system.",
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
      description: "Reads the content of a specified file from the local filesystem.",
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
      description: "Writes content to a specified file in the local filesystem. Creates the file if it doesn't exist, overwrites if it does.",
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
      description: "Appends content to an existing file in the local filesystem. Creates the file if it doesn't exist.",
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
      description: "Lists the files and subdirectories within a specified directory.",
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
      description: "Makes a generic HTTP request (GET, POST, PUT, DELETE) to any URL. Can be used to interact with REST APIs.",
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
      description: "Fetches the HTML content of a given URL. Use this to get the raw content of a webpage.",
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
      description: "Prompts the user for input and waits for their response. Use this to ask the human user for clarification or approval.",
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
      description: "Iterates over a list of items and executes a sub-flow for each item.",
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
      name: "finish",
      description: "Call this tool when you have successfully achieved the goal or if you are unable to proceed further. This will end the agent's execution.",
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
