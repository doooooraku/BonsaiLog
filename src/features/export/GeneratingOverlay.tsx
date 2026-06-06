/**
 * F-10 生成中オーバーレイ (Issue #33 / ADR-0016 AC11 Generating + Y2 キャンセル)。
 *
 * 全エクスポート種類 (CSV×3 / PDF×2) が通る唯一の「生成中」UI。中央 Modal に
 * 形式バッジ + 「○○を生成中」 + spinner + (任意で) キャンセルを表示。
 * ConfirmDialog と同じ fade Modal パターン。
 *
 * - `title`: 「{種別名} を生成中」 (未指定なら汎用「生成中…」)
 * - `format`: CSV / PDF バッジ (未指定なら非表示)
 * - `showCancel`: PDF は中断手段として表示、CSV は即時完了のため非表示にできる
 * - `delayMs`: この時間内に visible が false に戻れば一切表示しない (瞬間完了のチラつき防止)。
 *   生成が長引く時 (PDF) だけ Modal が立ち上がる。キャンセルは best-effort
 *   (呼出側が onCancel で busy を解除し結果を破棄。OS 共有自体は中断できない場合がある)。
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_PRIMARY / BORDER_DEFAULT / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化、 BRAND_GREEN は brand-static で保持。
import { BRAND_GREEN } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { ExportFormatBadge, type ExportFmt } from './ExportFormatBadge';

type Props = {
  visible: boolean;
  onCancel: () => void;
  /** 「{種別名} を生成中」。未指定なら汎用「生成中…」。 */
  title?: string;
  /** CSV / PDF バッジ。未指定ならバッジ非表示。 */
  format?: ExportFmt;
  /** キャンセルボタンを出すか (既定 true)。CSV は即時のため false 推奨。 */
  showCancel?: boolean;
  /** 表示までの遅延 (ms)。この間に visible→false なら出さない (既定 250)。 */
  delayMs?: number;
};

/** 生成開始から「時間がかかっています」を出すまでの待機 (ms)。すぐ終わる時は出さない。 */
const SLOW_HINT_DELAY_MS = 4000;
const DEFAULT_SHOW_DELAY_MS = 250;

export function GeneratingOverlay({
  visible,
  onCancel,
  title,
  format,
  showCancel = true,
  delayMs = DEFAULT_SHOW_DELAY_MS,
}: Props) {
  const { t } = useTranslation();
  const c = useColors();
  // 遅延表示: visible が delayMs 以上続いた時だけ実際に Modal を出す (瞬間完了のチラつき防止)。
  const [shown, setShown] = useState(false);
  // 多写真 PDF は数十秒かかることがあるため、表示後さらに一定時間で「お待ちください」を追加表示。
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    if (delayMs <= 0) {
      setShown(true);
      return;
    }
    const id = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(id);
  }, [visible, delayMs]);

  useEffect(() => {
    if (!shown) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), SLOW_HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, [shown]);

  return (
    <Modal visible={shown} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { backgroundColor: c.background }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
          testID="e2e_export_generating_overlay"
        >
          <View style={styles.headerCol}>
            {format ? <ExportFormatBadge fmt={format} size={40} /> : null}
            <ThemedText
              style={[styles.title, { color: c.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
              testID="e2e_export_generating_title"
            >
              {title ?? t('exportGeneratingTitle')}
            </ThemedText>
          </View>

          <ActivityIndicator size="large" color={BRAND_GREEN} />

          {slow ? (
            <ThemedText
              style={[styles.slowHint, { color: c.textSecondary }]}
              testID="e2e_export_generating_slow_hint"
            >
              {t('exportPdfSlowHint')}
            </ThemedText>
          ) : null}

          {showCancel ? (
            <View style={styles.footerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('cancel')}
                onPress={onCancel}
                style={[styles.cancel, { borderColor: c.border }]}
                testID="e2e_export_generating_cancel"
              >
                <ThemedText style={[styles.cancelText, { color: c.textSecondary }]}>
                  {t('cancel')}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    minWidth: 260,
    maxWidth: '90%',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 20,
  },
  // Sess56: バッジを上、タイトルを下に縦並びでカード幅をフルに使い、19 言語×5 種別での
  // 中途半端な折り返し (例: 「個別盆栽レポート を / 生成中」「中」孤立行) を構造的に解消。
  // 横並び (flex:1 で title が wrap) では多言語超長文や種別名長で破綻するため、縦並び + 中央寄せ
  // + numberOfLines={2} ellipsize の組み合わせで保険を掛ける。詳細は ADR-0016 Sess56 Amend 参照。
  headerCol: { flexDirection: 'column', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  slowHint: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancel: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelText: { fontSize: 14 },
});
