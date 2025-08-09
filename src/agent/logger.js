const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  grey: "\x1b[90m"
};

function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

export const logger = {
  info: (message) => console.log(colorize(`[INFO] ${message}`, colors.cyan)),
  warn: (message) => console.log(colorize(`[WARN] ${message}`, colors.yellow)),
  thought: (message) => {
    console.log("---------------------");
    console.log(colorize("🤔 Thought", colors.yellow));
    console.log(colorize(message, colors.grey));
    console.log("---------------------");
  },
  toolCall: (tool, params) => {
    console.log(colorize("\n🛠️  Tool Call", colors.green));
    console.log(colorize(`Tool: ${tool}`, colors.magenta));
    console.log(colorize(`Params: ${JSON.stringify(params, null, 2)}`, colors.magenta));
    console.log("---------------------");
  },
  toolResult: (tool, result) => {
    console.log(colorize("\n✅ Tool Result", colors.green));
    console.log(colorize(`Tool: ${tool}`, colors.magenta));
    console.log(colorize(`Result: ${JSON.stringify(result, null, 2)}`, colors.grey));
    console.log("---------------------");
  },
  error: (message) => {
    console.log(colorize("\n❌ Error", colors.red));
    console.log(colorize(message, colors.red));
    console.log("---------------------");
  },
  final: (message) => {
    console.log("\n---------------------");
    console.log(colorize("🎉 Final Output", colors.yellow));
    console.log(colorize(message, colors.cyan));
    console.log("---------------------");
  }
};