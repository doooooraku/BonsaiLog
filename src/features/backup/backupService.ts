/**
 * F-11 お引っ越し機能 — Repolog 方式 ZIP + Share Sheet 実装。
 *
 * Related:
 * - Issue #12 F-11
 * - ADR-0007 (Repolog 方式に再設計)
 * - ADR-0005 (`usesNonExemptEncryption: false` 維持、暗号化なし)
 * - 移植元: /home/doooo/04_app-factory/apps/Repolog/src/features/backup/backupService.ts
 *
 * 仕様要約:
 * - ZIP 構造: manifest.json + photos/<id>.jpg + bonsai.db (SQLite VACUUM INTO スナップショット)
 * - 写真は長辺 2048px に縮小 (expo-image-manipulator)
 * - 200MB ハード制限 (zip 化前に推定)、超過は BackupError('size')
 * - インポートはマージのみ (追記)、ID 重複スキップ、`schema_version !== 1` 拒否
 * - cacheDirectory に作業ディレクトリ→ZIP→shareAsync→必ず削除
 * - 暗号化なし (UI で警告文表示)
 *
 * 設計方針:
 * - Repolog (legacy expo-file-system) → BonsaiLog (新 API: Paths.cache / File / Directory)
 * - 写真パスは relative_path (DB) → toAbsolutePath (read 時) で復元、F-08 流儀踏襲
 * - DB スナップショットは VACUUM INTO で本体 DB をロックしない
 * - File.pickFileAsync で expo-document-picker を使わない (ADR-0007)
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { unzip, zip } from 'react-native-zip-archive';

import { getDb } from '@/src/db/db';
import { toAbsolutePath, toRelativePath } from '@/src/db/filePathUtils';
import { nowUtc } from '@/src/core/datetime';
import { getLang, setLang, t, type Lang } from '@/src/core/i18n/i18n';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { useSettingsStore, type PotUnit } from '@/src/stores/settingsStore';
import { type ThemeMode } from '@/src/core/theme/themeResolver';
import { buildAppendImportPlan, bonsaiTagKey } from './backupImportPlanner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** schema_version 厳格一致。`!== 1` で BackupError('schema') を投げる (ADR-0007)。 */
const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_MANIFEST = 'manifest.json';
const BACKUP_PHOTOS_DIR = 'photos';
const BACKUP_DB_FILE = 'bonsai.db';

/** 写真リサイズ長辺 (px)。盆栽愛好家の高解像度ニーズと 200MB 制限のトレードオフ (ADR-0007)。 */
const PHOTO_MAX_DIMENSION = 2048;
const PHOTO_COMPRESS_QUALITY = 0.85;

/** 200MB ハード制限 (ADR-0007 / constraints §2-2 写真上限とは別、ZIP 全体)。 */
const MAX_BACKUP_SIZE_BYTES = 200 * 1024 * 1024;

/** photos の DB 保存パス anchor (filePathUtils.ts と一致させる)。 */
const PHOTO_PATH_ANCHOR = 'bonsailog/photos/';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  settings: BackupSettings;
};

export type BackupImportResult = {
  bonsai: number;
  events: number;
  photos: number;
};

/** BackupError.code: UI 側でメッセージを切り替えるための識別子。 */
export type BackupErrorCode = 'unsupported' | 'invalid' | 'schema' | 'share' | 'size';

export class BackupError extends Error {
  code: BackupErrorCode;

