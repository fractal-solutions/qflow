## StripeNode

The `StripeNode` performs Stripe operations like creating charges and retrieving account balances.

### Parameters

*   `action`: The Stripe action to perform.
*   `apiKey`: Your Stripe API key.
*   `amount`: The amount to charge.
*   `currency`: The currency of the charge.
*   `source`: The source of the charge (e.g., a token or card ID).
*   `description`: A description of the charge.
