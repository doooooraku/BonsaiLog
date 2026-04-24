/**
 * Expo config plugin: set android:largeHeap="true" on the <application> tag.
 *
 * Useful for apps with heavy memory usage (PDF generation, image processing).
 * Without largeHeap the default 256 MB limit can cause OOM; with it the limit
 * rises to 512 MB.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:largeHeap'] = 'true';
    }
    return cfg;
  });
};
