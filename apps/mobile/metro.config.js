const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

let defaultBlockList = []
if (defaultConfig && defaultBlockList.resolver && defaultBlockList.resolver.blockList) {
  defaultBlockList = defaultConfig.resolver.blockList;
}

const blockList = [
  // shared/node_modules 디렉터리 제외
  // 더 안정적인 정규식 패턴 사용
  /shared[/\\]node_modules[/\\].*/,
];

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
  ],
  resolver: {
    extraNodeModules: {
      'shared': path.resolve(__dirname, '../shared'),
    },
    blockList: [
      ...defaultBlockList,
      ...blockList
    ],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
