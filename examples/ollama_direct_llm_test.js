import { AsyncFlow } from '@fractal-solutions/qflow';
import {
  OllamaLLMNode
} from '@fractal-solutions/qflow/nodes';

// Configuration for Ollama
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma:2b'; // Use gemma:2b as a common small model

(async () => {
  console.log('--- Running Direct OllamaLLMNode Test Workflow ---');

  const ollamaDirectLLM = new OllamaLLMNode();
  ollamaDirectLLM.setParams({
    prompt: 'Tell me a short, funny story about a cat.',
    model: OLLAMA_MODEL,
    baseUrl: OLLAMA_BASE_URL
  });

  ollamaDirectLLM.postAsync = async (shared, prepRes, execRes) => {
    console.log('Ollama Direct LLM Response:', execRes);
    return 'default';
  };

  const directFlow = new AsyncFlow(ollamaDirectLLM);
  try {
    await directFlow.runAsync({});
    console.log('\n--- Direct OllamaLLMNode Test Workflow Finished ---');
  } catch (error) {
    console.error('\n--- Direct OllamaLLMNode Flow Failed ---', error);
  }
})();
