## HuggingFaceLLMNode

The `HuggingFaceLLMNode` is used to interact with the Hugging Face API.

### Parameters

*   `hfToken`: Your Hugging Face API token.
*   `prompt`: The prompt to send to the model.
*   `model`: The Hugging Face model ID (e.g., 'HuggingFaceH4/zephyr-7b-beta', 'openai/gpt-oss-20b:novita').
*   `temperature`: Optional. Controls randomness. Defaults to 0.7.
*   `max_new_tokens`: Optional. Maximum number of tokens to generate. Defaults to 500.
*   `baseUrl`: Optional. The base URL of the Hugging Face router API. Defaults to 'https://router.huggingface.co/v1'.
