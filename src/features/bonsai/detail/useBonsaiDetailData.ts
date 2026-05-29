import { useCallback, useState, type RefObject } from 'react';
import { useFocusEffect } from 'expo-router';

import { getBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai } from '@/src/db/eventRepository';
import { getPhotosByBonsai, type PhotoRead } from '@/src/db/photoRepository';
import type { Event } from '@/src/db/schema';

/**
 * 盆栽詳細画面のデータ取得 (R2)。bonsai + 写真 + イベントを読み込み、
 * 画面 focus 毎に再取得する。Phase 4 A1-4 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 *
 * - `pendingDeletionRef`: 写真削除 Undo (R4) が所有する ref を注入。reload 時に
 *   pending 中の写真を UI から非表示にするため参照する (DB にはまだ存在する)。
 * - `setPhotos` / `setCaptions` を返すのは、R4 の楽観的更新が直接 state を叩くため (挙動不変)。
 * - 呼び出しは R5 (consumeWorkPickerResult) の useFocusEffect の **後**、basicForm の **前** に
 *   置くこと。useFocusEffect の登録順 (consume → reload → basicForm) を保つ。
 */
export function useBonsaiDetailData({
  id,
  lang,
  pendingDeletionRef,
}: {
  id: string | undefined;
  lang: string;
  pendingDeletionRef: RefObject<{ photo: PhotoRead; previousIndex: number } | null>;
}) {
  const [item, setItem] = useState<BonsaiWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  // Repolog 風 photoCard 縦リスト (orderIndex 順、年次グループ化は廃止)
  const [photos, setPhotos] = useState<PhotoRead[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Event[]>([]);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBonsaiWithSpecies(id, lang);
      setItem(data);
      const list = await getPhotosByBonsai(id);
      // pending 削除中の photo は state に復活させない (DB にはまだ存在するが UI 上は削除済の見た目)。
      // タイマー満了 or unmount で finalize → DB 削除されるまでの一時的な不可視化。
      const pending = pendingDeletionRef.current;
      const filtered = pending != null ? list.filter((p) => p.id !== pending.photo.id) : list;
      setPhotos(filtered);
      // captions の controlled 値を DB の最新値で初期化 (pending 含めて更新、復元時に caption も戻る)。
      const captionMap: Record<string, string> = {};
      list.forEach((p) => {
        captionMap[p.id] = p.caption ?? '';
      });
      setCaptions(captionMap);
      const evs = await getActiveEventsByBonsai(id);
      setEvents(evs);
    } finally {
      setLoading(false);
    }
  }, [id, lang, pendingDeletionRef]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { item, loading, photos, setPhotos, captions, setCaptions, events, reload };
}
