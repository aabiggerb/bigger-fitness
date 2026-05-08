/**
 * Sync the Widget Extension's CFBundleShortVersionString and CFBundleVersion
 * with the main app's values at prebuild time. Apple rejects IPAs whose
 * extensions have a version mismatch with the host app.
 *
 * @bacons/apple-targets does NOT auto-inherit these from the parent app, and
 * EAS bumps the parent's buildNumber remotely, so we have to write them into
 * the widget's Info.plist via a dangerous mod that runs at every prebuild.
 */
const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;

const WIDGET_TARGET_NAME = 'widget';

const withWidgetVersionSync = (config) => {
  // 1) Capture the main app's resolved version/buildNumber via withInfoPlist
  let mainVersion = config.version || '1.0.0';
  let mainBuildNumber = (config.ios && config.ios.buildNumber) || '1';

  config = withInfoPlist(config, (cfg) => {
    mainVersion = cfg.modResults.CFBundleShortVersionString || mainVersion;
    mainBuildNumber = cfg.modResults.CFBundleVersion || mainBuildNumber;
    return cfg;
  });

  // 2) After prebuild, rewrite the widget's Info.plist with the same values
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const widgetInfoPlistPath = path.join(
        projectRoot,
        'targets',
        WIDGET_TARGET_NAME,
        'Info.plist'
      );

      if (!fs.existsSync(widgetInfoPlistPath)) {
        return cfg;
      }

      const raw = fs.readFileSync(widgetInfoPlistPath, 'utf8');
      const data = plist.parse(raw) || {};

      data.CFBundleShortVersionString = mainVersion;
      data.CFBundleVersion = String(mainBuildNumber);

      fs.writeFileSync(widgetInfoPlistPath, plist.build(data));
      return cfg;
    },
  ]);

  return config;
};

module.exports = withWidgetVersionSync;
