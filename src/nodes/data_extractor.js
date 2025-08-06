import { AsyncNode } from '../qflow.js';
import * as cheerio from 'cheerio';

export class DataExtractorNode extends AsyncNode {
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
        console.log(`[DataExtractor] Extracting HTML with selector: ${selector}`);
        const $ = cheerio.load(input);
        result = $(selector).map((i, el) => $(el).text()).get();
        break;

      case 'json':
        if (!jsonPath) {
          throw new Error('JSON extraction requires a `jsonPath`.');
        }
        console.log(`[DataExtractor] Extracting JSON with path: ${jsonPath}`);
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
        console.log(`[DataExtractor] Extracting text with regex: ${regex}`);
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

    console.log(`[DataExtractor] Extraction complete. Result: ${JSON.stringify(result).substring(0, 100)}...`);
    return result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.extractedData = execRes;
    return 'default';
  }
}
