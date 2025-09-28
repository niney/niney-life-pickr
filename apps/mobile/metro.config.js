const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    // 상위 폴더들을 watch 대상에 추가
    path.resolve(__dirname, '../shared'),
    path.resolve(__dirname, '../..'),
  ],
  resolver: {
    extraNodeModules: {
      'shared': path.resolve(__dirname, '../shared'),
    },
    // 상위 디렉토리의 node_modules도 해결할 수 있도록 설정
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
