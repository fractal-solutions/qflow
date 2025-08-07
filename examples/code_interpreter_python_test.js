import { AsyncFlow } from '../src/qflow.js';
import { CodeInterpreterNode } from '../src/nodes';

(async () => {
  console.log('--- Running Python CodeInterpreterNode Test Workflow ---');

  // --- Test 1: Simple Python Execution ---
  console.log('\n--- Test 1: Simple Python Execution ---');
  const pythonCode = `
print("Hello from Python!")
`;

  const pythonInterpreterNode = new CodeInterpreterNode();
  pythonInterpreterNode.setParams({
    code: pythonCode,
    timeout: 5000, // 5 seconds timeout
    requireConfirmation: true
  });

  pythonInterpreterNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    if (execRes.stdout.includes("Hello from Python!") && execRes.exitCode === 0) {
      console.log('Test 1 Passed: Python output as expected.');
    } else {
      console.error('Test 1 Failed: Unexpected Python output or non-zero exit code.');
    }
    return 'default';
  };

  const pythonFlow = new AsyncFlow(pythonInterpreterNode);
  try {
    await pythonFlow.runAsync({});
  } catch (error) {
    console.error('Test 1 Failed: Python Execution Flow Failed:', error);
  }

  // --- Test 2: Python with Error ---
  console.log('\n--- Test 2: Python with Error ---');
  const pythonError = `
import sys
sys.exit(1)
`;

  const pythonErrorNode = new CodeInterpreterNode();
  pythonErrorNode.setParams({
    code: pythonError,
    timeout: 5000,
    requireConfirmation: true
  });

  pythonErrorNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Error Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    if (execRes.exitCode === 1) {
      console.log('Test 2 Passed: Python exited with error as expected.');
    } else {
      console.error('Test 2 Failed: Python did not exit with error as expected.');
    }
    return 'default';
  };

  const pythonErrorFlow = new AsyncFlow(pythonErrorNode);
  try {
    await pythonErrorFlow.runAsync({});
  } catch (error) {
    console.error('Test 2 Failed: Python Error Execution Flow Failed:', error);
  }

  // --- Test 3: Python Timeout ---
  console.log('\n--- Test 3: Python Timeout ---');
  const pythonTimeout = `
import time
time.sleep(10) # Sleep for 10 seconds
print("Should not be reached")
`;

  const pythonTimeoutNode = new CodeInterpreterNode();
  pythonTimeoutNode.setParams({
    code: pythonTimeout,
    timeout: 1000, // 1 second timeout
    requireConfirmation: true
  });

  pythonTimeoutNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Timeout Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    // Expecting a non-zero exit code due to timeout
    if (execRes.exitCode !== 0 && execRes.stderr.includes("timed out")) {
      console.log('Test 3 Passed: Python timed out as expected.');
    } else {
      console.error('Test 3 Failed: Python did not time out as expected.');
    }
    return 'default';
  };

  const pythonTimeoutFlow = new AsyncFlow(pythonTimeoutNode);
  try {
    await pythonTimeoutFlow.runAsync({});
  } catch (error) {
    console.error('Test 3 Failed: Python Timeout Execution Flow Failed:', error);
  }

  // --- Test 4: Longer Python Script ---
  console.log('\n--- Test 4: Longer Python Script ---');
  const pythonLongScript = `
def fibonacci(n):
    a, b = 0, 1
    for i in range(n):
        print(f"Fibonacci({i}): {a}")
        a, b = b, a + b
    return a

fibonacci(5)
`;

  const pythonLongScriptNode = new CodeInterpreterNode();
  pythonLongScriptNode.setParams({
    code: pythonLongScript,
    timeout: 10000, // 10 seconds timeout for longer script
    requireConfirmation: true
  });

  pythonLongScriptNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Long Script Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    if (execRes.stdout.includes("Fibonacci(4): 3") && execRes.exitCode === 0) {
      console.log('Test 4 Passed: Longer Python script output as expected.');
    } else {
      console.error('Test 4 Failed: Unexpected output for longer Python script.');
    }
    return 'default';
  };

  const pythonLongScriptFlow = new AsyncFlow(pythonLongScriptNode);
  try {
    await pythonLongScriptFlow.runAsync({});
  } catch (error) {
    console.error('Test 4 Failed: Longer Python Script Execution Flow Failed:', error);
  }

  // --- Test 5: Python Arithmetic Calculation ---
  console.log('\n--- Test 5: Python Arithmetic Calculation ---');
  const pythonArithmeticCode = `
result = 15 * 3
print(f"The result is: {result}")
`;

  const pythonArithmeticNode = new CodeInterpreterNode();
  pythonArithmeticNode.setParams({
    code: pythonArithmeticCode,
    timeout: 5000, // 5 seconds timeout
    requireConfirmation: true
  });

  pythonArithmeticNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Arithmetic Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    if (execRes.stdout.includes("The result is: 45") && execRes.exitCode === 0) {
      console.log('Test 5 Passed: Python arithmetic calculation as expected.');
    } else {
      console.error('Test 5 Failed: Unexpected output for Python arithmetic calculation.');
    }
    return 'default';
  };

  const pythonArithmeticFlow = new AsyncFlow(pythonArithmeticNode);
  try {
    await pythonArithmeticFlow.runAsync({});
  } catch (error) {
    console.error('Test 5 Failed: Python Arithmetic Execution Flow Failed:', error);
  }

  // --- Test 6: Python without Confirmation ---
  console.log('\n--- Test 6: Python without Confirmation ---');
  const pythonNoConfirmCode = `
print("This should run without confirmation!")
`;

  const pythonNoConfirmNode = new CodeInterpreterNode();
  pythonNoConfirmNode.setParams({
    code: pythonNoConfirmCode,
    timeout: 5000, // 5 seconds timeout
    requireConfirmation: false
  });

  pythonNoConfirmNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python No Confirmation Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    if (execRes.stdout.includes("This should run without confirmation!") && execRes.exitCode === 0) {
      console.log('Test 6 Passed: Python ran without confirmation as expected.');
    } else {
      console.error('Test 6 Failed: Unexpected output for Python without confirmation.');
    }
    return 'default';
  };

  const pythonNoConfirmFlow = new AsyncFlow(pythonNoConfirmNode);
  try {
    await pythonNoConfirmFlow.runAsync({});
  } catch (error) {
    console.error('Test 6 Failed: Python No Confirmation Execution Flow Failed:', error);
  }

  console.log('\n--- Python CodeInterpreterNode Test Workflow Finished ---');
})();