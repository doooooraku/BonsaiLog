// BonsaiLog — Export feature screens (CSV / PDF)
const {
  HT: _ET,
  HI: _EI,
  hSerifJa: _eSerifJa,
  hSansJa: _eSansJa,
  hMono: _eMono,
  BonsaiPlaceholder: _EBP,
  HStatusBar: _ESB,
} = window;

// ═════════════════════════════════════════════════════════════
// Export type catalog
// ═════════════════════════════════════════════════════════════
const EXPORT_TYPES = [
  {
    k: 'bonsai_csv',
    fmt: 'CSV',
    title: '盆栽一覧',
    sub: '全盆栽の基本情報',
    detail: '9列 · ID/名前/樹種(学名・通称)/購入日/樹形/アーカイブ/作成・更新日時',
    use: '手元のExcelで管理 · データポータビリティ',
  },
  {
    k: 'events_csv',
    fmt: 'CSV',
    title: '作業履歴',
    sub: '全作業履歴（盆栽結合済み）',
    detail: '12列 · 盆栽ID/名前/作業/日時/部位/量/メモ/写真件数 など',
    use: '青色申告 · 経年比較 · 確定申告',
  },
  {
    k: 'species_csv',
    fmt: 'CSV',
    title: '樹種別サマリ',
    sub: '樹種ごとの保有数・最終作業',
    detail: '8列 · 樹種/保有数/最終水やり/最終剪定/最終植替え など',
    use: 'コレクションの俯瞰',
  },
  {
    k: 'bonsai_pdf',
    fmt: 'PDF',
    title: '個別盆栽レポート',
    sub: '1本ずつの1ページサマリ',
    detail: 'A4縦 · カバー写真/基本情報/作業履歴サマリ/メモ',
    use: '展示会出品票 · 譲渡時の継承書類',
  },
  {
    k: 'list_pdf',
    fmt: 'PDF',
    title: '全盆栽リスト',
    sub: '全盆栽のリスト（複数ページ）',
    detail: 'A4縦 · 表紙/サムネイル付きリスト/統計',
    use: '保有資産一覧 · 棚整理',
  },
];

