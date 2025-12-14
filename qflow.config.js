// qflow.config.js
/**
 * @type {import('./src/types').QFlowConfig}
 */
const qflowConfig = {
  /**
   * An array of paths to custom node files.
   * These nodes will be dynamically loaded and their static getToolDefinition() methods
   * will be used to make them available as tools for agents.
   * Paths should be relative to the project root.
   * Example: ['./my_nodes/my_custom_node.js', './another_module/special_node.js']
   */
  customNodePaths: [],

  // Add other qflow configurations here in the future
};

export default qflowConfig;
