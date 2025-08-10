import { AsyncFlow } from '../src/qflow.js';
import fs from 'fs';
import {
  AgentDeepSeekLLMNode,
  DuckDuckGoSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  AppendFileNode,
  ListDirectoryNode,
  HttpRequestNode,
  ScrapeURLNode,
  AgentNode,
  CodeInterpreterNode,
  InteractiveInputNode,
  SemanticMemoryNode,
  SchedulerNode,
  SpeechSynthesisNode,
  BrowserControlNode,
  DataExtractorNode,
  TransformNode,
  SpreadsheetNode,
  PDFProcessorNode,
  DataValidationNode,
  SubFlowNode,
  IteratorNode,
  SystemNotificationNode,
  DisplayImageNode,
  ImageGalleryNode,
  SummarizeNode,
  WebHookNode
} from '../src/nodes';

// You have the option of AgentOpenAILLMNode that can be used instead of Deepseek
// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the Interactive Agent example.");
    return;
  }

  console.log('--- Running Interactive Agent Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new InteractiveInputNode();
  getGoalNode.setParams({ 
    prompt: 'Please enter the agent\'s goal: ' ,
    title: 'Q',
    defaultValue: 'powered by QFlow'
  });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 2.1 Instantiate an LLM for summarization (can be the same as agentLLM or different)
  const summarizeLLM = new SummarizeNode();
  summarizeLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 3. Instantiate the tools the agent can use
  const duckduckgoSearch = new DuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new ReadFileNode();
  const writeFile = new WriteFileNode();
  const appendFile = new AppendFileNode();
  const listDirectory = new ListDirectoryNode();
  const httpRequest = new HttpRequestNode();
  const webScraper = new ScrapeURLNode();
  const userInput = new InteractiveInputNode(); // Agent can also ask for user input
  const codeInterpreter = new CodeInterpreterNode(); // Agent can execute code
  const semanticMemory = new SemanticMemoryNode();
  const speechSynthesis = new SpeechSynthesisNode();
  const scheduler = new SchedulerNode();
  const browserControl = new BrowserControlNode();
  const dataExtractor = new DataExtractorNode();
  const transform = new TransformNode();
  const spreadsheet = new SpreadsheetNode();
  const pdfProcessor = new PDFProcessorNode();
  const dataValidation = new DataValidationNode();
  const systemNotification = new SystemNotificationNode();
  const displayImage = new DisplayImageNode();
  const imageGallery = new ImageGalleryNode();
  const subFlow = new SubFlowNode();
  const iterator = new IteratorNode();

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    append_file: appendFile,
    list_directory: listDirectory,
    http_request: httpRequest,
    interactive_input: userInput,
    code_interpreter: codeInterpreter,
    semantic_memory: semanticMemory,
    browser_control: browserControl,
    pdf_processor: pdfProcessor,
    spreadsheet: spreadsheet,
    data_extractor: dataExtractor,
    transform: transform,
    scheduler: scheduler,
    speech_synthesis: speechSynthesis,
    data_validation: dataValidation,
    system_notification: systemNotification,
    display_image: displayImage,
    image_gallery: imageGallery,
    sub_flow: subFlow,
    iterator: iterator,
    // Add other tools as needed
  };

  // --- Define a more advanced countdown flow ---
  let factCounter = 0;
  let facts = [];

  // Define a node that reads the facts and picks one
  const factNotifierNode = new SystemNotificationNode();
  factNotifierNode.prepAsync = async (shared) => {
      // Read facts only once
      if (facts.length === 0 && shared.factSource) {
          try {
              const content = await fs.promises.readFile(shared.factSource, 'utf-8');
              facts = content.split('\n').filter(line => line.trim() !== '');
          } catch (e) {
              // File not found or other error, use a default message
              facts = ["Could not read fun facts file."];
          }
      }

      const fact = facts[factCounter % facts.length] || "All out of facts!";
      factCounter++;

      factNotifierNode.setParams({
          title: "Fun Fact Countdown",
          message: fact
      });
  };

  const countdownFlow = new AsyncFlow(factNotifierNode);

  // Register the flow so the agent can find it by name.
  const flowRegistry = {
    'nirvana_countdown': countdownFlow
  };

  // 4. Instantiate the AgentNode, passing the LLMs, tools, and the flow registry.
  const agent = new AgentNode(agentLLM, availableTools, summarizeLLM, flowRegistry);

  // After getGoalNode runs, its result (execRes) is passed to the agent's 'goal' parameter.
  getGoalNode.postAsync = async (shared, prepRes, execRes) => {
    agent.setParams({ goal: execRes });
    return 'default'; // postAsync needs to return a value for the next edge
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const interactiveAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await interactiveAgentFlow.runAsync({});
    console.log('\n--- Interactive Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Interactive Agent Test Workflow Failed ---', error);
  }
})();
