module.exports = async function (shared) {
  const { system_notification } = require('@quanario/qflow-core');
  await system_notification({ message: shared.message || 'Notification' });
};