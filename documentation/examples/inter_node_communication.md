### 7. Inter-Node Communication with Shared State (Advanced Example)

Demonstrates how to pass data between nodes using the `shared` object, particularly important in asynchronous workflows. This example showcases two LLM nodes interacting, where the output of the first influences the input of the second.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';

// Node representing the "Apologist" personality
class ApologistNode extends DeepSeekLLMNode {
  // preparePrompt now receives the shared object
  preparePrompt(shared) {
    const { topic } = this.params;
    this.params.prompt = `You are an eloquent apologist. Your task is to defend the following topic with a concise, positive, and persuasive argument, no more than 3 sentences: "${topic}"`;
  }

  // postAsync is used to ensure shared state is updated after async execution
  async postAsync(shared, prepRes, execRes) {
    shared.apologistArgument = execRes; // Store the argument in shared state
    return 'default'; // Signal default transition
  }
}

// Node representing the "Heretic" personality
class HereticNode extends DeepSeekLLMNode {
  // preparePrompt now receives the shared object
  preparePrompt(shared) {
    const { apologistArgument } = shared; // Access the argument from shared state

    if (!apologistArgument) {
      throw new Error("Apologist's argument is missing from shared state. Cannot critique.");
    }

    this.params.prompt = `You are a skeptical heretic. Your task is to critically analyze and briefly refute or find a flaw in the following argument, no more than 3 sentences: "${apologistArgument}"`;
  }

  // postAsync is used to ensure shared state is updated after async execution
  async postAsync(shared, prepRes, execRes) {
    shared.hereticCritique = execRes; // Store the critique in shared state
    return execRes; // Return the critique as the node's result
  }
}

(async () => {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // Ensure this is set in .env or env vars

  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DeepSeek API key is not set. Please configure it to run this example.");
    return;
  }

  console.log('--- Starting Apologist vs. Heretic LLM Workflow ---');

  const topicInput = prompt("Enter a topic for the Apologist to defend (e.g., 'The benefits of remote work'):\nYour topic: ");

  if (!topicInput) {
    console.log("No topic provided. Exiting.");
    return;
  }

  const apologist = new ApologistNode();
apologist.setParams({ apiKey: DEEPSEEK_API_KEY, topic: topicInput });

  const heretic = new HereticNode();
heretic.setParams({ apiKey: DEEPSEEK_API_KEY });

apologist.next(heretic);

  const debateFlow = new AsyncFlow(apologist);

  try {
    const sharedState = {}; // Initialize an empty shared state object
    await debateFlow.runAsync(sharedState); // Run the flow, passing the shared state

    console.log('\n--- The Debate Unfolds ---');
    console.log('Topic:', topicInput);
    console.log('\nApologist\'s Argument:');
    console.log(sharedState.apologistArgument);
    console.log('\nHeretic\'s Critique:');
    console.log(sharedState.hereticCritique);
    console.log('\n--- Workflow Finished ---');

  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();

```
```