// ═════════════════════════════════════════════════════════════
// Screen 1: Export hub (Settings → Export)
// ═════════════════════════════════════════════════════════════
function ExportHubScreen({ onBack, onPick, isPro = true }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _ET.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_ESB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid ${_ET.border}`,
        }}
      >
        <button
          onClick={onBack}
          aria-label="戻る"
          style={{
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <_EI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _eSerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _ET.text,
            letterSpacing: '0.02em',
          }}
        >
          エクスポート
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: _eSerifJa,
              fontSize: 24,
              lineHeight: '34px',
              fontWeight: 500,
              color: _ET.text,
              letterSpacing: '0.02em',
            }}
          >
            あなたの記録を、
            <br />
            あなたの手元へ。
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: _eSansJa,
              fontSize: 14,
              lineHeight: '22px',
              color: _ET.sub,
            }}
          >
            全データはCSVまたはPDFで持ち出せます。Excelや紙の帳面と同じように、いつでもご自身で保管・共有できます。
          </div>
        </div>

        {/* CSV section */}
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 10,
            color: _ET.muted,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin: '8px 4px 8px',
          }}
        >
          CSV · 表計算ソフト用
        </div>
        {EXPORT_TYPES.filter((t) => t.fmt === 'CSV').map((t) => (
          <ExportRow key={t.k} t={t} onPick={() => onPick && onPick(t)} isPro={isPro} />
        ))}

        {/* PDF section */}
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 10,
            color: _ET.muted,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin: '24px 4px 8px',
          }}
        >
          PDF · 印刷・共有用
        </div>
        {EXPORT_TYPES.filter((t) => t.fmt === 'PDF').map((t) => (
          <ExportRow key={t.k} t={t} onPick={() => onPick && onPick(t)} isPro={isPro} />
        ))}
      </div>
    </div>
  );
}

function ExportRow({ t, onPick, isPro }) {
  return (
    <button
      onClick={onPick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px',
        marginBottom: 6,
        background: _ET.surface,
        border: `1px solid ${_ET.border}`,
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <FormatBadge fmt={t.fmt} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: _eSansJa, fontSize: 15, fontWeight: 500, color: _ET.text }}>
            {t.title}
          </span>
          {!isPro && (
            <span
              style={{
                fontFamily: _eMono,
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(198,158,72,0.18)',
                color: _ET.text,
                letterSpacing: '0.06em',
              }}
            >
              PRO
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: _eSansJa,
            fontSize: 12,
            color: _ET.sub,
            marginTop: 2,
            lineHeight: '18px',
          }}
        >
          {t.sub}
        </div>
      </div>
      <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}>
        <path
          d="M1 1l6 6-6 6"
          stroke={_ET.muted}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function FormatBadge({ fmt }) {
  const isCSV = fmt === 'CSV';
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        flexShrink: 0,
        background: isCSV ? 'rgba(31,58,46,0.08)' : 'rgba(198,158,72,0.14)',
        border: `1px solid ${isCSV ? _ET.primary : 'var(--accent-gold)'}`,
        display: 'grid',
        placeItems: 'center',
        fontFamily: _eMono,
        fontSize: 11,
        fontWeight: 600,
        color: isCSV ? _ET.primary : '#8c6b25',
        letterSpacing: '0.06em',
      }}
    >
      {fmt}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Screen 2: Options bottom sheet
// ═════════════════════════════════════════════════════════════
function ExportOptionsSheet({ type, onDismiss, onGenerate }) {
  const [period, setPeriod] = React.useState('all');
  const [scope, setScope] = React.useState('all');
  const [includePhotos, setIncludePhotos] = React.useState(type?.fmt === 'PDF');
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState('2026-03-25');
  const [dateTo, setDateTo] = React.useState('2026-04-24');

  const periods = [
    { v: 'all', l: 'すべて' },
    { v: '30d', l: '過去30日' },
    { v: '1y', l: '過去1年' },
    { v: 'custom', l: '期間を指定' },
  ];

  const filename = (() => {
    const base = type?.k || 'export';
    const date = '2026-04-24';
    const ext = type?.fmt === 'CSV' ? 'csv' : 'pdf';
    return `bonsailog-${base.replace(/_csv|_pdf/, '')}-${date}.${ext}`;
  })();

  return (
    <React.Fragment>
      <div
        onClick={onDismiss}
        style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,26,0.4)', zIndex: 70 }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 71,
          height: '78%',
          background: _ET.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            background: _ET.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div
          style={{
            padding: '8px 24px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <FormatBadge fmt={type?.fmt} />
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: _eSerifJa,
                fontSize: 18,
                fontWeight: 500,
                color: _ET.text,
                letterSpacing: '0.02em',
                lineHeight: '24px',
              }}
            >
              {type?.title}
            </div>
            <div style={{ fontFamily: _eSansJa, fontSize: 12, color: _ET.sub, marginTop: 2 }}>
              {type?.sub}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }}>
          <_OptField label="期間">
            <_OptSeg items={periods} value={period} onChange={setPeriod} />
            {period === 'custom' && (
              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: '1fr 12px 1fr',
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                <_DateInput label="開始" value={dateFrom} onChange={setDateFrom} max={dateTo} />
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: _eMono,
                    fontSize: 13,
                    color: _ET.muted,
                    textAlign: 'center',
                  }}
                >
                  —
                </span>
                <_DateInput label="終了" value={dateTo} onChange={setDateTo} min={dateFrom} />
              </div>
            )}
          </_OptField>

          {(type?.k === 'events_csv' || type?.k === 'bonsai_pdf' || type?.k === 'list_pdf') && (
            <_OptField label="対象">
              <_OptSeg
                items={[
                  { v: 'all', l: 'すべて' },
                  { v: 'sel', l: '選択した盆栽' },
                  { v: 'tag', l: 'タグで絞込' },
                ]}
                value={scope}
                onChange={setScope}
              />
              {scope === 'sel' && (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: _eMono,
                    fontSize: 11,
                    color: _ET.muted,
                    letterSpacing: '0.06em',
                  }}
                >
                  3件選択中 · 父の黒松, 真柏・枝枯れ, 五葉松
                </div>
              )}
            </_OptField>
          )}

          {type?.fmt === 'PDF' && (
            <_OptField label="オプション">
              <_OptToggle label="写真を含める" value={includePhotos} onChange={setIncludePhotos} />
              <div style={{ height: 1, background: _ET.border, margin: '4px 0' }} />
              <_OptToggle
                label="アーカイブも含める"
                value={includeArchived}
                onChange={setIncludeArchived}
              />
            </_OptField>
          )}
          {type?.fmt === 'CSV' && (
            <_OptField label="オプション">
              <_OptToggle
                label="アーカイブも含める"
                value={includeArchived}
                onChange={setIncludeArchived}
              />
            </_OptField>
          )}

          <_OptField label="ファイル名">
            <div
              style={{
                height: 48,
                padding: '0 14px',
                borderRadius: 12,
                background: _ET.surface,
                border: `1px solid ${_ET.border}`,
                display: 'flex',
                alignItems: 'center',
                fontFamily: _eMono,
                fontSize: 13,
                color: _ET.text,
              }}
            >
              {filename}
            </div>
          </_OptField>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 34px',
            background: _ET.bg,
            borderTop: `1px solid ${_ET.border}`,
          }}
        >
          <button
            onClick={onGenerate}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: _ET.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _eSansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            生成して共有
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

function _OptField({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: _eSansJa,
          fontSize: 13,
          fontWeight: 500,
          color: _ET.sub,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
function _OptSeg({ items, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it) => {
        const on = value === it.v;
        return (
          <button
            key={it.v}
            onClick={() => onChange && onChange(it.v)}
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 8,
              background: on ? _ET.primary : 'transparent',
              color: on ? '#F7F3E8' : _ET.sub,
              border: `1px solid ${on ? _ET.primary : _ET.border}`,
              fontFamily: _eSansJa,
              fontSize: 13,
              fontWeight: on ? 500 : 400,
              cursor: 'pointer',
            }}
          >
            {it.l}
          </button>
        );
      })}
    </div>
  );
}
function _DateInput({ label, value, onChange, min, max }) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: _eMono,
          fontSize: 10,
          color: _ET.muted,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          height: 44,
          padding: '0 12px',
          borderRadius: 10,
          background: _ET.surface,
          border: `1px solid ${_ET.border}`,
          fontFamily: _eMono,
          fontSize: 13,
          color: _ET.text,
          letterSpacing: '0.04em',
          appearance: 'none',
          WebkitAppearance: 'none',
          minWidth: 0,
          width: '100%',
        }}
      />
    </label>
  );
}
function _OptToggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange && onChange(!value)}
      style={{
        width: '100%',
        minHeight: 48,
        padding: '0 14px',
        background: _ET.surface,
        border: `1px solid ${_ET.border}`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        marginBottom: 0,
      }}
    >
      <span style={{ fontFamily: _eSansJa, fontSize: 14, color: _ET.text }}>{label}</span>
      <span
        style={{
          width: 36,
          height: 22,
          borderRadius: 11,
          background: value ? _ET.primary : _ET.border,
          position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 16 : 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: '#F7F3E8',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            transition: 'left 0.15s',
          }}
        />
      </span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════
// Screen 3: Generating progress overlay
// ═════════════════════════════════════════════════════════════
function ExportProgressOverlay({ type, onCancel }) {
  return (
    <React.Fragment>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,26,0.55)', zIndex: 80 }}
      />
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 81,
          background: _ET.bg,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <FormatBadge fmt={type?.fmt} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: _eSerifJa,
                fontSize: 17,
                fontWeight: 500,
                color: _ET.text,
                letterSpacing: '0.02em',
              }}
            >
              {type?.title}を生成中
            </div>
          </div>
        </div>

        {/* Indeterminate spinner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 0 8px',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" role="progressbar" aria-label="生成中">
            <circle cx="20" cy="20" r="16" fill="none" stroke={_ET.border} strokeWidth="3" />
            <path
              d="M 20 4 A 16 16 0 0 1 36 20"
              fill="none"
              stroke={_ET.primary}
              strokeWidth="3"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 20 20"
                to="360 20 20"
                dur="1.1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 8,
              background: 'transparent',
              color: _ET.sub,
              border: `1px solid ${_ET.border}`,
              fontFamily: _eSansJa,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ═════════════════════════════════════════════════════════════
// Screen 4: iOS Share Sheet
// ═════════════════════════════════════════════════════════════
function ShareSheetScreen({ type, onDismiss, onPreview }) {
  const filename = (() => {
    const base = (type?.k || 'export').replace(/_csv|_pdf/, '');
    const ext = type?.fmt === 'CSV' ? 'csv' : 'pdf';
    return `bonsailog-${base}-2026-04-24.${ext}`;
  })();
  const apps = [
    { e: '💬', l: 'メッセージ' },
    { e: '✉️', l: 'メール' },
    { e: '☁️', l: 'iCloud' },
    { e: '📁', l: 'ファイル' },
    { e: '🟢', l: 'LINE' },
    { e: '🟦', l: 'Drive' },
  ];
  const actions = [
    { e: '⎙', l: 'プリント' },
    { e: '📋', l: 'コピー' },
    { e: '⤓', l: '保存' },
  ];
  return (
    <React.Fragment>
      <div
        onClick={onDismiss}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 80 }}
      />
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 8,
          zIndex: 81,
          background: 'rgba(245,243,237,0.96)',
          backdropFilter: 'blur(20px)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* File card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 16px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 60,
              borderRadius: 6,
              background: type?.fmt === 'CSV' ? '#E8F0EA' : '#F5EDD8',
              border: `1px solid ${type?.fmt === 'CSV' ? _ET.primary : 'var(--accent-gold)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: _eMono,
                fontSize: 11,
                fontWeight: 700,
                color: type?.fmt === 'CSV' ? _ET.primary : '#8c6b25',
                letterSpacing: '0.06em',
              }}
            >
              {type?.fmt}
            </div>
            {/* Folded corner */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 10,
                height: 10,
                background: _ET.bg,
                borderLeft: '1px solid rgba(0,0,0,0.1)',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: _eSansJa,
                fontSize: 14,
                fontWeight: 500,
                color: _ET.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {filename}
            </div>
            <div
              style={{
                fontFamily: _eMono,
                fontSize: 11,
                color: _ET.muted,
                letterSpacing: '0.04em',
                marginTop: 2,
              }}
            >
              {type?.title}
            </div>
          </div>
          <button
            onClick={onPreview}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              background: 'rgba(31,58,46,0.1)',
              color: _ET.primary,
              border: 'none',
              fontFamily: _eSansJa,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            プレビュー
          </button>
        </div>

        {/* App row */}
        <div
          style={{
            display: 'flex',
            gap: 18,
            padding: '16px 16px 14px',
            overflowX: 'auto',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {apps.map((a, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                width: 60,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 30,
                }}
              >
                {a.e}
              </div>
              <div
                style={{ fontFamily: _eSansJa, fontSize: 11, color: _ET.text, textAlign: 'center' }}
              >
                {a.l}
              </div>
            </div>
          ))}
        </div>

        {/* Action list */}
        <div style={{ padding: '4px 0' }}>
          {actions.map((a, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < actions.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <span style={{ fontFamily: _eSansJa, fontSize: 15, color: _ET.text }}>{a.l}</span>
              <span style={{ fontSize: 18 }}>{a.e}</span>
            </div>
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onDismiss}
          style={{
            width: 'calc(100% - 16px)',
            margin: '8px 8px 8px',
            height: 50,
            borderRadius: 14,
            background: '#fff',
            border: 'none',
            fontFamily: _eSansJa,
            fontSize: 17,
            fontWeight: 500,
            color: _ET.primary,
            cursor: 'pointer',
          }}
        >
          キャンセル
        </button>
        <div style={{ height: 8 }} />
      </div>
    </React.Fragment>
  );
}

// ═════════════════════════════════════════════════════════════
// Screen 5: PDF preview — Individual bonsai report (1 page)
// ═════════════════════════════════════════════════════════════
function PDFBonsaiReportScreen({ onBack, onShare }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#3A3833',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* iOS-style top bar (white-on-dark for PDF reader feel) */}
      <_ESB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          background: '#3A3833',
        }}
      >
        <button
          onClick={onBack}
          aria-label="戻る"
          style={{
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 4l-6 6 6 6"
              stroke="#F7F3E8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div style={{ position: 'absolute', left: 56, right: 56, textAlign: 'center' }}>
          <div style={{ fontFamily: _eSansJa, fontSize: 14, fontWeight: 500, color: '#F7F3E8' }}>
            父の黒松.pdf
          </div>
          <div
            style={{
              fontFamily: _eMono,
              fontSize: 10,
              color: 'rgba(247,243,232,0.5)',
              letterSpacing: '0.08em',
              marginTop: 2,
            }}
          >
            1 / 1
          </div>
        </div>
        <button
          onClick={onShare}
          aria-label="共有"
          style={{
            position: 'absolute',
            right: 8,
            top: 4,
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 2v12M11 2L7 6M11 2l4 4M3 11v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"
              stroke="#F7F3E8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Page area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 14px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PDFA4Page>
          <PDFBonsaiPage />
        </PDFA4Page>
      </div>
    </div>
  );
}

// A4 portrait shell — 210×297mm at 1.18 px/mm = 248×350px. Use 340×481 to fit phone width.
function PDFA4Page({ children, idx, total }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 340,
          height: 481,
          background: '#FBFAF6',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 1,
        }}
      >
        {children}
      </div>
      {idx !== undefined && (
        <div
          style={{
            marginTop: 8,
            fontFamily: _eMono,
            fontSize: 10,
            color: 'rgba(247,243,232,0.5)',
            letterSpacing: '0.08em',
          }}
        >
          {idx} / {total}
        </div>
      )}
    </div>
  );
}

