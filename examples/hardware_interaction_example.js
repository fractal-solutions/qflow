import { AsyncFlow } from '@fractal-solutions/qflow';
import { HardwareInteractionNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running HardwareInteractionNode Example (Serial Port) ---');

  // --- IMPORTANT: Configuration ---
  // 1. Replace with your actual serial port path (e.g., '/dev/ttyUSB0' on Linux, 'COM1' on Windows)
  // 2. Ensure you have a device connected to this port that can send/receive data at 9600 baud.
  //    For testing, you can use an Arduino running a simple echo sketch.
  const MY_SERIAL_PORT_PATH = '/dev/ttyUSB0'; // <<< CHANGE THIS TO YOUR PORT >>>
  const BAUD_RATE = 9600;

  console.log(`\n[Setup] Attempting to communicate with serial port: ${MY_SERIAL_PORT_PATH} at ${BAUD_RATE} baud.`);
  console.log("[Setup] Please ensure you have the 'serialport' library installed (`npm install serialport` or `bun add serialport`).");
  console.log("[Setup] On Linux, you might need to add your user to the `dialout` group: `sudo usermod -a -G dialout $USER` (then log out and back in).");
  console.log("[Setup] If you don't know your port, run 'bun examples/list_serial_ports.js' first.");

  // --- Example 1: Write data to serial port ---
  console.log('\n--- Writing "Hello Arduino!" to serial port ---');
  const writeNode = new HardwareInteractionNode();
  writeNode.setParams({
    action: 'write',
    portPath: MY_SERIAL_PORT_PATH,
    baudRate: BAUD_RATE,
    dataToWrite: 'Hello Arduino!\n' // Send a newline for ReadlineParser
  });

  try {
    const writeResult = await new AsyncFlow(writeNode).runAsync({});
    console.log('Write operation successful:', writeResult);
  } catch (error) {
    console.error('Write operation failed:', error.message);
  }

  // --- Example 2: Read a line from serial port ---
  // This assumes your device will send a line of text back after receiving data,
  // or is continuously sending data.
  console.log('\n--- Reading a line from serial port (waiting for 5 seconds) ---');
  const readNode = new HardwareInteractionNode();
  readNode.setParams({
    action: 'read_line',
    portPath: MY_SERIAL_PORT_PATH,
    baudRate: BAUD_RATE,
    timeout: 5000 // Wait up to 5 seconds for a line
  });

  try {
    const readResult = await new AsyncFlow(readNode).runAsync({});
    console.log('Read operation successful. Received:', readResult);
  } catch (error) {
    console.error('Read operation failed:', error.message);
  }

  console.log('\n--- HardwareInteractionNode Example Finished ---');
})();
