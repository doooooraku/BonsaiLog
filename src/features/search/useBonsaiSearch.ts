/**
 * 盆栽検索画面のデータ + 検索ロジック (Phase 4 B2 で LookBackSearchScreen god から抽出)。
 *
 * 責務:
 * - query / 盆栽結果 / 作業結果 / searched / 最近タグ / 選択タグ state
 * - runSearchWith: テキスト+タグの 4 並列 query (盆栽 LIKE / タグ別盆栽 / 作業 snippet) +
 *   cover 写真・樹種ラベルの並列 prefetch + AND 積集合 + 検索履歴 push (ADR-0009)
 * - 300ms debounce / CJK は 1 文字・ラテンは 2 文字ゲート / focus 毎に最近タグ取得
 *
 * 振る舞いは LookBackSearchScreen の元実装と完全同一 (純粋な抽出)。
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { getBonsaiByTag, searchBonsai } from '@/src/db/bonsaiRepository';
import { getCustomSpeciesById } from '@/src/db/bonsaiSpeciesCustomRepository';
import { searchEventsWithSnippet, type EventWithSnippet } from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { BONSAI_STYLES, type Bonsai } from '@/src/db/schema';
import { getSpeciesById } from '@/src/db/speciesRepository';
import { getMostUsedTags, type TagRecord } from '@/src/db/tagRepository';

import { useSearchHistoryStore } from './searchHistoryStore';

export type BonsaiResult = {
  bonsai: Bonsai;
  coverUri: string | null;
  /** 樹種ラベル (master 通称 or カスタム樹種名)。未設定なら null。 */
  speciesLabel: string | null;
};

/** UI 言語が CJK (漢字/かな/ハングル) 系なら 1 文字、他はラテン系で全件ヒット回避のため 2 文字。 */
const CJK_LANGS: readonly string[] = ['ja', 'zhHans', 'zhHant', 'ko'];

export type UseBonsaiSearch = {
  query: string;
  setQuery: (q: string) => void;
  bonsaiResults: BonsaiResult[];
  eventResults: EventWithSnippet[];
  searched: boolean;
  recentTags: TagRecord[];
  selectedTagId: string | null;
  selectTag: (tagId: string) => void;
  searchHistory: readonly string[];
  removeHistory: (q: string) => void;
  minChars: number;
  lang: string;
  t: (key: TranslationKey) => string;
  runSearchWith: (raw: string) => Promise<void>;
  /**
   * 検索履歴への保存 (Sess95 PR-4)。 ユーザーの「確定 action」 (Enter 確定 /
   * 結果 row tap / 履歴 row tap) でのみ呼ぶ。 debounce 検索のたびに保存すると
   * 中間入力 (「ぼん」「ぼんさ」「ぼんさい」) が全部履歴に残るため (テスター報告)、
   * 検索実行 (runSearchWith) からは分離している。
   */
  commitHistory: (raw?: string) => void;
};