// PDF page content — individual bonsai report
function PDFBonsaiPage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '24px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid #C9C2AE',
          paddingBottom: 6,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 7,
            color: '#7A7460',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          BonsaiLog · 個別レポート
        </div>
        <div style={{ fontFamily: _eMono, fontSize: 7, color: '#7A7460', letterSpacing: '0.08em' }}>
          2026-04-24
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontFamily: _eSerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: '#1A1A1A',
            letterSpacing: '0.02em',
            lineHeight: '24px',
          }}
        >
          父の黒松
        </div>
        <div style={{ fontFamily: _eSansJa, fontSize: 9, color: '#5A5A5A', marginTop: 3 }}>
          <span style={{ fontFamily: 'var(--font-display-latin)', fontStyle: 'italic' }}>
            Pinus thunbergii
          </span>
          <span style={{ margin: '0 4px' }}>·</span>黒松<span style={{ margin: '0 4px' }}>·</span>
          模様木
        </div>
      </div>

      {/* Photo + meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, marginBottom: 14 }}>
        <_EBP w={130} h={130} radius={3} seed={0} />
        <div style={{ fontFamily: _eMono, fontSize: 8, color: '#1A1A1A', lineHeight: '14px' }}>
          <_PDFMeta k="銘" v="老松" />
          <_PDFMeta k="入手日" v="2020-03-15" />
          <_PDFMeta k="入手元" v="父より継承" />
          <_PDFMeta k="樹齢推定" v="35年" />
          <_PDFMeta k="樹高" v="42 cm" />
          <_PDFMeta k="鉢サイズ" v="18 cm 釉薬鉢" last />
        </div>
      </div>

      {/* Section: Care summary */}
      <_PDFSection title="作業履歴サマリ（過去90日）">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { l: '水やり', v: '37回', sub: '平均2.4日' },
            { l: '剪定', v: '2回', sub: '最終 4/20' },
            { l: '施肥', v: '1回', sub: '最終 4/10' },
            { l: '針金', v: '装着中', sub: '2mm·8w目安' },
          ].map((s, i) => (
            <div
              key={i}
              style={{ padding: '6px 4px', border: '1px solid #C9C2AE', borderRadius: 2 }}
            >
              <div
                style={{
                  fontFamily: _eMono,
                  fontSize: 6,
                  color: '#7A7460',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {s.l}
              </div>
              <div
                style={{
                  fontFamily: _eSerifJa,
                  fontSize: 13,
                  color: '#1A1A1A',
                  fontWeight: 500,
                  marginTop: 1,
                }}
              >
                {s.v}
              </div>
              <div style={{ fontFamily: _eMono, fontSize: 7, color: '#5A5A5A', marginTop: 1 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </_PDFSection>

      {/* Section: Recent events */}
      <_PDFSection title="最近の作業（10件）">
        <table
          style={{
            width: '100%',
            fontFamily: _eMono,
            fontSize: 7,
            color: '#1A1A1A',
            borderCollapse: 'collapse',
            lineHeight: '12px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '2px 4px 2px 0',
                  width: 60,
                  fontSize: 6,
                  color: '#7A7460',
                  letterSpacing: '0.08em',
                }}
              >
                DATE
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '2px 4px',
                  width: 48,
                  fontSize: 6,
                  color: '#7A7460',
                  letterSpacing: '0.08em',
                }}
              >
                TYPE
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '2px 0',
                  fontSize: 6,
                  color: '#7A7460',
                  letterSpacing: '0.08em',
                }}
              >
                NOTE
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ['04-24', '水やり', 'たっぷり、朝'],
              ['04-22', '水やり', '—'],
              ['04-20', '剪定', '徒長枝2本カット'],
              ['04-19', '水やり', '—'],
              ['04-17', '水やり', '軽く'],
              ['04-15', '針金がけ', '幹2mm 8週'],
              ['04-13', '水やり', '—'],
              ['04-10', '施肥', '置肥 バイオゴールド'],
              ['04-08', '水やり', '—'],
              ['04-05', '観察', '新芽が伸びてきた'],
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: i < 9 ? '1px solid #E8E2D2' : 'none' }}>
                <td style={{ padding: '2px 4px 2px 0', whiteSpace: 'nowrap' }}>{r[0]}</td>
                <td style={{ padding: '2px 4px', fontFamily: _eSansJa, fontSize: 7 }}>{r[1]}</td>
                <td
                  style={{ padding: '2px 0', fontFamily: _eSansJa, fontSize: 7, color: '#5A5A5A' }}
                >
                  {r[2]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </_PDFSection>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid #C9C2AE',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: _eMono,
          fontSize: 6,
          color: '#7A7460',
          letterSpacing: '0.08em',
        }}
      >
        <span>BonsaiLog · 父の黒松</span>
        <span>1 / 1</span>
      </div>
    </div>
  );
}

