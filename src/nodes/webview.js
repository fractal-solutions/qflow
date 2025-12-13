
import { AsyncNode } from '../qflow.js';
import { Webview, SizeHint } from 'webview-bun';
import { log } from '../logger.js';

/**
 * A node that displays a webview window with the given HTML content.
 * @param {object} params - The parameters for the node.
 * @param {string} params.html - The HTML content to display in the webview.
 * @param {string} [params.title='Qflow Webview'] - The title of the webview window.
 * @param {number} [params.width=800] - The width of the webview window.
 * @param {number} [params.height=600] - The height of the webview window.
 */
export class WebviewNode extends AsyncNode {
  async execAsync() {
    const { html, title = 'Qflow Webview', width = 800, height = 600 } = this.params;

    if (!html) {
      throw new Error('WebviewNode requires an `html` parameter.');
    }

    log(`[WebviewNode] Creating webview window with title: "${title}"`, this.params.logging);

    const webview = new Webview();
    webview.title = title;
    webview.size = { width, height, hint: SizeHint.NONE };
    webview.setHTML(html);
    webview.run();

    log(`[WebviewNode] Webview window closed.`, this.params.logging);

    return 'default';
  }
}
