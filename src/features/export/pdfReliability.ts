/**
 * F-10 PDF 信頼性 — エラー型 + 純関数群 (Phase D-2、Issue #33 / ADR-0016 AC5/6/7/8)。
 *
 * AC8 カスタムエラー:
 * - BlankPdfError: 1024 byte 未満で空 PDF と判定
 * - PdfHangError: Promise.race timeout
 * - PdfStorageLowError: 100 MB 不足
 *
 * AC5 3 段階フォールバック (`AttemptKind`):
 * - full → reduced → tiny の順で写真サイズダウン
 *
 * AC6 タイムアウト動的計算:
 * - 30s + photoCount × 1s、attempt 1 のみ 10s キャップ (素早く失敗 → fallback へ)
 *
 * AC7 ストレージ事前チェック:
 * - 100 MB 必須、不足で PdfStorageLowError
 *
 * 純関数のため React Native / expo-print に依存しない。呼出側 (UI 層) で attempt loop と
 * エラーハンドリングを実施する想定。
 */

/** 1024 byte 未満は空 PDF と判定 (PDF magic header + 最小構造を含まない)。 */
export const BLANK_PDF_BYTES_THRESHOLD = 1024;

/** ストレージ事前チェックの必要容量 (MB)。 */
export const REQUIRED_STORAGE_MB = 100;

/** 動的タイムアウトの基本値 (ms)。 */
export const PDF_TIMEOUT_BASE_MS = 30_000;

/** 写真 1 枚あたりの追加タイムアウト (ms)。 */
export const PDF_TIMEOUT_PER_PHOTO_MS = 1_000;

/** Attempt 1 のキャップ (素早く失敗して fallback へ移る)。 */
export const PDF_TIMEOUT_ATTEMPT1_CAP_MS = 10_000;

/** 3 段階フォールバックの kind。 */
export type AttemptKind = 'full' | 'reduced' | 'tiny';

/** Attempt 番号 (1, 2, 3 のみ)。 */
export type AttemptNumber = 1 | 2 | 3;

/**
 * AC8: 1024 byte 未満の PDF を「空 PDF」と判定 (full attempt が描画に失敗した兆候)。
 */
export class BlankPdfError extends Error {
  readonly bytes: number;
  constructor(bytes: number) {
    super(`PDF is suspiciously small (${bytes} bytes < ${BLANK_PDF_BYTES_THRESHOLD}).`);
    this.name = 'BlankPdfError';
    this.bytes = bytes;
  }
}

/**
 * AC8: Promise.race でタイムアウトした場合の「ハング検出」エラー。
 */
export class PdfHangError extends Error {
  readonly timeoutMs: number;
  readonly attempt: AttemptNumber;
  constructor(timeoutMs: number, attempt: AttemptNumber) {
    super(`PDF generation hung (>${timeoutMs}ms, attempt ${attempt}).`);
    this.name = 'PdfHangError';
    this.timeoutMs = timeoutMs;
    this.attempt = attempt;
  }
}

/**
 * AC8: ストレージ容量不足の事前チェックエラー。
 */
export class PdfStorageLowError extends Error {
  readonly freeMb: number;
  readonly requiredMb: number;
  constructor(freeMb: number, requiredMb: number = REQUIRED_STORAGE_MB) {
    super(`Insufficient storage: ${freeMb}MB free < ${requiredMb}MB required.`);
    this.name = 'PdfStorageLowError';
    this.freeMb = freeMb;
    this.requiredMb = requiredMb;
  }
}

/**
 * AC8: PDF 出力のサイズが妥当かを確認する純関数。
 *
 * 1024 byte 未満は空 PDF と判定し BlankPdfError を投げる。
 * 上位層は catch して次の attempt にフォールバック。
 */
export function assertPdfLooksValid(bytes: number): void {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    throw new BlankPdfError(0);
  }
  if (bytes < BLANK_PDF_BYTES_THRESHOLD) {
    throw new BlankPdfError(bytes);
  }
}

/**
 * AC6: 動的タイムアウトを計算する純関数。
 *
 * - 基本値: 30,000 ms
 * - 写真 1 枚ごとに +1,000 ms
 * - attempt 1 は 10,000 ms キャップ (素早く失敗して fallback)
 * - attempt 2/3 はキャップなし (時間かけて確実に出す)
 *
 * @param photoCount 写真件数 (>= 0)
 * @param attempt 1 / 2 / 3
 */
export function calculatePdfTimeout(photoCount: number, attempt: AttemptNumber): number {
  const safeCount = Math.max(0, Math.floor(photoCount));
  const dynamic = PDF_TIMEOUT_BASE_MS + safeCount * PDF_TIMEOUT_PER_PHOTO_MS;
  if (attempt === 1) {
    return Math.min(dynamic, PDF_TIMEOUT_ATTEMPT1_CAP_MS);
  }
  return dynamic;
}

