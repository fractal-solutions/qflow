import { AsyncNode } from '../qflow.js';
import * as cheerio from 'cheerio';
import { log } from '../logger.js';

export class DataExtractorNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "data_extractor",
      description: "Extracts structured data from HTML, JSON, or text.",
      parameters: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "The content string from which to extract data."
          },
          type: {
            type: "string",
            enum: ["html", "json", "text"],
            description: "The type of content to extract from (html, json, or text)."
          },
          selector: {
            type: "string",
            description: "Required for 'html' type. A CSS selector to target elements."
          },
          jsonPath: {
            type: "string",
            description: "Required for 'json' type. A dot-notation path to extract data (e.g., 'data.items[0].name')."
          },
          regex: {
            type: "string",
            description: "Required for 'text' type. A regular expression to match and extract data."
          },
          group: {
            type: "number",
            description: "Optional for 'text' type. The capturing group index to return from the regex match."
          }
        },
        required: ["input", "type"]
      }
    };
  }

  async execAsync() {
    const { input, type, selector, jsonPath, regex, group } = this.params;

    if (!input) {
      throw new Error('DataExtractorNode requires an `input` string.');
    }
    if (!type || !['html', 'json', 'text'].includes(type)) {
      throw new Error('DataExtractorNode requires a valid `type` (html, json, text).');
    }

    let result;

    switch (type) {
      case 'html':
        if (!selector) {
          throw new Error('HTML extraction requires a `selector`.');
        }
        log(`[DataExtractor] Extracting HTML with selector: ${selector}`, this.params.logging);
        const $ = cheerio.load(input);
        result = $(selector).map((i, el) => $(el).text()).get();
        break;

      case 'json':
        if (!jsonPath) {
          throw new Error('JSON extraction requires a `jsonPath`.');
        }
        log(`[DataExtractor] Extracting JSON with path: ${jsonPath}`, this.params.logging);
        try {
          const data = JSON.parse(input);
          // Simple JSON path implementation (dot notation and array indexing)
          result = jsonPath.split('.').reduce((acc, part) => {
            if (acc === undefined || acc === null) return undefined;
            const arrayMatch = part.match(/(.*)\[(\d+)\]$/);
            if (arrayMatch) {
              const prop = arrayMatch[1];
              const index = parseInt(arrayMatch[2], 10);
              return acc[prop] ? acc[prop][index] : undefined;
            } else {
              return acc[part];
            }
          }, data);
        } catch (e) {
          throw new Error(`Invalid JSON input or jsonPath: ${e.message}`);
        }
        break;

      case 'text':
        if (!regex) {
          throw new Error('Text extraction requires a `regex`.');
        }
        log(`[DataExtractor] Extracting text with regex: ${regex}`, this.params.logging);
        const re = new RegExp(regex, 'g');
        const matches = [];
        let match;
        while ((match = re.exec(input)) !== null) {
          if (group !== undefined && match.length > group) {
            matches.push(match[group]);
          } else if (group === undefined) {
            matches.push(match[0]);
          } else {
            // Group not found, push undefined or skip
            matches.push(undefined);
          }
        }
        result = matches;
        break;

      default:
        throw new Error('Unsupported extraction type.');
    }

    log(`[DataExtractor] Extraction complete. Result: ${JSON.stringify(result).substring(0, 100)}...`, this.params.logging);
    return result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.extractedData = execRes;
    return 'default';
  }
}
