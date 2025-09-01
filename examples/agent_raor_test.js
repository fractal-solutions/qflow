import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import {
  AgentNode,
  UserInputNode,
  SemanticMemoryNode,
  EmbeddingNode,
  TransformNode,
  MemoryNode,
  DataExtractorNode,
  PDFProcessorNode,
  GISNode,
  DisplayImageNode,
  HardwareInteractionNode,
  SchedulerNode,
  ImageGalleryNode,
  SpeechSynthesisNode,
  MultimediaProcessingNode,
  RemoteExecutionNode,
  DataValidationNode,
  SpreadsheetNode,
  CodeInterpreterNode,
  DuckDuckGoSearchNode,
  GoogleSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  AppendFileNode,
  ListDirectoryNode,
  HttpRequestNode,
  InteractiveInputNode,
  SystemNotificationNode,
  SubFlowNode,
  IteratorNode,
  BrowserControlNode,
  DatabaseNode
} from '../src/nodes/index.js';
import { RAORAgent } from '../src/agent/raor_agent.js';
import { AgentDeepSeekLLMNode } from '../src/nodes/agent_llm.js';

// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Helper function to create available tools
function createAvailableTools() {
  return {
    semantic_memory_node: new SemanticMemoryNode(),
    generate_embedding: new EmbeddingNode(),
    transform_node: new TransformNode(),
    memory_node: new MemoryNode(),
    data_extractor: new DataExtractorNode(),
    pdf_processor: new PDFProcessorNode(),
    gis: new GISNode(),
    display_image: new DisplayImageNode(),
    hardware_interaction: new HardwareInteractionNode(),
    scheduler: new SchedulerNode(),
    image_gallery: new ImageGalleryNode(),
    speech_synthesis: new SpeechSynthesisNode(),
    multimedia_processing: new MultimediaProcessingNode(),
    remote_execution: new RemoteExecutionNode(),
    data_validation: new DataValidationNode(),
    spreadsheet: new SpreadsheetNode(),
    code_interpreter: new CodeInterpreterNode(),
    duckduckgo_search: new DuckDuckGoSearchNode(),
    google_search: new GoogleSearchNode(),
    shell_command: new ShellCommandNode(),
    read_file: new ReadFileNode(),
    write_file: new WriteFileNode(),
    append_file: new AppendFileNode(),
    list_directory: new ListDirectoryNode(),
    http_request: new HttpRequestNode(),
    user_input: new UserInputNode(),
    interactive_input: new InteractiveInputNode(),
    system_notification: new SystemNotificationNode(),
    sub_flow: new SubFlowNode(),
    iterator: new IteratorNode(),
    browser_control: new BrowserControlNode(),
    database: new DatabaseNode()
    // 'finish' tool is handled internally by the agent, no need to instantiate here
  };
}

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the Interactive Agent example.");
    return;
  }

  console.log('--- Running Interactive RAOR Agent Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 3. Create available tools
  const availableTools = createAvailableTools();

  // 4. Instantiate the agent, passing the available tools
  const agent = new RAORAgent(agentLLM, availableTools);

  // 5. Instantiate the AgentNode
  const agentNode = new AgentNode(agent);

  // 6. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agentNode);

  // 7. Create and run the flow
  const interactiveAgentFlow = new AsyncFlow(getGoalNode);

  // Modify the prepAsync of agentNode to get the goal from shared
  agentNode.prepAsync = async (shared) => {
    const goal = shared.userInput; // Assuming UserInputNode puts its output in shared.userInput
    if (!goal) {
      throw new Error("AgentNode requires a 'goal' parameter, but it was not found in shared.userInput.");
    }
    agentNode.setParams({ goal });
  };

  try {
    const finalResult = await interactiveAgentFlow.runAsync({});
    console.log('\n--- Interactive RAOR Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Interactive RAOR Agent Test Workflow Failed ---', error);
  }
})();