  constructor(code: BackupErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'BackupError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * react-native-zip-archive は `file://` スキーム無しのプレーンパスを期待する。
 * 新 API の File.uri / Directory.uri は `file://` 付なのでここで剥がす。
 */
function stripFileScheme(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

/**
 * cacheDirectory 配下に作業用一時ディレクトリを作成 (タイムスタンプ付き)。
 * Sharing 後に必ず File / Directory.delete() で消す責任を呼出側に持たせる。
 */
function makeWorkDirectory(prefix: string): Directory {
  // ADR-0008 §TZ 3 層防御に従い nowUtc() 経由で取得 (`new Date()` 引数なし禁止)。
  const stamp = (nowUtc() as string).replace(/[:.]/g, '-');
  const dir = new Directory(Paths.cache, `${prefix}-${stamp}`);
  if (dir.exists) {
    dir.delete();
  }
  dir.create({ intermediates: true });
  return dir;
}

/** Directory を idempotent に削除 (存在しない場合は無視)。 */
function safeDeleteDirectory(dir: Directory) {
  try {
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // 既に消えている / 権限なしなどは握り潰す (cleanup は best-effort)
  }
}

/** File を idempotent に削除。 */
function safeDeleteFile(file: File) {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Manifest builder (DB → BackupManifest)
// ---------------------------------------------------------------------------

/**
 * SQLite から bonsai / events / photos を全件読み出して BackupManifest 化する。
 * - 写真は relativePath を fileName (=<photoId>.jpg 想定) に変換 (ZIP 内ではこの名前で格納)。
 */
async function buildManifestFromDb(): Promise<{
  manifest: BackupManifest;
  photoSourceUris: { id: string; absoluteUri: string }[];
}> {
  const db = await getDb();

  type BonsaiRow = {
    id: string;
    name: string;
    species_id: string | null;
    acquired_at: string | null;
    style: string | null;
    pot_info: string | null;
    estimated_age: number | null;
    memo: string | null;
    purchase_date: string | null;
    acquired_from: string | null;
    estimated_age_unknown: number;
    custom_species_id: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
  };

  type EventRow = {
    id: string;
    bonsai_id: string;
    type: string;
    status: string;
    occurred_at_utc: string;
    tz_offset_min: number;
    tz_iana: string;
    duration_min: number | null;
    payload_json: string | null;
    note: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  };

  type PhotoRow = {
    id: string;
    bonsai_id: string;
    event_id: string | null;
    relative_path: string;
    taken_at: string | null;
    is_cover: number;
    width: number | null;
    height: number | null;
    order_index: number;
    caption: string | null;
    created_at: string;
  };

  type TagRow = {
    id: string;
    name: string;
    name_normalized: string;
    created_at: string;
  };

  type BonsaiTagRow = {
    bonsai_id: string;
    tag_id: string;
    created_at: string;
  };

  type NamedRow = {
    id: string;
    name: string;
    created_at: string;
  };

  const bonsaiRows = await db.getAllAsync<BonsaiRow>('SELECT * FROM bonsai;');
  const eventRows = await db.getAllAsync<EventRow>('SELECT * FROM events;');
  const photoRows = await db.getAllAsync<PhotoRow>('SELECT * FROM photos;');
  const tagRows = await db.getAllAsync<TagRow>('SELECT * FROM tags;');
  const bonsaiTagRows = await db.getAllAsync<BonsaiTagRow>('SELECT * FROM bonsai_tags;');
  const customSpeciesRows = await db.getAllAsync<NamedRow>('SELECT * FROM bonsai_species_custom;');
  const customStyleRows = await db.getAllAsync<NamedRow>('SELECT * FROM bonsai_styles_custom;');

  const bonsai: BackupBonsai[] = bonsaiRows.map((row) => ({
    id: row.id,
    name: row.name,
    speciesId: row.species_id,
    acquiredAt: row.acquired_at,
    style: row.style,
    potInfo: row.pot_info,
    estimatedAge: row.estimated_age,
    memo: row.memo,
    purchaseDate: row.purchase_date,
    acquiredFrom: row.acquired_from,
    estimatedAgeUnknown: row.estimated_age_unknown,
    customSpeciesId: row.custom_species_id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const events: BackupEvent[] = eventRows.map((row) => ({
    id: row.id,
    bonsaiId: row.bonsai_id,
    type: row.type,
    status: row.status,
    occurredAtUtc: row.occurred_at_utc,
    tzOffsetMin: row.tz_offset_min,
    tzIana: row.tz_iana,
    durationMin: row.duration_min,
    payloadJson: row.payload_json,
    note: row.note,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const photos: BackupPhoto[] = [];
  const photoSourceUris: { id: string; absoluteUri: string }[] = [];
  for (const row of photoRows) {
    const fileName = `${row.id}.jpg`;
    photos.push({
      id: row.id,
      bonsaiId: row.bonsai_id,
      eventId: row.event_id,
      fileName,
      takenAt: row.taken_at,
      isCover: row.is_cover,
      width: row.width,
      height: row.height,
      orderIndex: row.order_index,
      caption: row.caption,
      createdAt: row.created_at,
    });
    photoSourceUris.push({ id: row.id, absoluteUri: toAbsolutePath(row.relative_path) });
  }

  const tags: BackupTag[] = tagRows.map((row) => ({
    id: row.id,
    name: row.name,
    nameNormalized: row.name_normalized,
    createdAt: row.created_at,
  }));

  const bonsaiTags: BackupBonsaiTag[] = bonsaiTagRows.map((row) => ({
    bonsaiId: row.bonsai_id,
    tagId: row.tag_id,
    createdAt: row.created_at,
  }));

  const mapNamed = (row: NamedRow): BackupNamed => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  });
  const customSpecies: BackupNamed[] = customSpeciesRows.map(mapNamed);
  const customStyles: BackupNamed[] = customStyleRows.map(mapNamed);

  // 設定 (好み) も「完全なお引っ越し」のため含める。
  const settingsState = useSettingsStore.getState();

  const manifest: BackupManifest = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: nowUtc() as string,
    appVersion: Constants.expoConfig?.version ?? null,
    bonsai,
    events,
    photos,
    tags,
    bonsaiTags,
    customSpecies,
    customStyles,
    settings: {
      language: getLang(),
      themeMode: settingsState.themeMode,
      potUnit: settingsState.potUnit,
      notificationDailySummaryEnabled: settingsState.notificationDailySummaryEnabled,
      notificationDailySummaryTime: settingsState.notificationDailySummaryTime,
    },
  };

  return { manifest, photoSourceUris };
}

// ---------------------------------------------------------------------------
// Photo resize
// ---------------------------------------------------------------------------

/**
 * 写真を長辺 2048px に縮小して JPEG で書き出す。
 * 縮小後の File (target) を返す。
 * width のみ指定 → expo-image-manipulator がアスペクト比保持で自動計算。
 * 元画像が 2048px 以下でも再エンコードのみ実施 (ZIP 内のファイルサイズを抑える、品質 0.85 固定)。
 */
async function resizePhoto(sourceUri: string, target: File): Promise<void> {
  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: PHOTO_MAX_DIMENSION } }],
    {
      compress: PHOTO_COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  // manipulateAsync は cacheDirectory に書き出す → target に move
  const tmp = new File(result.uri);
  if (target.exists) {
    target.delete();
  }
  tmp.move(target);
}

// ---------------------------------------------------------------------------
// Export (BackupExportScreen から呼出)
// ---------------------------------------------------------------------------

/**
 * バックアップを作成して Share Sheet を起動する。
 *
 * 失敗ケース:
 * - Web プラットフォーム → BackupError('unsupported')
 * - Sharing.isAvailableAsync() === false → BackupError('share')
 * - 200MB 超 → BackupError('size')
 * - 写真ファイル欠損 → BackupError('invalid')
 *
 * cleanup: 成否に関わらず作業ディレクトリ + ZIP は必ず削除。
 */
export async function exportBackup(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new BackupError('unsupported');
  }
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new BackupError('share');
  }

  const workDir = makeWorkDirectory('bonsailog-backup');
  const photosDir = new Directory(workDir, BACKUP_PHOTOS_DIR);
  photosDir.create({ intermediates: true });

  // ZIP は workDir と同じ階層に <workDir basename>.zip で作る
  const zipFile = new File(Paths.cache, `${Paths.basename(workDir.uri)}.zip`);

  try {
    // 1. manifest と写真ソースリスト構築
    const { manifest, photoSourceUris } = await buildManifestFromDb();

    // 2. 写真リサイズ + コピー
    for (const src of photoSourceUris) {
      const sourceFile = new File(src.absoluteUri);
      if (!sourceFile.exists) {
        throw new BackupError('invalid', `Missing photo file: ${src.id}`);
      }
      const targetFile = new File(photosDir, `${src.id}.jpg`);
      await resizePhoto(src.absoluteUri, targetFile);
    }

    // 3. DB スナップショット (VACUUM INTO) — 本体 DB をロックしない
    const dbSnapshot = new File(workDir, BACKUP_DB_FILE);
    if (dbSnapshot.exists) {
      dbSnapshot.delete();
    }
    const db = await getDb();
    // VACUUM INTO は SQL 文字列リテラルでパスを埋め込むため、`'` をエスケープ
    // (expo の cacheDirectory に `'` は通常現れないが念のため)
    const snapshotPath = stripFileScheme(dbSnapshot.uri).replace(/'/g, "''");
    await db.execAsync(`VACUUM INTO '${snapshotPath}';`);

    // 4. manifest.json 書き出し
    const manifestFile = new File(workDir, BACKUP_MANIFEST);
    if (manifestFile.exists) {
      manifestFile.delete();
    }
    manifestFile.create();
    manifestFile.write(JSON.stringify(manifest, null, 2));

    // 5. ZIP 化
    if (zipFile.exists) {
      zipFile.delete();
    }
    await zip(stripFileScheme(workDir.uri), stripFileScheme(zipFile.uri));

    // 6. 200MB ハード制限チェック
    const zipInfo = zipFile.info();
    if (typeof zipInfo.size === 'number' && zipInfo.size > MAX_BACKUP_SIZE_BYTES) {
      throw new BackupError('size');
    }

    // 7. Share Sheet 起動
    await Sharing.shareAsync(zipFile.uri, {
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
    });
  } finally {
    safeDeleteDirectory(workDir);
    safeDeleteFile(zipFile);
  }
}

// ---------------------------------------------------------------------------
// Import (BackupImportScreen から呼出)
// ---------------------------------------------------------------------------

/**
 * manifest.json を unzip 後のディレクトリから探す。
 * macOS / Windows で ZIP 化されると一段ネストするケースに対応 (Repolog lesson)。
 */
function findManifestRoot(baseDir: Directory): Directory | null {
  const directManifest = new File(baseDir, BACKUP_MANIFEST);
  if (directManifest.exists) return baseDir;

  for (const entry of baseDir.list()) {
    if (entry instanceof Directory) {
      const nested = new File(entry, BACKUP_MANIFEST);
      if (nested.exists) return entry;
    }
  }
  return null;
}

/**
 * Manifest が想定の形をしているかを軽量に検証 (構造のみ、バリデーションは Repository に委ねる)。
 */
function isValidManifestShape(value: unknown): value is BackupManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<BackupManifest>;
  if (typeof m.schemaVersion !== 'number') return false;
  if (!Array.isArray(m.bonsai)) return false;
  if (!Array.isArray(m.events)) return false;
  if (!Array.isArray(m.photos)) return false;
  return true;
}

/**
 * バックアップ ZIP からインポートする。
 *
 * フロー:
 * 1. File.pickFileAsync で ZIP 選択 (キャンセルなら null)
 * 2. cacheDirectory に展開 → manifest 読み出し
 * 3. schema_version 厳格一致チェック (`!== 1` で BackupError('schema'))
 * 4. buildAppendImportPlan で追加 / スキップ / invalid 判定
 * 5. 写真ファイル欠損なら BackupError('invalid')
 * 6. トランザクションで bonsai / events / photos を一括 INSERT、写真ファイルを document/photos へコピー
 * 7. 失敗時はコピー済み写真をクリーンアップ
 *
 * @returns 件数 (キャンセル時は null)
 */
export async function importBackup(): Promise<BackupImportResult | null> {
  if (Platform.OS === 'web') {
    throw new BackupError('unsupported');
  }

  // 1. ファイル選択 (新 API、expo-document-picker は使わない)
  let pickedFile: File;
  try {
    const picked = await File.pickFileAsync(undefined, 'application/zip');
    const file = Array.isArray(picked) ? picked[0] : picked;
    if (!file?.uri) {
      return null;
    }
    pickedFile = file;
  } catch {
    // ユーザがキャンセルした場合は null を返す (例外型はプラットフォームで揺れるため try/catch で吸収)
    return null;
  }

  const importRoot = makeWorkDirectory('bonsailog-import');

  try {
    // 2. unzip
    // File.pickFileAsync は選択ファイルの content:// スキームをそのまま返す
    // (expo-file-system 公式: "preserves its scheme — file:// or content://")。
    // react-native-zip-archive の unzip は実ファイルパスしか読めず、content:// を
    // 渡すとネイティブで NullPointerException クラッシュする。また File.copy() も
    // content:// ソースを reject するため、bytes() で読み出して cache 配下の実ファイルへ
    // 書き出してから解凍する (importRoot は finally で削除される)。
    let zipPathForUnzip: string;
    if (pickedFile.uri.startsWith('file://')) {
      zipPathForUnzip = stripFileScheme(pickedFile.uri);
    } else {
      const localZip = new File(importRoot, 'source.zip');
      localZip.create();
      localZip.write(await pickedFile.bytes());
      zipPathForUnzip = stripFileScheme(localZip.uri);
    }
    await unzip(zipPathForUnzip, stripFileScheme(importRoot.uri));

    const manifestRoot = findManifestRoot(importRoot);
    if (!manifestRoot) {
      throw new BackupError('invalid');
    }

    const manifestFile = new File(manifestRoot, BACKUP_MANIFEST);
    if (!manifestFile.exists) {
      throw new BackupError('invalid');
    }
    const raw = await manifestFile.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BackupError('invalid');
    }
    if (!isValidManifestShape(parsed)) {
      throw new BackupError('invalid');
    }
    const manifest = parsed;

    // 3. schema_version 厳格一致 (ADR-0007、AC4)
    if (manifest.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      throw new BackupError('schema');
    }

    const photosDir = new Directory(manifestRoot, BACKUP_PHOTOS_DIR);
    if (!photosDir.exists) {
      throw new BackupError('invalid');
    }

    // 4. 既存 ID 取得 + プラン構築
    const db = await getDb();
    const bonsaiRows = await db.getAllAsync<{ id: string }>('SELECT id FROM bonsai;');
    const eventRows = await db.getAllAsync<{ id: string }>('SELECT id FROM events;');
    const photoRows = await db.getAllAsync<{ id: string }>('SELECT id FROM photos;');
    const tagRows = await db.getAllAsync<{ id: string; name_normalized: string }>(
      'SELECT id, name_normalized FROM tags;',
    );
    const bonsaiTagRows = await db.getAllAsync<{ bonsai_id: string; tag_id: string }>(
      'SELECT bonsai_id, tag_id FROM bonsai_tags;',
    );
    const customSpeciesRows = await db.getAllAsync<{ id: string; name: string }>(
      'SELECT id, name FROM bonsai_species_custom;',
    );
    const customStyleRows = await db.getAllAsync<{ id: string; name: string }>(
      'SELECT id, name FROM bonsai_styles_custom;',
    );

    const plan = buildAppendImportPlan({
      bonsai: manifest.bonsai,
      events: manifest.events,
      photos: manifest.photos,
      tags: manifest.tags ?? [],
      bonsaiTags: manifest.bonsaiTags ?? [],
      customSpecies: manifest.customSpecies ?? [],
      customStyles: manifest.customStyles ?? [],
      existingBonsaiIds: new Set(bonsaiRows.map((r) => r.id)),
      existingEventIds: new Set(eventRows.map((r) => r.id)),
      existingPhotoIds: new Set(photoRows.map((r) => r.id)),
      existingTagIds: new Set(tagRows.map((r) => r.id)),
      existingTagNormalized: new Set(tagRows.map((r) => r.name_normalized)),
      existingBonsaiTagKeys: new Set(bonsaiTagRows.map((r) => bonsaiTagKey(r.bonsai_id, r.tag_id))),
      existingCustomSpeciesIds: new Set(customSpeciesRows.map((r) => r.id)),
      existingCustomSpeciesNames: new Set(customSpeciesRows.map((r) => r.name)),
      existingCustomStyleIds: new Set(customStyleRows.map((r) => r.id)),
      existingCustomStyleNames: new Set(customStyleRows.map((r) => r.name)),
    });

    if (plan.invalidEventRefs.length > 0 || plan.invalidPhotoRefs.length > 0) {
      throw new BackupError('invalid');
    }

    // 5. 写真ファイル欠損チェック (insert 対象のみ、AC5)
    for (const photo of plan.photosToInsert) {
      const sourceFile = new File(photosDir, photo.fileName);
      if (!sourceFile.exists) {
        throw new BackupError('invalid');
      }
    }

    // 6. INSERT + 写真コピー (失敗時はトランザクションロールバック + コピー済み写真も手動削除)
    const copiedPhotoPaths: string[] = [];
    try {
      await db.withTransactionAsync(async () => {
        // カスタム樹種/樹形を bonsai より先に (bonsai.custom_species_id が参照)。
        for (const sp of plan.customSpeciesToInsert) {
          await db.runAsync(
            'INSERT INTO bonsai_species_custom (id, name, created_at) VALUES (?, ?, ?);',
            [sp.id, sp.name, sp.createdAt],
          );
        }
        for (const st of plan.customStylesToInsert) {
          await db.runAsync(
            'INSERT INTO bonsai_styles_custom (id, name, created_at) VALUES (?, ?, ?);',
            [st.id, st.name, st.createdAt],
          );
        }

        for (const tree of plan.bonsaiToInsert) {
          await db.runAsync(
            `INSERT INTO bonsai
               (id, name, species_id, acquired_at, style, pot_info, estimated_age, memo,
                purchase_date, acquired_from, estimated_age_unknown, custom_species_id,
                archived_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              tree.id,
              tree.name,
              tree.speciesId ?? null,
              tree.acquiredAt ?? null,
              tree.style ?? null,
              tree.potInfo ?? null,
              tree.estimatedAge ?? null,
              tree.memo ?? null,
              tree.purchaseDate ?? null,
              tree.acquiredFrom ?? null,
              tree.estimatedAgeUnknown ?? 0,
              tree.customSpeciesId ?? null,
              tree.archivedAt ?? null,
              tree.createdAt,
              tree.updatedAt,
            ],
          );
        }

        // tags → bonsai_tags の順 (bonsai_tags は bonsai/tags を参照)。
        for (const tag of plan.tagsToInsert) {
          await db.runAsync(
            'INSERT INTO tags (id, name, name_normalized, created_at) VALUES (?, ?, ?, ?);',
            [tag.id, tag.name, tag.nameNormalized, tag.createdAt],
          );
        }

        for (const link of plan.bonsaiTagsToInsert) {
          await db.runAsync(
            'INSERT INTO bonsai_tags (bonsai_id, tag_id, created_at) VALUES (?, ?, ?);',
            [link.bonsaiId, link.tagId, link.createdAt],
          );
        }

        for (const event of plan.eventsToInsert) {
          await db.runAsync(
            `INSERT INTO events
               (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana,
                duration_min, payload_json, note, deleted_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              event.id,
              event.bonsaiId,
              event.type,
              event.status,
              event.occurredAtUtc,
              event.tzOffsetMin,
              event.tzIana,
              event.durationMin ?? null,
              event.payloadJson ?? null,
              event.note ?? null,
              event.deletedAt ?? null,
              event.createdAt,
              event.updatedAt,
            ],
          );
          // FTS5 同期 (active な event のみ note + payload を可検索化)
          if (event.deletedAt === null) {
            await db.runAsync(
              'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
              [event.id, event.bonsaiId, event.note ?? '', event.payloadJson ?? ''],
            );
          }
        }

        for (const photo of plan.photosToInsert) {
          // 写真ファイルを document/bonsailog/photos/<bonsaiId>/<photoId>.jpg に配置
          const targetDir = new Directory(
            Paths.document,
            PHOTO_PATH_ANCHOR.replace(/\/$/, ''),
            photo.bonsaiId,
          );
          if (!targetDir.exists) {
            targetDir.create({ intermediates: true });
          }
          const targetFile = new File(targetDir, photo.fileName);
          if (targetFile.exists) {
            targetFile.delete();
          }
          const sourceFile = new File(photosDir, photo.fileName);
          sourceFile.copy(targetFile);
          copiedPhotoPaths.push(targetFile.uri);

          const relativePath = toRelativePath(targetFile.uri, PHOTO_PATH_ANCHOR);
          await db.runAsync(
            `INSERT INTO photos
               (id, bonsai_id, event_id, relative_path, taken_at, is_cover, width, height,
                order_index, caption, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              photo.id,
              photo.bonsaiId,
              photo.eventId ?? null,
              relativePath,
              photo.takenAt ?? null,
              photo.isCover,
              photo.width ?? null,
              photo.height ?? null,
              photo.orderIndex,
              photo.caption ?? null,
              photo.createdAt,
            ],
          );
        }
      });
    } catch (error) {
      // トランザクション失敗時はコピー済みファイルを掃除
      for (const path of copiedPhotoPaths) {
        try {
          const f = new File(path);
          if (f.exists) f.delete();
        } catch {
          // best-effort
        }
      }
      throw error;
    }

    // 7. 設定 (好み) の引き継ぎ — 「完全なお引っ越し」。存在する項目のみ適用 (旧 ZIP 後方互換)。
    const s = manifest.settings;
    if (s?.language) {
      try {
        setLang(s.language as Lang);
      } catch {
        // 不正な言語コードは無視 (現在の言語のまま)
      }
    }
    if (s) {
      try {
        const store = useSettingsStore.getState();
        if (s.themeMode != null) store.setThemeMode(s.themeMode as ThemeMode);
        if (s.potUnit != null) store.setPotUnit(s.potUnit as PotUnit);
        if (s.notificationDailySummaryTime != null) {
          store.setNotificationDailySummaryTime(s.notificationDailySummaryTime);
        }
        if (s.notificationDailySummaryEnabled != null) {
          store.setNotificationDailySummaryEnabled(s.notificationDailySummaryEnabled);
          // 通知 ON の場合は新しい時刻で再スケジュール (設定画面と同じ流儀、t は復元後言語)。
          if (s.notificationDailySummaryEnabled) {
            void triggerSummaryReschedule(t);
          }
        }
      } catch {
        // 設定適用失敗は致命的でない (データ復元は完了済み)
      }
    }

    return {
      bonsai: plan.bonsaiToInsert.length,
      events: plan.eventsToInsert.length,
      photos: plan.photosToInsert.length,
    };
  } finally {
    safeDeleteDirectory(importRoot);
  }
}
