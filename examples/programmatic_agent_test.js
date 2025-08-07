import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { WriteFileNode, ReadFileNode, TransformNode } from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// A custom node that acts like an agent, but with programmatic logic instead of an LLM.
// This agent will analyze a long passage and count its paragraphs.
class ProgrammaticAgentNode extends AsyncNode {
  async execAsync() {
    const baseDir = path.join(os.tmpdir(), 'qflow_passage_analyzer_dir');
    const passageFileName = 'sample_passage.txt';

    const longPassage = `
This is the first paragraph of our sample passage.
It contains some introductory text.

This is the second paragraph.
It discusses a different topic.

And finally, the third paragraph.
It concludes the passage.
`;

    console.log(`[ProgrammaticAgent] Starting Passage Analysis Task.`);
    console.log(`[ProgrammaticAgent] Base directory: ${baseDir}`);

    // Ensure the base directory exists
    await fs.mkdir(baseDir, { recursive: true }).catch(() => {}); // Ignore if exists

    // --- Define the workflow nodes ---
    const writePassageNode = new WriteFileNode();
    writePassageNode.setParams({
      filePath: path.join(baseDir, passageFileName),
      content: longPassage
    });
    writePassageNode.postAsync = async (shared, prepRes, execRes) => {
      console.log(`[ProgrammaticAgent] Passage written.`);
      shared.passageWritten = true; // Indicate success
      return 'default';
    };

    const readPassageNode = new ReadFileNode();
    readPassageNode.setParams({ filePath: path.join(baseDir, passageFileName) });
    readPassageNode.postAsync = async (shared, prepRes, execRes) => {
      console.log(`[ProgrammaticAgent] Content read (first 50 chars): "${execRes.substring(0, 50)}..."`);
      shared.passageContent = execRes; // Store content in shared state
      return 'default';
    };

    const countParagraphsNode = new TransformNode();
    // The input for TransformNode will come from shared.passageContent via prepAsync
    countParagraphsNode.prepAsync = async (shared) => {
      if (!shared.passageContent) {
        throw new Error('Passage content not found in shared state for paragraph counting.');
      }
      countParagraphsNode.setParams({
        input: shared.passageContent,
        transformFunction: '(data) => data.split(/\\n\\s*\\n+/).filter(p => p.trim() !== \'\').length'
      });
    };
    countParagraphsNode.postAsync = async (shared, prepRes, execRes) => {
      console.log(`[ProgrammaticAgent] Paragraph count: ${execRes}`);
      shared.paragraphCount = execRes; // Store final count in shared state
      return 'default';
    };

    // --- Chain the nodes ---
    writePassageNode.next(readPassageNode);
    readPassageNode.next(countParagraphsNode);

    // --- Run the single flow ---
    const flow = new AsyncFlow(writePassageNode);
    const sharedState = {}; // Initialize shared state for the flow
    try {
      await flow.runAsync(sharedState);
      console.log('\n--- Programmatic Agent Test Workflow Finished ---');
      console.log('Final Result:', sharedState);
      if (sharedState.passageWritten && sharedState.paragraphCount > 0) {
        console.log('Test Passed: Programmatic agent completed its task successfully.');
      } else {
        console.error('Test Failed: Programmatic agent did not complete its task as expected.');
      }
    } catch (error) {
      console.error('\n--- Programmatic Agent Test Workflow Failed ---', error);
    } finally {
      // Clean up temporary directory and files (optional, but good practice)
      try {
        console.log(`[ProgrammaticAgent] Cleaning up temporary directory: ${baseDir}`);
        await fs.rm(baseDir, { recursive: true, force: true });
        console.log(`[ProgrammaticAgent] Cleaned up.`);
      } catch (e) {
        console.warn(`[ProgrammaticAgent] Could not clean up ${baseDir}:`, e.message);
      }
    }

    return { status: 'completed', paragraphCount: sharedState.paragraphCount, outputDirectory: baseDir };
  }

  async postAsync(shared, prepRes, execRes) {
    // This postAsync is for the ProgrammaticAgentNode itself, not the internal flow
    shared.programmaticAgentResult = execRes;
    return 'default';
  }
}

(async () => {
  console.log('--- Running Programmatic Agent Test Workflow ---');

  const agentNode = new ProgrammaticAgentNode();
  const flow = new AsyncFlow(agentNode);

  try {
    const result = await flow.runAsync({});
    console.log('\n--- Programmatic Agent Test Workflow Finished ---');
    console.log('Final Result:', result);
    if (result.status === 'completed' && result.paragraphCount > 0) {
      console.log('Test Passed: Programmatic agent completed its task successfully.');
    } else {
      console.error('Test Failed: Programmatic agent did not complete its task as expected.');
    }
  } catch (error) {
    console.error('\n--- Programmatic Agent Test Workflow Failed ---', error);
  }
})();