/**
 * AC7: ストレージ事前チェック純関数 (true なら開始可能、false なら PdfStorageLowError 推奨)。
 *
 * @param freeBytes 利用可能ディスク容量 (bytes、`getFreeDiskStorageAsync` の戻り値)
 * @param requiredMb 必要容量 (MB、default = 100)
 */
export function isStorageSufficient(
  freeBytes: number,
  requiredMb: number = REQUIRED_STORAGE_MB,
): boolean {
  if (typeof freeBytes !== 'number' || Number.isNaN(freeBytes) || freeBytes < 0) {
    return false;
  }
  const requiredBytes = requiredMb * 1024 * 1024;
  return freeBytes >= requiredBytes;
}

/**
 * Attempt 番号から 3 段階フォールバックの kind を返す純関数。
 *
 * - 1 → 'full'
 * - 2 → 'reduced' (写真サイズ縮小)
 * - 3 → 'tiny' (最小品質、最後の手段)
 */
export function getAttemptKind(attempt: AttemptNumber): AttemptKind {
  if (attempt === 1) return 'full';
  if (attempt === 2) return 'reduced';
  return 'tiny';
}

/**
 * 3 段階フォールバック中、エラーが「次の attempt にフォールバック可能」かを判定する純関数。
 *
 * - BlankPdfError → true (品質下げて再試行可)
 * - PdfHangError → true (時間かけて再試行可、ただし attempt 1 のみ)
 * - PdfStorageLowError → false (容量不足は再試行しても無意味)
 * - その他 → false (未知エラーは投げ直し)
 */
export function isFallbackableError(error: unknown): boolean {
  if (error instanceof BlankPdfError) return true;
  if (error instanceof PdfHangError) return true;
  return false;
}

/** Attempt 2 (reduced) で許容する写真件数の上限。 */
export const REDUCED_PHOTO_LIMIT = 5;

/** Attempt 3 (tiny) で許容する写真件数の上限 (= 0、写真なし)。 */
export const TINY_PHOTO_LIMIT = 0;

/**
 * Phase F: 3 段階フォールバックでの写真件数を計算する純関数。
 *
 * - attempt 1 (full) → 全件返す
 * - attempt 2 (reduced) → 先頭 5 件まで
 * - attempt 3 (tiny) → 0 件 (写真完全除外、テキストのみ PDF)
 *
 * 元配列を変更しない (immutable)。
 *
 * @param photoUris 写真 data URI 配列
 * @param attempt 1 / 2 / 3
 */
export function reducePhotoCountForAttempt<T>(
  photoUris: readonly T[],
  attempt: AttemptNumber,
): T[] {
  if (attempt === 1) return [...photoUris];
  if (attempt === 2) return photoUris.slice(0, REDUCED_PHOTO_LIMIT);
  return photoUris.slice(0, TINY_PHOTO_LIMIT);
}

/**
 * runWithFallback の戻り値: 成功時は result + 採用 attempt。
 */
export type RunWithFallbackResult<T> = {
  result: T;
  attemptUsed: AttemptNumber;
};

/**
 * Phase G: AC5-3 (3 attempt 全失敗で最終エラー throw) の attempt loop 純関数。
 *
 * factory(attempt) を順次呼び出し、isFallbackableError が true なら次へ進む。
 * - 成功 → result + attemptUsed を返す
 * - フォールバック不可エラー (PdfStorageLowError 等) → 即時 throw (無駄な再試行スキップ)
 * - 全 attempt 失敗 → 最後のエラーを throw
 *
 * factory に副作用を持たせることで、本関数自体は副作用ゼロで attempt loop だけ責務を持つ。
 * テストでは factory を mock 関数で差し替えて全シナリオをカバー可能。
 *
 * @param attempts 試行する attempt 番号配列 (例: [1, 2, 3])
 * @param factory 各 attempt で呼び出す Promise factory
 *
 * @example
 *   const { result, attemptUsed } = await runWithFallback([1, 2, 3], async (attempt) => {
 *     const photos = reducePhotoCountForAttempt(photoUris, attempt);
 *     const html = buildHtml(photos);
 *     return generateAndShareBonsaiPdf(html, title, { photoCount: photos.length, attempt });
 *   });
 */
export async function runWithFallback<T>(
  attempts: readonly AttemptNumber[],
  factory: (attempt: AttemptNumber) => Promise<T>,
): Promise<RunWithFallbackResult<T>> {
  if (attempts.length === 0) {
    throw new Error('runWithFallback: attempts must be non-empty');
  }
  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const result = await factory(attempt);
      return { result, attemptUsed: attempt };
    } catch (err) {
      lastError = err;
      // フォールバック不可エラー → 即時 throw
      if (!isFallbackableError(err)) {
        throw err;
      }
      // 最後の attempt で失敗 → throw
      if (i === attempts.length - 1) {
        throw err;
      }
      // 次 attempt に進む
    }
  }
  // 理論上到達不可 (上記 loop 内で必ず return か throw)
  throw lastError;
}
