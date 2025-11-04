## DataExtractorNode

The `DataExtractorNode` extracts structured data from HTML, JSON, or plain text.

### Parameters

*   `input`: The content string from which to extract data.
*   `type`: The type of content to extract from (html, json, or text).
*   `selector`: A CSS selector to target elements (for HTML).
*   `jsonPath`: A dot-notation path to extract data (for JSON).
*   `regex`: A regular expression to match and extract data (for text).
*   `group`: The capturing group index to return from the regex match.
