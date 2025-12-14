import { AsyncNode } from '../qflow.js';
// You would need to install the 'serialport' library: npm install serialport
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'; // For reading line-by-line
import { log } from '../logger.js';

export class HardwareInteractionNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "hardware_interaction",
      description: "Communicates with local hardware via serial port (UART).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["write", "read_line", "list_ports"],
            description: "The action to perform: 'write' data, 'read_line' from port, or 'list_ports' available."
          },
          portPath: {
            type: "string",
            description: "Required for 'write'/'read_line'. The path to the serial port (e.g., '/dev/ttyUSB0', 'COM1')."
          },
          baudRate: {
            type: "number",
            description: "Optional. The baud rate for serial communication. Defaults to 9600."
          },
          dataToWrite: {
            type: "string",
            description: "Required for 'write'. The data string to send to the serial port."
          },
          timeout: {
            type: "number",
            description: "Optional. Timeout in milliseconds for 'read_line' action. Defaults to 5000."
          }
        },
        required: ["action"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
    this.port = null;
    this.parser = null;
  }

  async execAsync() {
    const {
      portPath, // e.g., '/dev/ttyUSB0' on Linux, 'COM1' on Windows
      baudRate = 9600,
      action, // 'write', 'read_line', 'list_ports'
      dataToWrite, // For 'write' action
      timeout = 5000 // For 'read_line' action
    } = this.params;

    if (!action || !['write', 'read_line', 'list_ports'].includes(action)) {
      throw new Error('HardwareInteractionNode requires an `action`: "write", "read_line", or "list_ports".');
    }

    let result;

    switch (action) {
      case 'list_ports':
        // List available serial ports
        try {
          const ports = await SerialPort.list();
          result = ports.map(p => ({
            path: p.path,
            manufacturer: p.manufacturer,
            serialNumber: p.serialNumber,
            pnpId: p.pnpId,
            productId: p.productId,
            vendorId: p.vendorId,
          }));
        } catch (e) {
          throw new Error(`Failed to list serial ports: ${e.message}`);
        }
        break;

      case 'write':
      case 'read_line':
        if (!portPath) {
          throw new Error('For "write" or "read_line" action, `portPath` is required.');
        }

        try {
          this.port = new SerialPort({ path: portPath, baudRate: baudRate });

          await new Promise((resolve, reject) => {
            this.port.on('open', resolve);
            this.port.on('error', reject);
          });
          log(`[HardwareInteractionNode] Serial port ${portPath} opened.`, this.params.logging);

          if (action === 'write') {
            if (dataToWrite === undefined) {
              throw new Error('Write action requires `dataToWrite`.');
            }
            await new Promise((resolve, reject) => {
              this.port.write(dataToWrite, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
            result = { status: 'data_written', data: dataToWrite };
          } else if (action === 'read_line') {
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));
            result = await new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for data on ${portPath}`));
              }, timeout);

              this.parser.on('data', (line) => {
                clearTimeout(timer);
                resolve(line.trim());
              });
              this.port.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
              });
            });
          }
        } catch (e) {
          throw new Error(`Serial port operation failed: ${e.message}. Check portPath, baudRate, and permissions.`);
        } finally {
          if (this.port && this.port.isOpen) {
            await new Promise(resolve => this.port.close(resolve));
            log(`[HardwareInteractionNode] Serial port ${portPath} closed.`, this.params.logging);
          }
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return result;
  }
}
