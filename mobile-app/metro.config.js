const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const topicStub = path.resolve(__dirname, 'src/shims/expoTopicSubscriptionStub.js');

config.projectRoot = __dirname;
config.watchFolders = [__dirname];

config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
  },
};

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  resolveRequest: (context, moduleName, platform) => {
    const fromNotifications =
      context.originModulePath &&
      context.originModulePath.includes(`${path.sep}expo-notifications${path.sep}`);

    if (
      fromNotifications &&
      (moduleName === './TopicSubscriptionModule' ||
        moduleName.endsWith('TopicSubscriptionModule') ||
        moduleName.includes('TopicSubscriptionModule.android'))
    ) {
      return { type: 'sourceFile', filePath: topicStub };
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
