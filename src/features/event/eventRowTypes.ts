/**
 * EventRow 系の共通 props / 表示モード型。
 *
 * EventRow (dispatcher) / EventRowDetailed / EventRowCompact が共有するため、
 * 循環依存を避けて専用モジュールに置く (型のみ、実行時コードなし)。
 * 公開 API は EventRow.tsx が re-export する。
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { type Event } from '@/src/db/schema';

export type EventRowDisplayMode = 'compact' | 'detailed';

export type EventRowProps = {
  ev: Event;
  /** 該当 bonsai の全期間 events (wiring 期間判定用、 短絡防止) */
  eventsForBonsai: Event[];
  /** PlanScreen で使用 (showBonsaiName=true の時 title 行に表示) */
  bonsaiName?: string | undefined;
  lang: string;
  t: (key: TranslationKey) => string;
  /** bonsai-detail で削除確認 (long-press) */
  onLongPress?: (ev: Event) => void;
  /** PlanScreen で router.push (tap) */
  onPress?: (ev: Event) => void;
  /** 連続日 group 展開時に左 indent */
  indent?: boolean;
  /** PlanScreen=true (bonsai 名表示) / bonsai-detail=false (自明) */
  showBonsaiName?: boolean;
  /** ADR-0035 D7 (Sess23): planned section で「作業を記録」 button 配置 */
  actionButtonLabel?: string;
  onActionPress?: (ev: Event) => void;
  actionButtonTestID?: string;
  /** ADR-0036 D7 拡張 (Sess27 PR-5): 個別 row 右端 kebab ⋮ tap = 長押し代替動線 */
  onKebabPress?: (ev: Event) => void;
  kebabTestID?: string;
  /**
   * Sess34 ADR-0041 PR-5: 表示モード切替。
   * - 'compact' (default): 後方互換 (memo 2 行、 chips 制限なし、 写真なし)
   * - 'detailed': ADR-0041 D2/D4/D5 — 写真 strip + chips max 4 + memo 3 行 + 「もっと見る」 リンク
   */
  displayMode?: EventRowDisplayMode;
  /**
   * 改善① (検索結果タップ → 該当作業へジャンプ): true の間、 row を一時的に強調背景にする。
   * 呼び出し側で数秒後に false に戻す想定。 default false (後方互換)。
   */
  highlighted?: boolean;
};
