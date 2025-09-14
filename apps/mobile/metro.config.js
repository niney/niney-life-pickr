const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

// Path to the shared package
const sharedPackagePath = path.resolve(__dirname, '../../packages/shared');

const config = {
  watchFolders: [
    // Watch the shared package for changes
    sharedPackagePath,
  ],
  resolver: {
    nodeModulesPaths: [
      // Add node_modules paths
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    extraNodeModules: new Proxy(
      {
        '@niney/shared': sharedPackagePath,
      },
      {
        get: (target, name) => {
          if (target[name]) {
            return target[name];
          }
          return path.join(__dirname, 'node_modules', name);
        },
      }
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
