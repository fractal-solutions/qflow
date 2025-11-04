## BrowserControlNode

The `BrowserControlNode` controls a web browser to navigate pages, interact with elements, and take screenshots.

### Parameters

*   `action`: The browser action to perform.
*   `url`: The URL to navigate to (for 'goto' action).
*   `selector`: A CSS selector to target an element (for 'click' and 'type' actions).
*   `text`: The text to type into an input field (for 'type' action).
*   `path`: The file path to save a screenshot (for 'screenshot' action).
