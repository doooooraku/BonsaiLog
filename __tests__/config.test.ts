/**
 * app.json / app.config.ts static validation.
 *
 * These tests verify structural requirements that Expo and the stores
 * enforce but that are easy to break during development.
 */

import * as fs from 'fs';
import * as path from 'path';

const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf-8'));
const expo = appJson.expo ?? appJson;

describe('app.json structure', () => {
  it('should have experiments.typedRoutes enabled', () => {
    expect(expo.experiments?.typedRoutes).toBe(true);
  });

  it('should have experiments.reactCompiler enabled', () => {
    expect(expo.experiments?.reactCompiler).toBe(true);
  });

  it('should have a valid scheme for deep linking', () => {
    expect(typeof expo.scheme).toBe('string');
    expect(expo.scheme.length).toBeGreaterThan(0);
  });

  it('should have orientation set to portrait', () => {
    expect(expo.orientation).toBe('portrait');
  });

  it('should have userInterfaceStyle set to automatic', () => {
    expect(expo.userInterfaceStyle).toBe('automatic');
  });
});
