module.exports = async function (shared) {
  const { interactive_input } = require('@quanario/qflow-core');
  const response = await interactive_input({ prompt: shared.message || 'What do you need?' });
  return response;
};