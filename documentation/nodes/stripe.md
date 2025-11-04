## StripeNode

The `StripeNode` performs Stripe operations like creating charges and retrieving account balances.

### Parameters

*   `action`: The Stripe action to perform.
*   `apiKey`: Your Stripe API key.
*   `amount`: The amount to charge.
*   `currency`: The currency of the charge.
*   `source`: The source of the charge (e.g., a token or card ID).
*   `description`: A description of the charge.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CreateChargeNode, GetBalanceNode } from '@fractal-solutions/qflow/nodes';

// --- Configuration ---
// IMPORTANT: Replace with your actual Stripe secret key and a valid source
const STRIPE_API_KEY = process.env.STRIPE_API_KEY || 'YOUR_STRIPE_API_KEY_HERE';
const STRIPE_SOURCE = 'tok_visa'; // Use a test token

// --- Test Workflow for Stripe Nodes ---

(async () => {
  if (STRIPE_API_KEY === 'YOUR_STRIPE_API_KEY_HERE') {
    console.warn("WARNING: Stripe API key is not set. Please set it to run the flow.");
    return;
  }

  console.log('--- Running Stripe Test Workflow ---');

  // 1. Create instances of the nodes
  const createCharge = new CreateChargeNode();
  createCharge.setParams({
    apiKey: STRIPE_API_KEY,
    amount: 1000, // $10.00
    currency: 'usd',
    source: STRIPE_SOURCE,
    description: '[qflow] Test Charge'
  });

  const getBalance = new GetBalanceNode();
  getBalance.setParams({ apiKey: STRIPE_API_KEY });

  // 2. Define the workflow
  createCharge.next(getBalance);

  // 3. Create and run the flow
  const stripeFlow = new AsyncFlow(createCharge);

  try {
    const result = await stripeFlow.runAsync({});
    console.log('\n--- Stripe Test Workflow Finished ---');
    console.log('Final Result:', result);
  } catch (error) {
    console.error('\n--- Stripe Test Workflow Failed ---', error);
  }
})();
```
