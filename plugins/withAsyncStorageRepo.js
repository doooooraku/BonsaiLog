/**
 * Expo config plugin: add async-storage v3 local Maven repository.
 *
 * async-storage v3 ships a KMP artifact (org.asyncstorage.shared_storage)
 * in android/local_repo/. Gradle needs this path in allprojects.repositories
 * or the build fails with "Could not find org.asyncstorage.shared_storage".
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withAsyncStorageRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const contents = cfg.modResults.contents;
    const repoLine =
      'maven { url(new File(["node", "--print", "require.resolve(\'@react-native-async-storage/async-storage/package.json\')"].execute(null, rootDir).text.trim()).parentFile.absolutePath + "/android/local_repo") }';

    if (contents.includes('asyncstorage') || contents.includes('local_repo')) {
      return cfg;
    }

    cfg.modResults.contents = contents.replace(
      /allprojects\s*\{\s*\n\s*repositories\s*\{/,
      `allprojects {\n  repositories {\n    ${repoLine}`,
    );

    return cfg;
  });
};
