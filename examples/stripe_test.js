import { AsyncFlow } from '../src/qflow.js';
import { CreateChargeNode, GetBalanceNode } from '../src/nodes/stripe.js';

// --- Configuration ---
// IMPORTANT: Replace with your actual Stripe secret key and a valid source
const STRIPE_API_KEY = process.env.STRIPE_API_KEY || 'YOUR_STRIPE_API_KEY_HERE';
const STRIPE_SOURCE = 'tok_visa'; // Use a test token

// --- Test Workflow for Stripe Nodes ---

(async () => {
  if (STRIPE_API_KEY === 'YOUR_STRIPE_API_KEY_HERE') {
    console.warn(`
      *****************************************************************
      * WARNING: Stripe API key is not set.                           *
      * Please replace the placeholder in examples/stripe_test.js or  *
      * set the STRIPE_API_KEY environment variable to run the flow.  *
      *****************************************************************
    `);
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