function _PDFMeta({ k, v, last }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: last ? 'none' : '1px dotted #C9C2AE',
        padding: '1px 0',
      }}
    >
      <span style={{ color: '#7A7460', fontSize: 7 }}>{k}</span>
      <span style={{ fontFamily: _eSansJa, fontSize: 8, fontWeight: 500 }}>{v}</span>
    </div>
  );
}
function _PDFSection({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: _eMono,
          fontSize: 7,
          color: '#7A7460',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 6,
          paddingBottom: 2,
          borderBottom: '0.5px solid #1A1A1A',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Screen 6: PDF preview — Full list (multi-page)
// ═════════════════════════════════════════════════════════════
function PDFListReportScreen({ onBack, onShare }) {
  const [pageIdx, setPageIdx] = React.useState(0);
  const pages = [{ kind: 'cover' }, { kind: 'list' }, { kind: 'stats' }];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#3A3833',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_ESB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          background: '#3A3833',
        }}
      >
        <button
          onClick={onBack}
          aria-label="戻る"
          style={{
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 4l-6 6 6 6"
              stroke="#F7F3E8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div style={{ position: 'absolute', left: 56, right: 56, textAlign: 'center' }}>
          <div style={{ fontFamily: _eSansJa, fontSize: 14, fontWeight: 500, color: '#F7F3E8' }}>
            全盆栽リスト.pdf
          </div>
          <div
            style={{
              fontFamily: _eMono,
              fontSize: 10,
              color: 'rgba(247,243,232,0.5)',
              letterSpacing: '0.08em',
              marginTop: 2,
            }}
          >
            {pageIdx + 1} / {pages.length}
          </div>
        </div>
        <button
          onClick={onShare}
          aria-label="共有"
          style={{
            position: 'absolute',
            right: 8,
            top: 4,
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 2v12M11 2L7 6M11 2l4 4M3 11v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"
              stroke="#F7F3E8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 14px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <PDFA4Page idx={1} total={3}>
          <PDFListCover />
        </PDFA4Page>
        <PDFA4Page idx={2} total={3}>
          <PDFListPage />
        </PDFA4Page>
        <PDFA4Page idx={3} total={3}>
          <PDFListStatsPage />
        </PDFA4Page>
      </div>

      {/* Page indicator */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 34,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          padding: '10px 0',
          background: 'rgba(58,56,51,0.95)',
        }}
      >
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 10,
            color: '#F7F3E8',
            letterSpacing: '0.08em',
            opacity: 0.6,
          }}
        >
          3ページのPDF · スクロールで確認
        </div>
      </div>
    </div>
  );
}

