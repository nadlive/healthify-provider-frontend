module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
      // Reanimated plugin must be listed last (worklets for keyboard-controller / GiftedChat)
      'react-native-reanimated/plugin',
    ],
  };
};
