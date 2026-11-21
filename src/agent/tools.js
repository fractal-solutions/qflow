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
import { NavigatorNode } from '../nodes/navigator.js';
import qflowConfig from '../../qflow.config.js';
import { AsyncNode } from '../qflow.js';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '../..');

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
  NavigatorNode,
];

let customToolClasses = [];

// Prefer the consuming project's config. The package-local config is only a fallback.
let customNodePaths = Array.isArray(qflowConfig.customNodePaths) ? [...qflowConfig.customNodePaths] : [];

for (const configFile of ['qflow.config.js', 'qflow.config.ts']) {
  const configPath = path.resolve(process.cwd(), configFile);
  if (configPath === path.resolve(packageRoot, 'qflow.config.js')) continue;
  if (!existsSync(configPath)) continue;

  try {
    const userConfig = (await import(pathToFileURL(configPath).href)).default;
    if (Array.isArray(userConfig?.customNodePaths)) {
      customNodePaths = userConfig.customNodePaths.map(p => path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));
      break;
    }
  } catch (error) {
    console.warn(`[qflow] Could not load ${configFile}: ${error.message}`);
  }
}

for (const absolutePath of customNodePaths) {
  try {
    const module = await import(pathToFileURL(absolutePath).href);
    for (const key in module) {
      const ExportedClass = module[key];
      if (typeof ExportedClass === 'function' &&
          ExportedClass.prototype instanceof AsyncNode &&
          typeof ExportedClass.getToolDefinition === 'function' &&
          !customToolClasses.includes(ExportedClass)) {
        customToolClasses.push(ExportedClass);
      }
    }
  } catch (error) {
    console.warn(`[qflow] Failed to load custom node from ${absolutePath}: ${error.message}`);
  }
}

export function getToolClasses() {
  return [...coreToolClasses, ...customToolClasses];
}

export function getToolDefinitions() {
  const definitions = [];
  const allToolClasses = getToolClasses();

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
