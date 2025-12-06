const fs = require('fs');
const path = require('path');

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

let currentLogLevel = LogLevel.INFO;

export function setLogLevel(level) {
  currentLogLevel = level;
}

// --- Handlers ---

class ConsoleLogHandler {
  handle(message, level, timestamp) {
    const levelString = Object.keys(LogLevel).find(key => LogLevel[key] === level);
    console.log(`[${timestamp.toISOString()}] [${levelString}]`, message);
  }
}

const fileHandlers = {};
class FileLogHandler {
  constructor(filePath) {
    this.filePath = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  handle(message, level, timestamp) {
    const levelString = Object.keys(LogLevel).find(key => LogLevel[key] === level);
    const logMessage = `[${timestamp.toISOString()}] [${levelString}] ${JSON.stringify(message)}\n`;
    fs.appendFileSync(this.filePath, logMessage);
  }
}

class EventLogHandler {
    constructor(emitter) {
        this.emitter = emitter;
    }

    handle(message, level, timestamp) {
        if (this.emitter && typeof this.emitter.emit === 'function') {
            this.emitter.emit('log', {
                level: Object.keys(LogLevel).find(key => LogLevel[key] === level),
                message,
                timestamp,
            });
        }
    }
}

class RemoteLogHandler {
    constructor(url) {
        this.url = url;
    }

    handle(message, level, timestamp) {
        const levelString = Object.keys(LogLevel).find(key => LogLevel[key] === level);
        const logEntry = {
            timestamp: timestamp.toISOString(),
            level: levelString,
            message: message
        };

        fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
        }).catch(err => console.error(`Failed to send log to ${this.url}`, err));
    }
}


export function log(message, nodeLoggingConfig, defaultOptions = {}) {
  const options = { ...defaultOptions, ...nodeLoggingConfig };
  const { type = 'info', method = 'console', params = {} } = options;
  const level = LogLevel[type.toUpperCase()];

  if (level === undefined || level < currentLogLevel) {
    return;
  }

  const timestamp = new Date();

  switch (method) {
    case 'console':
      new ConsoleLogHandler().handle(message, level, timestamp);
      break;
    case 'file':
      if (!params.filePath) {
        console.error('File logging requires a filePath in params.');
        return;
      }
      if (!fileHandlers[params.filePath]) {
        fileHandlers[params.filePath] = new FileLogHandler(params.filePath);
      }
      fileHandlers[params.filePath].handle(message, level, timestamp);
      break;
    case 'event':
        if (!params.emitter) {
            console.error('Event logging requires an emitter in params.');
            return;
        }
        new EventLogHandler(params.emitter).handle(message, level, timestamp);
        break;
    case 'remote':
        if (!params.url) {
            console.error('Remote logging requires a url in params.');
            return;
        }
        new RemoteLogHandler(params.url).handle(message, level, timestamp);
        break;
    default:
      console.error(`Invalid log method: ${method}`);
  }
}
