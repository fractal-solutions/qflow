import { AsyncFlow } from '../src/qflow.js';
import { DeepSeekLLMNode } from '../src/nodes/llm.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Node representing the "Apologist" personality
class ApologistNode extends DeepSeekLLMNode {
  preparePrompt(shared) {
    const { topic } = this.params;
    this.params.prompt = `You are an eloquent apologist. Your task is to defend the following topic with a concise, positive, and persuasive argument, no more than 3 sentences: "${topic}"`;
  }

  // We'll store the apologist's argument in the shared state for the next node
  postAsync(shared, prepRes, execRes) {
    shared.apologistArgument = execRes;
    return 'default'; // Signal default transition
  }
}

// Node representing the "Heretic" personality
class HereticNode extends DeepSeekLLMNode {
  preparePrompt(shared) {
    const { apologistArgument } = shared; // Get the argument from shared state

    if (!apologistArgument) {
      throw new Error("Apologist's argument is missing from shared state. Cannot critique.");
    }

    this.params.prompt = `You are a skeptical heretic. Your task is to critically analyze and briefly refute or find a flaw in the following argument, no more than 3 sentences: "${apologistArgument}"`;
  }

  // The heretic's response is the final output of this node
  postAsync(shared, prepRes, execRes) {
    shared.hereticCritique = execRes;
    return execRes; // Return the critique as the node's result
  }
}

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn(`
      *****************************************************************
      * WARNING: DeepSeek API key is not set.                         *
      * Please set the DEEPSEEK_API_KEY environment variable or       *
      * ensure it's in your .env file to run this example.            *
      *****************************************************************
    `);
    return;
  }

  console.log('--- Starting Apologist vs. Heretic LLM Workflow ---');

  const topicInput = prompt("Enter a topic for the Apologist to defend (e.g., 'The benefits of remote work', 'The necessity of art'):\nYour topic: ");

  if (!topicInput) {
    console.log("No topic provided. Exiting.");
    return;
  }

  // Initialize nodes
  const apologist = new ApologistNode();
  apologist.setParams({
    apiKey: DEEPSEEK_API_KEY,
    topic: topicInput, // Initial topic from user
    keyword: 'apologist_argument'
  });

  const heretic = new HereticNode();
  heretic.setParams({
    apiKey: DEEPSEEK_API_KEY,
    keyword: 'heretic_critique'
  });

  // Chain the nodes: Apologist -> Heretic
  apologist.next(heretic);

  // Create and run the flow
  const debateFlow = new AsyncFlow(apologist);

  try {
    // The initial shared state will be passed through the flow
    const sharedState = {};
    const finalResult = await debateFlow.runAsync(sharedState);

    console.log('\n--- The Debate Unfolds ---');
    console.log('Topic:', topicInput);
    console.log('\nApologist\'s Argument:');
    console.log(sharedState.apologistArgument); // Access from shared state

    console.log('\nHeretic\'s Critique:');
    console.log(sharedState.hereticCritique); // Access from shared state
    console.log('\n--- Workflow Finished ---');

  } catch (error) {
    console.error('\n--- Workflow Failed ---', error);
  }
})();