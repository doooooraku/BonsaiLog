/**
 * Expo config plugin: add RNScreensFragmentFactory to MainActivity.
 *
 * Prevents Fragment restoration crashes after Android process death
 * when returning from external intents (camera, file picker, etc.).
 * Without this, the FragmentManager may try to restore react-native-screens
 * fragments which causes IllegalStateException.
 *
 * See: https://github.com/software-mansion/react-native-screens/issues/3317
 */
const { withMainActivity } = require('expo/config-plugins');

const IMPORT_LINE = 'import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory';
const FACTORY_LINE = '    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()';

module.exports = function withFragmentFactory(config) {
  return withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Add import if missing
    if (!contents.includes('RNScreensFragmentFactory')) {
      contents = contents.replace(/^(package .+\n)/m, `$1\n${IMPORT_LINE}\n`);

      // Insert before super.onCreate(null)
      contents = contents.replace(/(super\.onCreate\(null\))/, `${FACTORY_LINE}\n    $1`);
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
