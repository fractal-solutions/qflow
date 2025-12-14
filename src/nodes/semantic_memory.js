import { AsyncNode, AsyncFlow } from '@/qflow.js';
import { promises as fs } from 'fs';
import path from 'path';
import { EmbeddingNode } from './embedding.js';
import { log } from '@/logger.js';

// Utility function for cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  if (magnitudeA === 0 || magnitudeB === 0) return 0; // Avoid division by zero
  return dotProduct / (magnitudeA * magnitudeB);
}

export class SemanticMemoryNode extends AsyncNode {
  static getToolDefinition() {
    return {
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
    };
  }

  constructor() {
    super();
    this.memoryIndex = {}; // In-memory index: { id: { content: string, embedding: number[], metadata: object } }
    this.indexFilePath = '';
    this.memoriesDir = '';
  }

  async execAsync() {
    const { action, content, query, id, metadata, memoryPath = './semantic_memories', embeddingModel, embeddingBaseUrl } = this.params;

    this.memoriesDir = path.resolve(memoryPath);
    this.indexFilePath = path.join(this.memoriesDir, 'index.json');

    // Ensure memories directory exists
    await fs.mkdir(this.memoriesDir, { recursive: true }).catch(() => {});

    // Load existing index
    try {
      const indexContent = await fs.readFile(this.indexFilePath, 'utf-8');
      this.memoryIndex = JSON.parse(indexContent);
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.memoryIndex = {}; // File doesn't exist, start with empty index
      } else {
        throw new Error(`Failed to load memory index: ${e.message}`);
      }
    }

    switch (action) {
      case 'store':
        if (!content) {
          throw new Error('Store action requires `content`.');
        }
        const memoryId = id || `sem_mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Generate embedding for the content
        const embedNodeStore = new EmbeddingNode();
        embedNodeStore.setParams({
          text: content,
          model: embeddingModel,
          baseUrl: embeddingBaseUrl
        });
        const embedFlowStore = new AsyncFlow(embedNodeStore);
        const embedResultStore = await embedFlowStore.runAsync({});
        const embedding = embedResultStore.embedding;

        this.memoryIndex[memoryId] = {
          content: content,
          embedding: embedding,
          metadata: metadata || {},
        };

        // Save updated index
        await fs.writeFile(this.indexFilePath, JSON.stringify(this.memoryIndex, null, 2), 'utf-8');
        log(`[SemanticMemory] Stored memory: ${memoryId}`, this.params.logging);
        return { status: 'stored', id: memoryId };

      case 'retrieve':
        if (!query) {
          throw new Error('Retrieve action requires a `query`.');
        }
        log(`[SemanticMemory] Retrieving memories for query: "${query}"...`, this.params.logging);

        if (Object.keys(this.memoryIndex).length === 0) {
          log('[SemanticMemory] No memories stored. Returning empty.', this.params.logging);
          return [];
        }

        // Generate embedding for the query
        const embedNodeRetrieve = new EmbeddingNode();
        embedNodeRetrieve.setParams({
          text: query,
          model: embeddingModel,
          baseUrl: embeddingBaseUrl
        });
        const embedFlowRetrieve = new AsyncFlow(embedNodeRetrieve);
        const embedResultRetrieve = await embedFlowRetrieve.runAsync({});
        const queryEmbedding = embedResultRetrieve.embedding;

        const similarities = [];
        for (const memId in this.memoryIndex) {
          const memory = this.memoryIndex[memId];
          const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
          similarities.push({ id: memId, content: memory.content, metadata: memory.metadata, similarity: similarity });
        }

        // Sort by similarity (descending) and return top results
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topResults = similarities.slice(0, this.params.topK || 5);

        log(`[SemanticMemory] Retrieved ${topResults.length} semantic memories.`, this.params.logging);
        return topResults;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.semanticMemoryResult = execRes;
    return 'default';
  }
}