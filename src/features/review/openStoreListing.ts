/**
 * 設定画面「アプリを評価する」の Play Store 直リンク (ADR-0006 Sess98 Amendment D7)。
 *
 * In-App Review API を CTA (ボタン) から呼ぶことは Google 公式が明示的に禁止
 * (quota 切れ時に無反応 = 壊れた UX になるため)。 代わりに Play Store の商品ページを
 * 直接開く。 quota の対象外なので、 ユーザーはいつでもレビューを投稿できる。
 *
 * Related:
 * - docs/adr/ADR-0006-in-app-review-trigger.md (Sess98 Amendment D7)
 * - app.config.ts extra.ANDROID_PACKAGE (= android.package と同値)
 */
import { Platform } from 'react-native';

import { getAppExtra } from '@/src/core/appExtra';
import { openExternalLink } from '@/src/services/legalService';

export async function openStoreListing(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const pkg = getAppExtra()['ANDROID_PACKAGE'];
  if (typeof pkg !== 'string' || pkg.length === 0) return false;
  // market:// は Play Store app の商品ページを直接開く。 Play Store 不在端末は web へ fallback
  if (await openExternalLink(`market://details?id=${pkg}`)) return true;
  return openExternalLink(`https://play.google.com/store/apps/details?id=${pkg}`);
}
