import { AsyncNode } from '../qflow.js';

export class EmbeddingNode extends AsyncNode {
  constructor(maxRetries = 3, wait = 2) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const { text, model = 'nomic-embed-text', baseUrl = 'http://localhost:11434' } = this.params;

    if (!text) {
      throw new Error('EmbeddingNode requires a `text` parameter to embed.');
    }

    const url = `${baseUrl}/api/embeddings`;
    const payload = {
      model: model,
      prompt: text,
    };

    console.log(`[EmbeddingNode] Generating embedding for text (model: ${model}) at ${baseUrl}...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embedding API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.embedding) {
        throw new Error('Ollama embedding API response missing embedding.');
      }

      console.log(`[EmbeddingNode] Embedding generated successfully.`);
      return { embedding: data.embedding };

    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.embeddingResult = execRes.embedding; // Store the embedding array directly
    return 'default';
  }
}