function PDFListCover() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '40px 28px 28px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 8,
            color: '#7A7460',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          BonsaiLog · 全盆栽リスト
        </div>
        <div
          style={{
            fontFamily: _eSerifJa,
            fontSize: 32,
            fontWeight: 500,
            color: '#1A1A1A',
            letterSpacing: '0.02em',
            lineHeight: '42px',
          }}
        >
          わたしの
          <br />
          盆栽棚
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display-latin)',
            fontStyle: 'italic',
            fontSize: 14,
            color: '#7A7460',
            marginTop: 8,
          }}
        >
          My Bonsai Collection
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 24 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <_EBP key={i} w={130} h={90} radius={3} seed={i} />
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            borderTop: '1px solid #C9C2AE',
            paddingTop: 10,
            fontFamily: _eMono,
            fontSize: 8,
            color: '#7A7460',
            lineHeight: '14px',
            letterSpacing: '0.06em',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>発行日</span>
            <span>2026-04-24</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>記録期間</span>
            <span>2017-09-30 〜 2026-04-24</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>盆栽総数</span>
            <span>5本（アーカイブ除く）</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>樹種</span>
            <span>5種</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>記録総数</span>
            <span>1,247件</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: _eMono,
          fontSize: 6,
          color: '#7A7460',
          letterSpacing: '0.08em',
        }}
      >
        <span>BonsaiLog</span>
        <span>1 / 3</span>
      </div>
    </div>
  );
}

