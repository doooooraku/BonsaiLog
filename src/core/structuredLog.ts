/**
 * Structured logging utility for native bridge API calls.
 *
 * Produces consistent, machine-parseable log lines that can be grepped
 * from logcat/Xcode console to diagnose issues in production.
 *
 * Lesson from Repolog: Structured logs (cssBytes/htmlBytes/sizeBytes/strategy)
 * were the single most effective investment for debugging PDF issues.
 * The ROI of structured logging compounds over time — each new bug
 * investigation benefits from logs added for previous bugs.
 *
 * Usage:
 *   import { logStructured } from '@/core/structuredLog';
 *
 *   logStructured('PDF', 'buildHtml', {
 *     layout: 'standard',
 *     photos: 10,
 *     htmlBytes: 24000,
 *   });
 *   // Output: [PDF] buildHtml: layout=standard photos=10 htmlBytes=24000
 *
 *   logStructured('Photo', 'resize', {
 *     inputWidth: 4032,
 *     outputWidth: 1200,
 *     quality: 0.8,
 *     durationMs: 342,
 *   });
 *   // Output: [Photo] resize: inputWidth=4032 outputWidth=1200 quality=0.8 durationMs=342
 */

/**
 * Log a structured message with key=value pairs.
 *
 * Unlike __DEV__-guarded console.log, these logs are emitted in all builds
 * (dev, preview, production) so they appear in user-provided logcat output.
 * Keep the data minimal — sizes, counts, durations, strategy names — never
 * log user content or PII.
 *
 * @param tag - Category tag (e.g., 'PDF', 'Photo', 'Backup', 'IAP')
 * @param action - Action name (e.g., 'buildHtml', 'resize', 'export')
 * @param data - Key-value pairs to log (numbers, strings, booleans only)
 */
export function logStructured(
  tag: string,
  action: string,
  data: Record<string, string | number | boolean>,
): void {
  const pairs = Object.entries(data)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  console.log(`[${tag}] ${action}: ${pairs}`);
}

/**
 * Log a timing measurement for a native bridge API call.
 *
 * @param tag - Category tag
 * @param action - Action name
 * @param startMs - Performance.now() at the start
 * @param extra - Additional key-value pairs
 */
export function logTiming(
  tag: string,
  action: string,
  startMs: number,
  extra: Record<string, string | number | boolean> = {},
): void {
  const durationMs = Math.round(performance.now() - startMs);
  logStructured(tag, action, { ...extra, durationMs });
}
