/**
 * F-10 Phase D-2 — PDF 信頼性 純関数テスト (Issue #33 / ADR-0016 AC5/6/7/8)。
 */

import {
  BLANK_PDF_BYTES_THRESHOLD,
  BlankPdfError,
  PDF_TIMEOUT_ATTEMPT1_CAP_MS,
  PDF_TIMEOUT_BASE_MS,
  PDF_TIMEOUT_PER_PHOTO_MS,
  PdfHangError,
  PdfStorageLowError,
  REQUIRED_STORAGE_MB,
  assertPdfLooksValid,
  calculatePdfTimeout,
  getAttemptKind,
  isFallbackableError,
  isStorageSufficient,
} from '@/src/features/export/pdfReliability';

describe('定数', () => {
  test('BLANK_PDF_BYTES_THRESHOLD = 1024', () => {
    expect(BLANK_PDF_BYTES_THRESHOLD).toBe(1024);
  });
  test('REQUIRED_STORAGE_MB = 100 (AC7)', () => {
    expect(REQUIRED_STORAGE_MB).toBe(100);
  });
  test('PDF_TIMEOUT_BASE_MS = 30s (AC6)', () => {
    expect(PDF_TIMEOUT_BASE_MS).toBe(30_000);
  });
  test('PDF_TIMEOUT_PER_PHOTO_MS = 1s (AC6)', () => {
    expect(PDF_TIMEOUT_PER_PHOTO_MS).toBe(1_000);
  });
  test('PDF_TIMEOUT_ATTEMPT1_CAP_MS = 10s (AC6)', () => {
    expect(PDF_TIMEOUT_ATTEMPT1_CAP_MS).toBe(10_000);
  });
});

describe('カスタムエラークラス (AC8)', () => {
  test('BlankPdfError は name + bytes 保持', () => {
    const e = new BlankPdfError(500);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('BlankPdfError');
    expect(e.bytes).toBe(500);
    expect(e.message).toContain('500');
  });

  test('PdfHangError は timeoutMs + attempt 保持', () => {
    const e = new PdfHangError(10000, 1);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('PdfHangError');
    expect(e.timeoutMs).toBe(10000);
    expect(e.attempt).toBe(1);
  });

  test('PdfStorageLowError は freeMb + requiredMb 保持', () => {
    const e = new PdfStorageLowError(50);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('PdfStorageLowError');
    expect(e.freeMb).toBe(50);
    expect(e.requiredMb).toBe(100); // default
  });

  test('PdfStorageLowError カスタム requiredMb', () => {
    const e = new PdfStorageLowError(50, 200);
    expect(e.requiredMb).toBe(200);
  });
});

describe('assertPdfLooksValid (AC8)', () => {
  test('1024 byte 以上 → throw しない', () => {
    expect(() => assertPdfLooksValid(1024)).not.toThrow();
    expect(() => assertPdfLooksValid(2048)).not.toThrow();
    expect(() => assertPdfLooksValid(1_000_000)).not.toThrow();
  });

  test('1024 byte 未満 → BlankPdfError', () => {
    expect(() => assertPdfLooksValid(1023)).toThrow(BlankPdfError);
    expect(() => assertPdfLooksValid(0)).toThrow(BlankPdfError);
    expect(() => assertPdfLooksValid(500)).toThrow(BlankPdfError);
  });

  test('NaN / 非 number → BlankPdfError (bytes=0)', () => {
    expect(() => assertPdfLooksValid(NaN)).toThrow(BlankPdfError);
    try {
      assertPdfLooksValid(undefined as unknown as number);
    } catch (err) {
      expect(err).toBeInstanceOf(BlankPdfError);
      expect((err as BlankPdfError).bytes).toBe(0);
    }
  });

  test('境界値 (1024 ちょうど) → throw しない', () => {
    expect(() => assertPdfLooksValid(BLANK_PDF_BYTES_THRESHOLD)).not.toThrow();
  });
});

