// react-native-reanimated and react-native-gesture-handler come in only as peer dependencies of
// expo-router's drawer, which this app does not use. Skip linking their native code into the APK.
module.exports = {
  dependencies: {
    'react-native-reanimated': { platforms: { android: null, ios: null } },
    'react-native-gesture-handler': { platforms: { android: null, ios: null } },
  },
};
