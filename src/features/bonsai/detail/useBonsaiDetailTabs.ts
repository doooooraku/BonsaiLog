import { useState, type Dispatch, type SetStateAction } from 'react';

export type DetailTab = 'history' | 'timeline' | 'basic';

/**
 * 盆栽詳細画面のタブ状態 (R3)。URL param `?tab=` から初期タブを決定する。
 * Phase 4 A1-5 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 *
 * - `timeline` / `basic` 指定時はそのタブ、それ以外 (undefined 含む) は `history`。
 * - `setActiveTab` は focusEventId 受領時の `setActiveTab('history')` でも使うため露出。
 */
export function useBonsaiDetailTabs(initialTabParam: string | undefined): {
  activeTab: DetailTab;
  setActiveTab: Dispatch<SetStateAction<DetailTab>>;
} {
  const initialTab: DetailTab =
    initialTabParam === 'timeline' || initialTabParam === 'basic' ? initialTabParam : 'history';
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  return { activeTab, setActiveTab };
}