function PDFListPage() {
  const items = [
    {
      name: '父の黒松',
      sci: 'Pinus thunbergii',
      sp: '黒松',
      acquired: '2020-03-15',
      age: '6年',
      ageEst: '35年',
      height: '42 cm',
      seed: 0,
    },
    {
      name: '真柏・枝枯れ',
      sci: 'Juniperus chinensis',
      sp: '真柏',
      acquired: '2018-11-02',
      age: '8年',
      ageEst: '40年',
      height: '38 cm',
      seed: 1,
    },
    {
      name: 'モミジ・夏',
      sci: 'Acer palmatum',
      sp: 'モミジ',
      acquired: '2022-04-08',
      age: '4年',
      ageEst: '12年',
      height: '28 cm',
      seed: 2,
    },
    {
      name: 'ガジュマル',
      sci: 'Ficus retusa',
      sp: 'ガジュマル',
      acquired: '2024-06-20',
      age: '1.8年',
      ageEst: '8年',
      height: '22 cm',
      seed: 3,
    },
    {
      name: '五葉松',
      sci: 'Pinus parviflora',
      sp: '五葉松',
      acquired: '2017-09-30',
      age: '9年',
      ageEst: '45年',
      height: '52 cm',
      seed: 4,
    },
  ];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '22px 22px 14px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid #C9C2AE',
          paddingBottom: 5,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 7,
            color: '#7A7460',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          盆栽一覧 · 5本
        </div>
        <div style={{ fontFamily: _eMono, fontSize: 7, color: '#7A7460', letterSpacing: '0.08em' }}>
          2026-04-24
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr',
              gap: 10,
              paddingBottom: 8,
              borderBottom: i < items.length - 1 ? '0.5px solid #C9C2AE' : 'none',
            }}
          >
            <_EBP w={70} h={56} radius={2} seed={it.seed} />
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <div
                  style={{
                    fontFamily: _eSerifJa,
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1A1A1A',
                    letterSpacing: '0.02em',
                  }}
                >
                  {it.name}
                </div>
                <div style={{ fontFamily: _eMono, fontSize: 7, color: '#7A7460' }}>#{i + 1}</div>
              </div>
              <div style={{ fontFamily: _eSansJa, fontSize: 8, color: '#5A5A5A', marginTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-display-latin)', fontStyle: 'italic' }}>
                  {it.sci}
                </span>
                <span style={{ margin: '0 4px' }}>·</span>
                {it.sp}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  marginTop: 4,
                  fontFamily: _eMono,
                  fontSize: 7,
                  color: '#1A1A1A',
                }}
              >
                <div>
                  <span style={{ color: '#7A7460' }}>入手 </span>
                  {it.acquired}
                </div>
                <div>
                  <span style={{ color: '#7A7460' }}>飼育 </span>
                  {it.age}
                </div>
                <div>
                  <span style={{ color: '#7A7460' }}>樹齢 </span>
                  {it.ageEst}
                </div>
                <div>
                  <span style={{ color: '#7A7460' }}>樹高 </span>
                  {it.height}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: '1px solid #C9C2AE',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: _eMono,
          fontSize: 6,
          color: '#7A7460',
          letterSpacing: '0.08em',
        }}
      >
        <span>BonsaiLog · 全盆栽リスト</span>
        <span>2 / 3</span>
      </div>
    </div>
  );
}

