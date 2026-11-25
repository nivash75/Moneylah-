const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILE = 'AddTransactionIntent.swift';

/** Adds the Swift app intent to the generated iOS app target. */
module.exports = function withAddTransactionShortcut(config) {
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const name = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      fs.copyFileSync(path.join(__dirname, FILE), path.join(cfg.modRequest.platformProjectRoot, name, FILE));
      return cfg;
    },
  ]);
  return withXcodeProject(config, (cfg) => {
    const name = cfg.modRequest.projectName;
    const filepath = `${name}/${FILE}`;
    if (!cfg.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: name, project: cfg.modResults });
    }
    return cfg;
  });
};
