import { AsyncNode, AsyncFlow } from './qflow.js';
import { file } from 'bun';

// --- Configuration ---
// IMPORTANT: Replace with your actual DeepSeek API key
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "YOUR_DEEPSEEK_API_KEY_HERE";

// --- Reusable LLM Node for DeepSeek ---

class DeepSeekLLMNode extends AsyncNode {
  constructor(maxRetries = 3, wait = 2) {
    super(maxRetries, wait);
  }

  // This will be implemented by subclasses
  preparePrompt() {
    throw new Error("preparePrompt must be implemented by subclasses");
  }

  async execAsync() {
    this.preparePrompt(); // Set the prompt
    const { prompt, keyword } = this.params;

    if (!prompt) {
      throw new Error("Prompt was not generated.");
    }
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === "YOUR_DEEPSEEK_API_KEY_HERE") {
      throw new Error("DeepSeek API Key is not configured.");
    }

    console.log(`[DeepSeek] Sending prompt for \"${keyword}\"...`);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
      throw new Error('Invalid response structure from DeepSeek API.');
    }
    
    const llmResponse = data.choices[0].message.content.trim();
    console.log(`[DeepSeek] Received response for \"${keyword}\".`);
    return llmResponse; // Return the actual content
  }
}


// --- Workflow Step Nodes (Simplified for single pipeline instance) ---

// 1. Generate an article outline
class GenerateOutlineNode extends DeepSeekLLMNode {
  preparePrompt() {
    const { keyword } = this.params;
    this.params.prompt = `Create a comprehensive, SEO-optimized article outline for the keyword \"${keyword}\". Respond with only the markdown-formatted outline.`;
  }
  async postAsync(shared, prepRes, execRes) {
    this.params.outline = execRes; // Pass outline to the next node
    return 'default';
  }
}

// 2. Generate the full article content based on the outline
class GenerateContentNode extends DeepSeekLLMNode {
  preparePrompt() {
    const { keyword, outline } = this.params;
    this.params.prompt = `You are an expert blog writer. Using the following outline, write a complete, high-quality article for the keyword \"${keyword}\".\n\n**Outline:**\n${outline}\n\nRespond with only the full article content in Markdown format.`;
  }
  async postAsync(shared, prepRes, execRes) {
    this.params.articleContent = execRes; // Pass content to the next node
    return 'default';
  }
}

// 3. Review, edit, and format the final article
class FinalReviewNode extends DeepSeekLLMNode {
  preparePrompt() {
    const { keyword, articleContent } = this.params;
    this.params.prompt = `Perform a final review of the following article on \"${keyword}\". Check for grammar, clarity, and flow. Make any necessary corrections and return only the final, polished article in Markdown format.\n\n**Article:**\n${articleContent}`;
  }
  async postAsync(shared, prepRes, execRes) {
    this.params.finalArticle = execRes; // Pass final article to the next node
    return 'default';
  }
}

// 4. Save the final article to a file
class SaveArticleNode extends AsyncNode {
  async execAsync() {
    const { keyword, finalArticle } = this.params;
    if (typeof finalArticle !== 'string' || !finalArticle) {
      console.error(`[SaveArticle] Final article for \"${keyword}\" is missing or invalid. Skipping save.`);
      return 'error';
    }
    const fileName = `${keyword.replace(/\s+/g, '_').toLowerCase()}.md`;
    const filePath = `./articles/${fileName}`;
    
    console.log(`[SaveArticle] Saving final article to: ${filePath}`);
    await Bun.spawn(["mkdir", "-p", "./articles"]).exited;
    await file(filePath).writer().write(finalArticle);
    console.log(`[SaveArticle] Successfully saved article for keyword: \"${keyword}\"`);
    return 'default';
  }
}

// --- Pipeline Factory ---

function createSeoArticlePipeline() {
  // Create fresh instances for each pipeline
  const outlineNode = new GenerateOutlineNode();
  const contentNode = new GenerateContentNode();
  const reviewNode = new FinalReviewNode();
  const saveNode = new SaveArticleNode();

  // Define the sequence of the workflow
  outlineNode.next(contentNode);
  contentNode.next(reviewNode);
  reviewNode.next(saveNode);

  // Return a new flow instance starting with the first node
  return new AsyncFlow(outlineNode);
}


// --- Run the Workflow ---

(async () => {
  if (DEEPSEEK_API_KEY === "YOUR_DEEPSEEK_API_KEY_HERE") {
    console.warn(`\n      *****************************************************************\n      * WARNING: DeepSeek API key is not set.                         *\n      * Please replace \"YOUR_DEEPSEEK_API_KEY_HERE\" in test4.js or    *\n      * set the DEEPSEEK_API_KEY environment variable to run the flow.*\n      *****************************************************************\n    `);
    return;
  }

  console.log('--- Starting the Automated SEO Content Pipeline ---');
  
  let keywords = [];
  try {
    const keywordsText = await file('keywords.txt').text();
    keywords = keywordsText.split('\n').filter(k => k.trim() !== '');
    console.log(`[Pipeline] Found ${keywords.length} keywords.`);
  } catch (error) {
    console.error("Error reading keywords.txt. Please ensure the file exists.", error);
    return;
  }

  const pipelinePromises = keywords.map(keyword => {
    console.log(`[Pipeline] Creating and starting pipeline for: \"${keyword}\"`);
    const pipeline = createSeoArticlePipeline();
    // The `_orchAsync` method is used to pass initial parameters to the flow.
    // It's an internal method, but necessary for this pattern.
    return pipeline._orchAsync({}, { keyword });
  });

  try {
    await Promise.all(pipelinePromises);
    console.log('\n--- SEO Content Pipeline Finished ---');
    console.log(`Successfully processed all keywords.`);
  } catch (error) {
    console.error('\n--- A pipeline failed during execution ---', error);
  }
})();