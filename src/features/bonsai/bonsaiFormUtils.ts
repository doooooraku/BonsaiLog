/**
 * BonsaiBasicForm の純粋ユーティリティ (Phase 4 A2 で characterization テスト用に抽出)。
 *
 * 日付の ISO ⇄ YYYY-MM-DD 変換と、 pot_info JSON の安全な復元。
 * いずれも I/O / state を持たない純関数 → jest で凍結 (form 本体は分割せず orchestrator のまま、
 * 壊れやすい JSON parse / 日付境界だけを切り出して安全網を張る。master-plan A2 / ADR-0045)。
 */
import { nowUtc } from '@/src/core/datetime';

/** YYYY-MM-DD → ISO 8601 UTC TEXT (00:00:00Z)。不正形式は nowUtc() を返す (ADR-0008 §TZ)。 */
export function toIsoUtc(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return nowUtc();
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

/** ISO 8601 → YYYY-MM-DD (UI 入力欄 prefill 用、null/不正値は空文字)。 */
export function isoToYmd(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '';
  return iso.slice(0, 10);
}

/** pot_info JSON 復元用 shape。JSON.parse の any を堰き止め、 各 field は typeof ガードで検証。 */
type ParsedPotInfo = {
  description?: string;
  widthCm?: number;
  depthCm?: number;
  material?: string;
};

/** parsePotInfo の返り値 (UI フィールド初期値、 cm 単位の生値 + 自動展開フラグ)。 */
export type PotInfoFields = {
  description: string;
  /** cm 保存値 (表示時は cmToUnit で displayPotUnit へ変換)。未設定/不正は null。 */
  widthCm: number | null;
  depthCm: number | null;
  material: string;
  /** 値があれば鉢情報セクションを自動展開 (Q-17 a)。 */
  expanded: boolean;
};

/**
 * pot_info JSON を form フィールド初期値へ安全に復元する (Sess13 PR-I 新形式 + 旧 description 後方互換)。
 * JSON.parse 失敗や型不一致は全フィールド空 (expanded=false) にフォールバック (throw しない)。
 */
export function parsePotInfo(potInfo: string | null | undefined): PotInfoFields {
  try {
    const parsed: ParsedPotInfo | null = potInfo ? (JSON.parse(potInfo) as ParsedPotInfo) : null;
    const widthCm = typeof parsed?.widthCm === 'number' ? parsed.widthCm : null;
    const depthCm = typeof parsed?.depthCm === 'number' ? parsed.depthCm : null;
    return {
      description: typeof parsed?.description === 'string' ? parsed.description : '',
      widthCm,
      depthCm,
      material: typeof parsed?.material === 'string' ? parsed.material : '',
      expanded: widthCm != null || depthCm != null || (parsed?.material?.length ?? 0) > 0,
    };
  } catch {
    return { description: '', widthCm: null, depthCm: null, material: '', expanded: false };
  }
}