describe('calculatePdfTimeout (AC6 動的タイムアウト)', () => {
  test('attempt 1 + 写真 0 枚 → 10s キャップ', () => {
    expect(calculatePdfTimeout(0, 1)).toBe(10_000);
  });

  test('attempt 1 + 写真 5 枚 → 10s キャップ (35s 計算値だがキャップ)', () => {
    expect(calculatePdfTimeout(5, 1)).toBe(10_000);
  });

  test('attempt 2 + 写真 0 枚 → 30s ベース', () => {
    expect(calculatePdfTimeout(0, 2)).toBe(30_000);
  });

  test('attempt 2 + 写真 5 枚 → 35s', () => {
    expect(calculatePdfTimeout(5, 2)).toBe(35_000);
  });

  test('attempt 3 + 写真 100 枚 → 130s (キャップなし)', () => {
    expect(calculatePdfTimeout(100, 3)).toBe(130_000);
  });

  test('photoCount 負値 → 0 にクランプ', () => {
    expect(calculatePdfTimeout(-5, 2)).toBe(30_000);
  });

  test('photoCount 小数 → floor', () => {
    expect(calculatePdfTimeout(2.7, 2)).toBe(32_000);
  });
});

describe('isStorageSufficient (AC7)', () => {
  test('100 MB 以上 → true', () => {
    expect(isStorageSufficient(100 * 1024 * 1024)).toBe(true);
    expect(isStorageSufficient(500 * 1024 * 1024)).toBe(true);
  });

  test('100 MB 未満 → false', () => {
    expect(isStorageSufficient(50 * 1024 * 1024)).toBe(false);
    expect(isStorageSufficient(0)).toBe(false);
  });

  test('境界値 (100 MB ちょうど) → true', () => {
    expect(isStorageSufficient(100 * 1024 * 1024)).toBe(true);
  });

  test('カスタム requiredMb', () => {
    expect(isStorageSufficient(150 * 1024 * 1024, 200)).toBe(false);
    expect(isStorageSufficient(250 * 1024 * 1024, 200)).toBe(true);
  });

  test('入力型ガード (NaN / 負値) → false', () => {
    expect(isStorageSufficient(NaN)).toBe(false);
    expect(isStorageSufficient(-1)).toBe(false);
    expect(isStorageSufficient(undefined as unknown as number)).toBe(false);
  });
});

describe('getAttemptKind (AC5 3 段階)', () => {
  test('attempt 1 → full', () => {
    expect(getAttemptKind(1)).toBe('full');
  });
  test('attempt 2 → reduced', () => {
    expect(getAttemptKind(2)).toBe('reduced');
  });
  test('attempt 3 → tiny', () => {
    expect(getAttemptKind(3)).toBe('tiny');
  });
});

describe('isFallbackableError (AC5 3 段階フォールバック判定)', () => {
  test('BlankPdfError → true (品質下げて再試行)', () => {
    expect(isFallbackableError(new BlankPdfError(500))).toBe(true);
  });

  test('PdfHangError → true (時間かけて再試行)', () => {
    expect(isFallbackableError(new PdfHangError(10000, 1))).toBe(true);
  });

  test('PdfStorageLowError → false (容量不足は再試行無意味)', () => {
    expect(isFallbackableError(new PdfStorageLowError(50))).toBe(false);
  });

  test('未知エラー → false', () => {
    expect(isFallbackableError(new Error('unknown'))).toBe(false);
    expect(isFallbackableError(new TypeError('foo'))).toBe(false);
  });

  test('non-Error 値 → false', () => {
    expect(isFallbackableError(null)).toBe(false);
    expect(isFallbackableError(undefined)).toBe(false);
    expect(isFallbackableError('error string')).toBe(false);
    expect(isFallbackableError({ code: 500 })).toBe(false);
  });
});

describe('AC5+6+7+8 統合シナリオ', () => {
  test('シナリオ A: ストレージ不足 → PdfStorageLowError → fallback 不可', () => {
    const free = 50 * 1024 * 1024;
    expect(isStorageSufficient(free)).toBe(false);
    const error = new PdfStorageLowError(50);
    expect(isFallbackableError(error)).toBe(false);
  });

  test('シナリオ B: attempt 1 で BlankPdfError → fallback 可 → attempt 2 (reduced) で再試行', () => {
    const error = new BlankPdfError(500);
    expect(isFallbackableError(error)).toBe(true);
    expect(getAttemptKind(2)).toBe('reduced');
    // attempt 2 のタイムアウト = 30s + 写真数 (キャップなし)
    expect(calculatePdfTimeout(10, 2)).toBe(40_000);
  });

  test('シナリオ C: 全 3 attempt 失敗 → 最終エラー throw (上位層責務、本テスト範囲外)', () => {
    // Phase D-2 では純関数のみ提供、attempt loop は呼出側
    expect(getAttemptKind(1)).toBe('full');
    expect(getAttemptKind(2)).toBe('reduced');
    expect(getAttemptKind(3)).toBe('tiny');
  });
});
