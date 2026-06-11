/**
 * F-11 お引っ越し機能 — バックアップ DTO 型定義 (manifest / import の共通型)。
 *
 * Related: Issue #12 F-11 / ADR-0007 (Repolog 方式 ZIP)
 *
 * backupService.ts (manifest builder + export/import shell) と applyImportPlan.ts
 * (DB-apply 純粋核) の両方が参照するため、循環依存を避けて専用モジュールに集約する。
 * 実行時コードを持たない型のみ (DTO 契約の単一の home)。
 */

export type BackupBonsai = {
  id: string;
  name: string;
  speciesId: string | null;
  acquiredAt: string | null;
  style: string | null;
  potInfo: string | null;
  estimatedAge: number | null;
  memo: string | null;
  purchaseDate: string | null;
  acquiredFrom: string | null;
  estimatedAgeUnknown: number;
  customSpeciesId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupEvent = {
  id: string;
  bonsaiId: string;
  type: string;
  status: string;
  occurredAtUtc: string;
  tzOffsetMin: number;
  tzIana: string;
  durationMin: number | null;
  payloadJson: string | null;
  note: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * 定期予定由来 events の rule 連結 (Sess99 #1121 で追加、旧 ZIP には無い → undefined 許容)。
   * 起動時バッチ (expandFutureEventsForAllActiveRules) の重複 insert 回避がこの連結に依存する
   * ため、復元時に欠落すると予定が二重生成される。
   */
  recurrenceRuleId?: string | null;
};

/** recurrence_rules 1 行 (Sess99 #1121、schema v16/v17 全列)。 */
export type BackupRecurrenceRule = {
  id: string;
  bonsaiId: string;
  eventType: string;
  rrule: string;
  startAtUtc: string;
  endAtUtc: string | null;
  /** JSON 文字列 (DB 列そのまま、例: '[]')。 */
  exdates: string;
  tzIana: string;
  /** v17 追加列 (旧 DB 由来 manifest では null)。 */
  memo: string | null;
  /** v18 追加列 (Sess99 #1122 案 G2 グループ印)。 #1130 直後の ZIP には無い → undefined 許容。 */
  groupId?: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupPhoto = {
  id: string;
  bonsaiId: string;
  eventId: string | null;
  fileName: string; // 例: <photoId>.jpg (relative_path ではなく ZIP 内のファイル名)
  takenAt: string | null;
  isCover: number;
  width: number | null;
  height: number | null;
  orderIndex: number;
  caption: string | null;
  createdAt: string;
};

export type BackupTag = {
  id: string;
  name: string;
  nameNormalized: string;
  createdAt: string;
};

export type BackupBonsaiTag = {
  bonsaiId: string;
  tagId: string;
  createdAt: string;
};

/** bonsai_species_custom / bonsai_styles_custom 共通形 (id + name + created_at)。 */
export type BackupNamed = {
  id: string;
  name: string;
  createdAt: string;
};

export type BackupSettings = {
  language: string;
  /** 後付けの任意設定 (旧 ZIP には無い → import 時に存在分のみ適用)。 */
  themeMode?: string;
  potUnit?: string;
  notificationDailySummaryEnabled?: boolean;
  notificationDailySummaryTime?: string;
};

export type BackupManifest = {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string | null;
  bonsai: BackupBonsai[];
  events: BackupEvent[];
  photos: BackupPhoto[];
  /** schema_version 1 後付けの任意フィールド (旧 ZIP には存在しない → import 時 ?? [] で吸収)。 */
  tags?: BackupTag[];
  bonsaiTags?: BackupBonsaiTag[];
  customSpecies?: BackupNamed[];
  customStyles?: BackupNamed[];
  /** Sess99 #1121 後付け: 定期予定ルール (旧 ZIP には存在しない → import 時 ?? [] で吸収)。 */
  recurrenceRules?: BackupRecurrenceRule[];
  settings: BackupSettings;
};

export type BackupImportResult = {
  bonsai: number;
  events: number;
  photos: number;
};

/** BackupError.code: UI 側でメッセージを切り替えるための識別子。 */
export type BackupErrorCode = 'unsupported' | 'invalid' | 'schema' | 'share' | 'size';
