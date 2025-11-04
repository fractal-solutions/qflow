## HardwareInteractionNode

The `HardwareInteractionNode` communicates with local hardware via serial port (UART).

### Parameters

*   `action`: The action to perform: 'write', 'read_line', 'list_ports'.
*   `portPath`: Required for 'write'/'read_line'. The path to the serial port (e.g., '/dev/ttyUSB0', 'COM1').
*   `baudRate`: Optional. The baud rate for serial communication. Defaults to 9600.
*   `dataToWrite`: Required for 'write'. The data string to send to the serial port.
*   `timeout`: Optional. Timeout in milliseconds for 'read_line' action. Defaults to 5000.
