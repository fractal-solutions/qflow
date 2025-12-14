import { CodeInterpreterNode } from '../nodes/code_interpreter.js';
import { DataExtractorNode } from '../nodes/data_extractor.js';
import { DatabaseNode } from '../nodes/database.js';
import { EmbeddingNode } from '../nodes/embedding.js';
import { GISNode } from '../nodes/gis.js';
import { MemoryNode } from '../nodes/memory.js';
import { SemanticMemoryNode } from '../nodes/semantic_memory.js';
import { TransformNode } from '../nodes/transform.js';
import { PDFProcessorNode } from '../nodes/pdf_processor.js';
import { SpreadsheetNode } from '../nodes/spreadsheet.js';
import { DataValidationNode } from '../nodes/data_validation.js';
import { ShellCommandNode } from '../nodes/shell.js';
import { ReadFileNode, WriteFileNode, AppendFileNode, ListDirectoryNode } from '../nodes/filesystem.js';
import { DisplayImageNode } from '../nodes/display_image.js';
import { HardwareInteractionNode } from '../nodes/hardware_interaction.js';
import { ImageGalleryNode } from '../nodes/image_gallery.js';
import { SpeechSynthesisNode } from '../nodes/speech_synthesis.js';
import { MultimediaProcessingNode } from '../nodes/multimedia_processing.js';
import { RemoteExecutionNode } from '../nodes/remote_execution.js';
import { HttpRequestNode } from '../nodes/http.js';
import { ScrapeURLNode } from '../nodes/webscraper.js';
import { DuckDuckGoSearchNode, GoogleSearchNode } from '../nodes/search.js';
import { BrowserControlNode } from '../nodes/browser_control.js';
import { WebSocketsNode } from '../nodes/websockets.js';
import { WebHookNode } from '../nodes/webhook.js';
import { UserInputNode } from '../nodes/user.js';
import { InteractiveInputNode } from '../nodes/interactive_input.js';
import { SchedulerNode } from '../nodes/scheduler.js';
import { SubFlowNode } from '../nodes/subflow.js';
import { IteratorNode } from '../nodes/iterator.js';
import { GitNode } from '../nodes/git.js';
import { HuggingFaceLLMNode, OllamaLLMNode, DeepSeekLLMNode, OpenAILLMNode, GeminiLLMNode } from '../nodes/llm.js';
import { OpenRouterLLMNode } from '../nodes/openrouter_llm.js';
import { CreateIssueNode, GetIssueNode } from '../nodes/github.js';
import { GetTopStoriesNode, GetItemNode } from '../nodes/hackernews.js';
import { CreateChargeNode, GetBalanceNode } from '../nodes/stripe.js';
import { SummarizeNode } from '../nodes/summarize.js';
import { HttpServerNode } from '../nodes/http_server.js';
import { InteractiveWebviewNode } from '../nodes/interactive_webview.js';
import { WebviewNode } from '../nodes/webview.js';
import qflowConfig from '../qflow.config.js'; // Import the config file
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../'); // Adjust based on actual project structure

const coreToolClasses = [
  CodeInterpreterNode,
  DataExtractorNode,
  DatabaseNode,
  EmbeddingNode,
  GISNode,
  MemoryNode,
  SemanticMemoryNode,
  TransformNode,
  PDFProcessorNode,
  SpreadsheetNode,
  DataValidationNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  AppendFileNode,
  ListDirectoryNode,
  DisplayImageNode,
  HardwareInteractionNode,
  ImageGalleryNode,
  SpeechSynthesisNode,
  MultimediaProcessingNode,
  RemoteExecutionNode,
  HttpRequestNode,
  ScrapeURLNode,
  DuckDuckGoSearchNode,
  GoogleSearchNode,
  BrowserControlNode,
  WebSocketsNode,
  WebHookNode,
  UserInputNode,
  InteractiveInputNode,
  SchedulerNode,
  SubFlowNode,
  IteratorNode,
  GitNode,
  HuggingFaceLLMNode,
  OllamaLLMNode,
  OpenRouterLLMNode,
  DeepSeekLLMNode,
  OpenAILLMNode,
  GeminiLLMNode,
  CreateIssueNode,
  GetIssueNode,
  GetTopStoriesNode,
  GetItemNode,
  CreateChargeNode,
  GetBalanceNode,
  SummarizeNode,
  HttpServerNode,
  InteractiveWebviewNode,
  WebviewNode,
];

let customToolClasses = [];

// Dynamically import custom nodes from qflow.config.js
if (qflowConfig.customNodePaths && qflowConfig.customNodePaths.length > 0) {
  for (const nodePath of qflowConfig.customNodePaths) {
    try {
      // Resolve the path relative to the project root
      const absolutePath = path.resolve(projectRoot, nodePath);
      // Dynamic import
      const module = await import(absolutePath);
      // Assuming the node class is the default export or a named export
      // This might need refinement based on how users export their nodes
      for (const key in module) {
        const ExportedClass = module[key];
        if (typeof ExportedClass === 'function' && ExportedClass.prototype instanceof AsyncNode && typeof ExportedClass.getToolDefinition === 'function') {
          customToolClasses.push(ExportedClass);
        }
      }
    } catch (error) {
      console.error(`Failed to load custom node from ${nodePath}:`, error);
    }
  }
}

export function getToolDefinitions() {
  const definitions = [];
  const allToolClasses = [...coreToolClasses, ...customToolClasses];

  for (const ToolClass of allToolClasses) {
    if (typeof ToolClass.getToolDefinition === 'function') {
      definitions.push(ToolClass.getToolDefinition());
    }
  }

  // Add special tools that don't directly map to a node
  definitions.push({
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
  });

  return definitions;
}
