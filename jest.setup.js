// Sess62 R-Sess62-59 reflex: AsyncStorage v3 → v2 ダウングレード (= pnpm expo install --fix で
// SDK 55 整合化) に伴い、 jest-expo preset の AsyncStorage mock が動かなくなる事象を補修。
//
// 公式手順: https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
// preset (jest-expo) に setup を継ぎ足す形で AsyncStorage の Jest 用 mock を登録する。
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
