import { AsyncNode } from '../qflow.js';
import { log } from '../logger.js';

const API_BASE = 'https://api.stripe.com/v1';

/**
 * Creates a new charge in Stripe.
 * @param {object} params - The parameters for the node.
 * @param {string} params.apiKey - The Stripe secret key.
 * @param {number} params.amount - The amount to charge, in cents.
 * @param {string} params.currency - The currency of the charge.
 * @param {string} params.source - The source of the charge (e.g., a token).
 * @param {string} [params.description] - The description of the charge.
 * @returns {Promise<object>} A promise that resolves to the created charge object.
 */
export class CreateChargeNode extends AsyncNode {
  async execAsync() {
    const { apiKey, amount, currency, source, description } = this.params;

    if (!apiKey || !amount || !currency || !source) {
      throw new Error('Missing required parameters: apiKey, amount, currency, source');
    }

    log(`[Stripe] Creating charge for ${amount} ${currency}...`, this.params.logging);

    const response = await fetch(`${API_BASE}/charges`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount,
        currency,
        source,
        description
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Stripe API error: ${response.status} - ${errorData.error.message}`);
    }

    const charge = await response.json();
    log(`[Stripe] Successfully created charge ${charge.id}`, this.params.logging);
    return charge;
  }
}

/**
 * Retrieves the current account balance from Stripe.
 * @param {object} params - The parameters for the node.
 * @param {string} params.apiKey - The Stripe secret key.
 * @returns {Promise<object>} A promise that resolves to the balance object.
 */
export class GetBalanceNode extends AsyncNode {
  async execAsync() {
    const { apiKey } = this.params;

    if (!apiKey) {
      throw new Error('Missing required parameter: apiKey');
    }

    log('[Stripe] Getting account balance...', this.params.logging);

    const response = await fetch(`${API_BASE}/balance`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Stripe API error: ${response.status} - ${errorData.error.message}`);
    }

    const balance = await response.json();
    log('[Stripe] Successfully retrieved account balance.', this.params.logging);
    return balance;
  }
}
