import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { screenshotConfig } from '../screenshot-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Store target sizes
// ---------------------------------------------------------------------------

export interface StoreSize {
  readonly width: number;
  readonly height: number;
}

/** iPhone 6.9" — mandatory for App Store */
export const APPLE_SIZE: StoreSize = { width: 1320, height: 2868 };

/** Phone — standard for Google Play (9:16) */
export const GOOGLE_SIZE: StoreSize = { width: 1080, height: 1920 };

export const STORE_SIZES: Record<string, StoreSize> = {
  apple: APPLE_SIZE,
  google: GOOGLE_SIZE,
};

// ---------------------------------------------------------------------------
// App-specific values (from screenshot-config.ts)
// ---------------------------------------------------------------------------

/** Pixels to remove from top (Android status bar in Demo Mode) */
export const CROP_TOP = screenshotConfig.capture.cropTop;

/** Pixels to remove from bottom (Android gesture bar) */
export const CROP_BOTTOM = screenshotConfig.capture.cropBottom;

/** Screen filename <-> marketing-text key mapping */
export const SCREEN_MAP = screenshotConfig.screens.map((s) => ({
  key: s.key as `screen${number}`,
  filename: `${s.id}.png`,
}));

export type ScreenKey = (typeof SCREEN_MAP)[number]['key'];

/** Locale code -> raw screenshot directory name */
export const LOCALE_DIR_MAP = screenshotConfig.localeDirMap;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '../..');
export const RAW_DIR = path.join(PROJECT_ROOT, 'screenshots/raw');
export const STORE_DIR = path.join(PROJECT_ROOT, 'screenshots/store');
export const FONTS_DIR = path.join(PROJECT_ROOT, 'assets/fonts');