export function useBonsaiSearch(): UseBonsaiSearch {
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState('');
  const [bonsaiResults, setBonsaiResults] = useState<BonsaiResult[]>([]);
  const [eventResults, setEventResults] = useState<EventWithSnippet[]>([]);
  const [searched, setSearched] = useState(false);
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const searchHistory = useSearchHistoryStore((s) => s.history);
  const removeHistory = useSearchHistoryStore((s) => s.remove);
  const minChars = CJK_LANGS.includes(lang) ? 1 : 2;

  useFocusEffect(
    useCallback(() => {
      getMostUsedTags(6)
        .then(setRecentTags)
        .catch(() => setRecentTags([]));
    }, []),
  );

  const runSearchWith = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      const hasText = trimmed.length >= minChars;
      const hasTag = selectedTagId != null;
      if (!hasText && !hasTag) {
        setBonsaiResults([]);
        setEventResults([]);
        setSearched(false);
        return;
      }
      // 樹形ラベル→enum 逆引き: 標準5種のうち、現在ロケールの表示ラベルが query を含むものを集める。
      // (カスタム樹形は repository 側で style LIKE により別途一致)
      const styleEnums = hasText
        ? BONSAI_STYLES.filter((s) => t(`bonsaiStyle_${s}` as TranslationKey).includes(trimmed))
        : [];
      try {
        // ADR-0008: タグは盆栽単位。タグ選択時は getBonsaiByTag で「盆栽」を返す。
        // 作業履歴セクションはテキスト検索 (メモ全文) のみで表示する。
        const [textBonsai, tagBonsai, textEvents] = await Promise.all([
          hasText ? searchBonsai(trimmed, styleEnums, 50) : Promise.resolve<Bonsai[]>([]),
          hasTag ? getBonsaiByTag(selectedTagId) : Promise.resolve<Bonsai[]>([]),
          hasText ? searchEventsWithSnippet(trimmed) : Promise.resolve<EventWithSnippet[]>([]),
        ]);

        // 盆栽リスト確定: text+tag は積集合 (AND)、text のみ / tag のみはそのまま
        let bonsaiList: Bonsai[];
        if (hasText && hasTag) {
          const tagIdSet = new Set(tagBonsai.map((b) => b.id));
          bonsaiList = textBonsai.filter((b) => tagIdSet.has(b.id));
        } else if (hasText) {
          bonsaiList = textBonsai;
        } else {
          bonsaiList = tagBonsai;
        }

        // カバー写真 + 樹種 (master 通称 / カスタム名) を並列 prefetch
        const uniqueSpeciesIds = [
          ...new Set(bonsaiList.filter((b) => b.speciesId).map((b) => b.speciesId!)),
        ];
        const uniqueCustomSpeciesIds = [
          ...new Set(
            bonsaiList
              .filter((b) => !b.speciesId && b.customSpeciesId)
              .map((b) => b.customSpeciesId!),
          ),
        ];
        const [coverEntries, speciesEntries, customSpeciesEntries] = await Promise.all([
          Promise.all(
            bonsaiList.map((b) =>
              getCoverPhoto(b.id).then((p) => [b.id, p?.absoluteUri ?? null] as const),
            ),
          ),
          Promise.all(
            uniqueSpeciesIds.map((id) =>
              getSpeciesById(id, lang).then((s) => [id, s?.commonName ?? null] as const),
            ),
          ),
          Promise.all(
            uniqueCustomSpeciesIds.map((id) =>
              getCustomSpeciesById(id).then((c) => [id, c?.name ?? null] as const),
            ),
          ),
        ]);
        const coverMap = new Map(coverEntries);
        const speciesMap = new Map(speciesEntries);
        const customSpeciesMap = new Map(customSpeciesEntries);

        setBonsaiResults(
          bonsaiList.map((b) => ({
            bonsai: b,
            coverUri: coverMap.get(b.id) ?? null,
            speciesLabel: b.speciesId
              ? (speciesMap.get(b.speciesId) ?? null)
              : b.customSpeciesId
                ? (customSpeciesMap.get(b.customSpeciesId) ?? null)
                : null,
          })),
        );

        // 作業履歴はテキスト検索のみ (タグからは作業を出さない)
        setEventResults(hasText ? textEvents.slice(0, 50) : []);
        setSearched(true);
        // Sess95 PR-4: 履歴 push はここでは行わない (debounce 検索のたびに中間入力が
        // 履歴に残るため)。 保存は commitHistory (確定 action 時のみ) に分離。
      } catch {
        // 検索失敗は無視
      }
    },
    [lang, selectedTagId, minChars, t],
  );

  // Sess108 PR-E (React Compiler 整合): debounced search の clear / re-trigger は
  // 「query 変化に追従して外部 DB を fetch」 する典型的 useEffect 用途。 block disable で意図明示。
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- debounced search (clear + fetch trigger) */
    const trimmed = query.trim();
    const hasText = trimmed.length >= minChars;
    const hasTag = selectedTagId != null;
    if (!hasText && !hasTag) {
      setBonsaiResults([]);
      setEventResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      void runSearchWith(trimmed);
    }, 300);
    return () => clearTimeout(timer);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [query, selectedTagId, runSearchWith, minChars]);

  const selectTag = useCallback(
    (tagId: string) => setSelectedTagId((prev) => (prev === tagId ? null : tagId)),
    [],
  );

  // Sess95 PR-4: 履歴保存はユーザーの確定 action (Enter / 結果 tap / 履歴 tap) でのみ。
  const commitHistory = useCallback(
    (raw?: string) => {
      const trimmed = (raw ?? query).trim();
      if (trimmed.length >= minChars) {
        useSearchHistoryStore.getState().push(trimmed);
      }
    },
    [query, minChars],
  );

  return {
    query,
    setQuery,
    bonsaiResults,
    eventResults,
    searched,
    recentTags,
    selectedTagId,
    selectTag,
    searchHistory,
    removeHistory,
    minChars,
    lang,
    t,
    runSearchWith,
    commitHistory,
  };
}
