/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  icon: '../../assets/icon.png',
  deploymentTarget: '16.2',
  // No entitlements required for local-only Live Activity updates
  // (we update from the foreground app, not via push tokens)
};
