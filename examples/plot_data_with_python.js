import { AsyncFlow } from '../src/qflow.js';
import { CodeInterpreterNode, WriteFileNode } from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {
  console.log('--- Running Plot Data with Python CodeInterpreter Example ---');

  // 1. Define sample data
  const dataToPlot = {
    x: [1, 2, 3, 4, 5],
    y: [2, 4, 5, 4, 6]
  };

  // Define temporary file paths
  const tempDir = os.tmpdir();
  const dataFileName = `plot_data_${Date.now()}.json`;
  const plotFileName = `sample_plot_${Date.now()}.png`;
  const dataFilePath = path.join(tempDir, dataFileName);
  const plotFilePath = path.join(tempDir, plotFileName);

  // 2. Python script for plotting
  const pythonPlotScript = `
import matplotlib.pyplot as plt
import json
import sys

# Get data file path and output plot path from command line arguments
data_file_path = sys.argv[1]
output_plot_path = sys.argv[2]

# Read data from the specified JSON file
with open(data_file_path, 'r') as f:
    data = json.load(f)

x_data = data['x']
y_data = data['y']

# Create the plot
plt.figure(figsize=(8, 6))
plt.plot(x_data, y_data, marker='o', linestyle='-', color='b')
plt.title('Sample Data Plot')
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.grid(True)

# Save the plot
plt.savefig(output_plot_path)
print(f"Plot saved to {output_plot_path}")
`;

  // 3. Write data to a temporary JSON file
  const writeDataNode = new WriteFileNode();
  writeDataNode.setParams({
    filePath: dataFilePath,
    content: JSON.stringify(dataToPlot)
  });

  // 4. Run the Python script using CodeInterpreterNode
  const plotNode = new CodeInterpreterNode();
  plotNode.setParams({
    code: pythonPlotScript,
    args: [dataFilePath, plotFilePath], // Pass data file and output plot paths as arguments
    timeout: 15000, // Increased timeout for plotting
    requireConfirmation: false, // No confirmation needed for this automated task
    interpreterPath: process.env.QFLOW_PYTHON_INTERPRETER || 'python' // Allow user to specify Python interpreter path, defaults to 'python'
  });

  // 5. Chain the nodes
  writeDataNode.next(plotNode);

  // 6. Handle the result of the plotting
  plotNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Plotting Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);

    if (execRes.exitCode === 0 && execRes.stdout.includes('Plot saved to')) {
      console.log(`Plot successfully generated at: ${plotFilePath}`);
      // You can now access this file, e.g., open it, or use ReadFileNode to verify
      try {
        await fs.access(plotFilePath); // Check if file exists
        console.log('Plot file exists on disk.');
      } catch (e) {
        console.error('Error: Plot file not found on disk!', e);
      }
    } else {
      console.error('Plotting failed.');
    }
    return 'default';
  };

  // 7. Run the flow
  const flow = new AsyncFlow(writeDataNode);
  try {
    await flow.runAsync({});
  } catch (error) {
    console.error('Plotting Workflow Failed:', error);
  } finally {
    // Clean up temporary files (optional, but good practice)
    try {
      await fs.unlink(dataFilePath); // Delete temporary data file
      console.log(`Cleaned up temporary data file: ${dataFilePath}`);
    } catch (e) {
      console.warn(`Could not delete temporary data file ${dataFilePath}:`, e.message);
    }
    // Keep the plot file for user to access, or delete it if not needed
    // await fs.unlink(plotFilePath);
  }

  console.log('\n--- Plot Data with Python CodeInterpreter Example Finished ---');
})();
