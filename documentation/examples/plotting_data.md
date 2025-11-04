### 17. Plotting Data with Python Code Interpreter

Demonstrates using the `CodeInterpreterNode` to execute Python code for data visualization, saving the output to a file.

**Prerequisites:** To run this example, you need Python and `matplotlib` installed. It is highly recommended to use a Python [virtual environment](https://docs.python.org/3/library/venv.html) to manage your Python dependencies.

Follow these steps in *your project folder* where you are using `qflow`:

1.  **Create a Python Virtual Environment:**
    ```bash
    python3 -m venv .venv
    ```

2.  **Activate the Virtual Environment:**
    *   On Linux/macOS:
        ```bash
        source .venv/bin/activate
        ```
    *   On Windows (Command Prompt):
        ```bash
        .venv\Scripts\activate.bat
        ```
    *   On Windows (PowerShell):
        ```powershell
        .venv\Scripts\Activate.ps1
        ```

3.  **Install `matplotlib` (and any other Python libraries) within the activated environment:**
    ```bash
    pip install matplotlib
    ```

4.  **Configure the Python Interpreter Path:**
    Create or update a `.env` file in your project's root directory (where your `qflow` application runs) and add the following line, pointing to the Python executable within your virtual environment:
    ```bash
    QFLOW_PYTHON_INTERPRETER=/path/to/your/project/.venv/bin/python
    # Example for Windows:
    # QFLOW_PYTHON_INTERPRETER=C:\path\to\your\project\.venv\Scripts\python.exe
    ```
    *Note: If you are not using Bun (which loads `.env` files by default), you might need a library like `dotenv` (e.g., `require('dotenv').config();`) in your application to load environment variables from the `.env` file.*


```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CodeInterpreterNode, WriteFileNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';

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

  // 6. Run the flow
  const flow = new AsyncFlow(writeDataNode);
  try {
    await flow.runAsync({});
    console.log(`\nPlotting workflow finished. Check for plot at: ${plotFilePath}`);
  } catch (error) {
    console.error('Plotting Workflow Failed:', error);
  }
})();
```