function PDFListStatsPage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '22px 22px 14px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid #C9C2AE',
          paddingBottom: 5,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: _eMono,
            fontSize: 7,
            color: '#7A7460',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          統計 · 過去1年
        </div>
        <div style={{ fontFamily: _eMono, fontSize: 7, color: '#7A7460', letterSpacing: '0.08em' }}>
          2026-04-24
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}
      >
        {[
          { l: '記録総数', v: '1,247', s: '件' },
          { l: '水やり', v: '1,089', s: '件' },
          { l: '剪定', v: '42', s: '件' },
          { l: '施肥', v: '28', s: '件' },
          { l: '植替え', v: '5', s: '件' },
          { l: '消毒', v: '12', s: '件' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '6px 8px', border: '1px solid #C9C2AE', borderRadius: 2 }}>
            <div
              style={{
                fontFamily: _eMono,
                fontSize: 6,
                color: '#7A7460',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {s.l}
            </div>
            <div
              style={{
                fontFamily: _eSerifJa,
                fontSize: 16,
                color: '#1A1A1A',
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              {s.v}
              <span style={{ fontFamily: _eMono, fontSize: 8, color: '#5A5A5A', marginLeft: 2 }}>
                {s.s}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Species breakdown */}
      <_PDFSection title="樹種別保有数">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { l: '黒松', c: 1, w: 100 },
            { l: '真柏', c: 1, w: 100 },
            { l: 'モミジ', c: 1, w: 100 },
            { l: '五葉松', c: 1, w: 100 },
            { l: 'ガジュマル', c: 1, w: 100 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 30px',
                alignItems: 'center',
                gap: 6,
                fontFamily: _eMono,
                fontSize: 8,
                color: '#1A1A1A',
              }}
            >
              <div style={{ fontFamily: _eSansJa }}>{s.l}</div>
              <div
                style={{ height: 8, background: '#E8E2D2', borderRadius: 1, overflow: 'hidden' }}
              >
                <div style={{ width: `${s.w}%`, height: '100%', background: '#1F3A2E' }} />
              </div>
              <div style={{ textAlign: 'right' }}>{s.c}本</div>
            </div>
          ))}
        </div>
      </_PDFSection>

      {/* Monthly events bar */}
      <_PDFSection title="月別記録数（2025年5月〜2026年4月）">
        <div
          style={{
            display: 'flex',
            alignItems: 'end',
            gap: 2,
            height: 60,
            borderBottom: '0.5px solid #1A1A1A',
            paddingBottom: 0,
          }}
        >
          {[68, 82, 124, 142, 98, 76, 52, 48, 68, 118, 156, 215].map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(v / 215) * 100}%`,
                background: '#1F3A2E',
                borderRadius: '1px 1px 0 0',
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 3,
            fontFamily: _eMono,
            fontSize: 6,
            color: '#7A7460',
            letterSpacing: '0.04em',
          }}
        >
          <span>5月</span>
          <span>7月</span>
          <span>9月</span>
          <span>11月</span>
          <span>1月</span>
          <span>3月</span>
          <span>4月</span>
        </div>
      </_PDFSection>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid #C9C2AE',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: _eMono,
          fontSize: 6,
          color: '#7A7460',
          letterSpacing: '0.08em',
        }}
      >
        <span>BonsaiLog · 統計</span>
        <span>3 / 3</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  EXPORT_TYPES,
  ExportHubScreen,
  ExportOptionsSheet,
  ExportProgressOverlay,
  ShareSheetScreen,
  PDFBonsaiReportScreen,
  PDFListReportScreen,
  PDFA4Page,
  PDFBonsaiPage,
  PDFListCover,
  PDFListPage,
  PDFListStatsPage,
});
