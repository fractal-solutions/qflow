## HardwareInteractionNode

The `HardwareInteractionNode` communicates with local hardware via serial port (UART).

### Parameters

*   `action`: The action to perform: 'write', 'read_line', 'list_ports'.
*   `portPath`: Required for 'write'/'read_line'. The path to the serial port (e.g., '/dev/ttyUSB0', 'COM1').
*   `baudRate`: Optional. The baud rate for serial communication. Defaults to 9600.
*   `dataToWrite`: Required for 'write'. The data string to send to the serial port.
*   `timeout`: Optional. Timeout in milliseconds for 'read_line' action. Defaults to 5000.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { HardwareInteractionNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running HardwareInteractionNode Example (Serial Port) ---');

  // --- IMPORTANT: Configuration ---
  // Replace with your actual serial port path (e.g., '/dev/ttyUSB0' on Linux, 'COM1' on Windows)
  const MY_SERIAL_PORT_PATH = '/dev/ttyUSB0'; // <<< CHANGE THIS TO YOUR PORT >>>
  const BAUD_RATE = 9600;

  // --- Example: Write data to serial port ---
  console.log('\n--- Writing "Hello Device!" to serial port ---');
  const writeNode = new HardwareInteractionNode();
  writeNode.setParams({
    action: 'write',
    portPath: MY_SERIAL_PORT_PATH,
    baudRate: BAUD_RATE,
    dataToWrite: 'Hello Device!\n' // Send a newline if your device expects it
  });

  try {
    const writeResult = await new AsyncFlow(writeNode).runAsync({});
    console.log('Write operation successful:', writeResult);
  } catch (error) {
    console.error('Write operation failed:', error.message);
  }

  console.log('\n--- HardwareInteractionNode Example Finished ---');
})();
```
