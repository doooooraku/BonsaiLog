// BonsaiLog — Bonsai Detail (timeline / history / photos)

const {
  HT: _DHT,
  HI: _DHI,
  hSerifJa: _dSerifJa,
  hSansJa: _dSansJa,
  hMono: _dMono,
  BonsaiPlaceholder: _DBP,
} = window;

// Hero photo
function DetailHero({ bonsai }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 280 }}>
      <_DBP w={393} h={280} radius={0} seed={bonsai.idx || 0} />
      {/* gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/* info overlay */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 20,
          color: '#fff',
        }}
      >
        <div
          style={{
            fontFamily: _dSerifJa,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: '36px',
            letterSpacing: '0.02em',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        >
          {bonsai.name}
        </div>
        <div
          style={{
            fontFamily: _dSansJa,
            fontSize: 14,
            opacity: 0.92,
            marginTop: 4,
            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        >
          {bonsai.species}
          <span
            style={{ fontFamily: 'var(--font-display-latin)', fontStyle: 'italic', marginLeft: 6 }}
          >
            / {bonsai.latin}
          </span>
        </div>
        {bonsai.style && (
          <div
            style={{
              fontFamily: _dMono,
              fontSize: 11,
              opacity: 0.75,
              marginTop: 4,
              letterSpacing: '0.12em',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {bonsai.style}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailHeader({ onBack, title, onOpenMenu }) {
  return (
    <div
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: _DHT.bg,
        borderBottom: `1px solid ${_DHT.border}`,
        position: 'relative',
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
        <_DHI.Back />
      </button>
      <div
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          textAlign: 'center',
          fontFamily: _dSerifJa,
          fontSize: 20,
          fontWeight: 500,
          color: _DHT.text,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
        }}
      >
        {title}
      </div>
      <button
        onClick={onOpenMenu}
        aria-label="その他のアクション"
        style={{
          width: 48,
          height: 48,
          marginLeft: 'auto',
          display: 'grid',
          placeItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="5" cy="11" r="1.6" fill={_DHT.text} />
          <circle cx="11" cy="11" r="1.6" fill={_DHT.text} />
          <circle cx="17" cy="11" r="1.6" fill={_DHT.text} />
        </svg>
      </button>
    </div>
  );
}

// Bottom sheet — 「…」メニュー（基本情報編集 / PDF / アーカイブ）
// 共有は削除（v1.5）。削除は出さない：アーカイブで復元可、削除は設定→アーカイブから（哲学整合）
function DetailMoreMenu({ bonsai, onClose, onEditBasic, onExportPdf, onArchive }) {
  const items = [
    {
      k: 'edit',
      label: '基本情報を編集',
      sub: '名前・樹種・樹形・樹齢などを変更',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M14 3l5 5-9 9H5v-5l9-9z"
            stroke={_DHT.text}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M13 4l5 5" stroke={_DHT.text} strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      k: 'pdf',
      label: 'PDFで書き出し',
      sub: '台帳ページとして印刷可',
      pro: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M5 2h8l4 4v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z"
            stroke={_DHT.text}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M13 2v4h4" stroke={_DHT.text} strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d="M6 12h2M6 15h6M6 9h2"
            stroke={_DHT.text}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      k: 'archive',
      label: 'この盆栽をアーカイブ',
      sub: '履歴は残ります。いつでも復元できます',
      danger: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="4" width="16" height="4" rx="1" stroke={_DHT.danger} strokeWidth="1.5" />
          <path
            d="M5 8v9a2 2 0 002 2h8a2 2 0 002-2V8"
            stroke={_DHT.danger}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9 12h4" stroke={_DHT.danger} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <React.Fragment>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,26,26,0.4)',
          zIndex: 80,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 81,
          background: _DHT.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          paddingBottom: 34,
        }}
      >
        <div
          style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            background: _DHT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '8px 24px 16px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: _dSerifJa,
              fontSize: 16,
              fontWeight: 500,
              color: _DHT.sub,
              letterSpacing: '0.02em',
            }}
          >
            {bonsai?.name || ''}
          </div>
        </div>
        <div style={{ padding: '0 8px' }}>
          {items.map((it) => {
            const handler =
              it.k === 'edit'
                ? onEditBasic
                : it.k === 'pdf'
                  ? onExportPdf
                  : it.k === 'archive'
                    ? onArchive
                    : null;
            return (
              <button
                key={it.k}
                onClick={() => {
                  handler && handler();
                }}
                style={{
                  width: '100%',
                  minHeight: 64,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: _DHT.surface,
                    border: `1px solid ${_DHT.border}`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {it.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: _dSansJa,
                      fontSize: 15,
                      fontWeight: 500,
                      color: it.danger ? _DHT.danger : _DHT.text,
                    }}
                  >
                    <span>{it.label}</span>
                    {it.pro && (
                      <React.Fragment>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                          style={{ marginLeft: 4 }}
                        >
                          <rect
                            x="3"
                            y="6"
                            width="7"
                            height="5"
                            rx="1"
                            stroke={_DHT.muted}
                            strokeWidth="1.3"
                          />
                          <path
                            d="M4.5 6V4.5a2 2 0 014 0V6"
                            stroke={_DHT.muted}
                            strokeWidth="1.3"
                            fill="none"
                          />
                        </svg>
                        <span
                          style={{
                            fontFamily: _dMono,
                            fontSize: 10,
                            padding: '1px 6px',
                            background: _DHT.primary,
                            color: '#F7F3E8',
                            borderRadius: 8,
                            letterSpacing: '0.08em',
                          }}
                        >
                          PRO
                        </span>
                      </React.Fragment>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: _dSansJa,
                      fontSize: 12,
                      lineHeight: '18px',
                      color: _DHT.muted,
                      marginTop: 2,
                    }}
                  >
                    {it.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: _DHT.surface,
              border: `1px solid ${_DHT.border}`,
              fontFamily: _dSansJa,
              fontSize: 15,
              fontWeight: 500,
              color: _DHT.sub,
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

// Pro lock modal — PDF など Pro 機能を Free がタップした時に表示する。
// 「騙された感」を防ぐため、明確に Pro 機能と伝え、Pro を見る／閉じるの 2 択を提示。
function ProLockModal({ feature = 'PDFで書き出し', onClose, onShowPro }) {
  return (
    <React.Fragment>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,26,26,0.55)',
          zIndex: 90,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 91,
          width: 320,
          background: _DHT.bg,
          borderRadius: 16,
          padding: '28px 24px 20px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: _DHT.surface,
            border: `1px solid ${_DHT.border}`,
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect
              x="6"
              y="11"
              width="14"
              height="10"
              rx="2"
              stroke={_DHT.primary}
              strokeWidth="1.6"
            />
            <path d="M9 11V8a4 4 0 018 0v3" stroke={_DHT.primary} strokeWidth="1.6" fill="none" />
            <circle cx="13" cy="16" r="1.4" fill={_DHT.primary} />
          </svg>
        </div>
        <div
          style={{
            fontFamily: _dSerifJa,
            fontSize: 18,
            fontWeight: 500,
            color: _DHT.text,
            textAlign: 'center',
            letterSpacing: '0.02em',
            marginBottom: 8,
          }}
        >
          {feature}は Pro 機能です
        </div>
        <div
          style={{
            fontFamily: _dSansJa,
            fontSize: 13,
            lineHeight: '21px',
            color: _DHT.sub,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          美しい PDF レポート、CSV エクスポート、年次タイムライン画像、すべて Pro
          でご利用いただけます。
        </div>
        <button
          onClick={onShowPro}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            background: _DHT.primary,
            color: '#F7F3E8',
            border: 'none',
            cursor: 'pointer',
            fontFamily: _dSansJa,
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '0.04em',
            marginBottom: 8,
          }}
        >
          Pro を見る
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            background: 'transparent',
            color: _DHT.sub,
            border: 'none',
            cursor: 'pointer',
            fontFamily: _dSansJa,
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          閉じる
        </button>
      </div>
    </React.Fragment>
  );
}

function DetailTabs({ active, onChange }) {
  const tabs = [
    { k: 'history', label: '作業履歴' },
    { k: 'timeline', label: '作業予定' },
    { k: 'basic', label: '基本情報' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        background: _DHT.bg,
        borderBottom: `1px solid ${_DHT.border}`,
      }}
    >
      {tabs.map((t) => {
        const on = t.k === active;
        return (
          <button
            key={t.k}
            onClick={() => onChange(t.k)}
            style={{
              flex: 1,
              minHeight: 48,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: on ? `2px solid ${_DHT.primary}` : '2px solid transparent',
              fontFamily: _dSansJa,
              fontSize: 14,
              fontWeight: on ? 500 : 400,
              color: on ? _DHT.primary : _DHT.sub,
              letterSpacing: '0.04em',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ===== Add-schedule flow (action picker → date/time → confirm) =====
// 14 work types matching care-screens.jsx WORK_TYPES (excluding 観察メモ・その他).
// Watering is intentionally absent — water is logged after the fact, not scheduled.
// Inline line-icon set (mirrors care-screens.jsx WIcon, kept self-contained so this
// file works in 02-Home.html which doesn't load care-screens.jsx).
const _SchedIcon = {
  prune: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <circle cx="8" cy="9" r="3" stroke={c} strokeWidth="1.4" />
      <circle cx="8" cy="19" r="3" stroke={c} strokeWidth="1.4" />
      <path
        d="M10.5 10.7 L23 18 M10.5 17.3 L23 10"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  wire: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M3 14 C6 8, 9 20, 12 14 C15 8, 18 20, 21 14 C23 10, 25 14, 25 14"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  unwire: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path d="M3 12 C5 8, 8 16, 11 12" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M17 16 C19 12, 22 20, 25 16" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M12 18 L16 10"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
    </svg>
  ),
  repot: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 4 C12 7, 12 9, 14 11 C16 9, 16 7, 14 4 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10 11 C9 8, 7 7, 5 8 C6 11, 9 12, 11 11"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 14 L22 14 L20 23 L8 23 Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 14 L23 14" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  fert: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <circle cx="9" cy="10" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="14" cy="14" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="19" cy="10" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="11" cy="18" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="17" cy="18" r="2" stroke={c} strokeWidth="1.4" />
    </svg>
  ),
  spray: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M11 6 L17 6 L17 13 L19 16 L19 22 L9 22 L9 16 L11 13 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M17 8 L22 7 M17 10 L22 11" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="24" cy="9" r="0.8" fill={c} />
      <circle cx="25" cy="11" r="0.8" fill={c} />
    </svg>
  ),
  heal: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <rect
        x="5"
        y="11"
        width="18"
        height="6"
        rx="3"
        stroke={c}
        strokeWidth="1.4"
        transform="rotate(-25 14 14)"
      />
      <path
        d="M11 14 L17 14"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        transform="rotate(-25 14 14)"
      />
      <circle cx="12" cy="14" r="0.7" fill={c} transform="rotate(-25 14 14)" />
      <circle cx="16" cy="14" r="0.7" fill={c} transform="rotate(-25 14 14)" />
    </svg>
  ),
  leaf: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M22 5 C12 5, 5 12, 5 22 C15 22, 22 15, 22 5 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M22 5 L9 18" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  defol: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M11 6 C7 6, 5 10, 7 14 C11 14, 13 10, 11 6 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M21 16 C17 14, 13 17, 14 22 C19 23, 22 20, 21 16 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 6 L8 10 M21 16 L17 19" stroke={c} strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  bud: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path d="M14 22 L14 12" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M14 12 C10 12, 8 9, 9 5 C13 5, 15 8, 14 12 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M14 14 C17 14, 19 12, 19 9 C16 9, 14 11, 14 14 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  mekiri: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 4 L14 14 M14 14 L9 8 M14 14 L19 8 M14 14 L6 12 M14 14 L22 12"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M8 18 L20 18" stroke={c} strokeWidth="1" strokeDasharray="2 2" />
      <path d="M22 21 L18 17 M18 21 L22 17" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  moss: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M4 20 Q7 14, 10 20 Q13 14, 16 20 Q19 14, 22 20 Q25 14, 26 20"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 22 L22 22" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M9 17 L9 14 M15 17 L15 12 M21 17 L21 14"
        stroke={c}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  move: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 4 C9 4, 6 7, 6 12 C6 17, 14 24, 14 24 C14 24, 22 17, 22 12 C22 7, 19 4, 14 4 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="12" r="2.5" stroke={c} strokeWidth="1.4" />
    </svg>
  ),
  water: ({ s = 28, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 4 C14 4, 7 12, 7 17 a7 7 0 0 0 14 0 C21 12, 14 4, 14 4 Z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 17 a3 3 0 0 0 3 3" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};
const _SCHED_ACTIONS = [
  { k: 'water', Icon: _SchedIcon.water, label: '水やり' },
  { k: 'prune', Icon: _SchedIcon.prune, label: '剪定' },
  { k: 'wire', Icon: _SchedIcon.wire, label: '針金がけ' },
  { k: 'unwire', Icon: _SchedIcon.unwire, label: '針金外し' },
  { k: 'repot', Icon: _SchedIcon.repot, label: '植替え' },
  { k: 'fert', Icon: _SchedIcon.fert, label: '施肥' },
  { k: 'spray', Icon: _SchedIcon.spray, label: '消毒' },
  { k: 'heal', Icon: _SchedIcon.heal, label: '葉の手当て' },
  { k: 'leaf', Icon: _SchedIcon.leaf, label: '葉刈り' },
  { k: 'defol', Icon: _SchedIcon.defol, label: '葉柄切り' },
  { k: 'mekiri', Icon: _SchedIcon.mekiri, label: '芽切り' },
  { k: 'bud', Icon: _SchedIcon.bud, label: '芽摘み' },
  { k: 'moss', Icon: _SchedIcon.moss, label: '苔手入れ' },
  { k: 'move', Icon: _SchedIcon.move, label: '置き場変更' },
];

function _SheetShell({ title, sub, onCancel, height = '78%', children, footer }) {
  return (
    <React.Fragment>
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,26,26,0.4)',
          zIndex: 70,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 71,
          height,
          background: _DHT.bg,
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
            background: _DHT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '8px 24px 12px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: _dSerifJa,
              fontSize: 20,
              fontWeight: 500,
              color: _DHT.text,
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </div>
          {sub && (
            <div
              style={{
                fontFamily: _dSansJa,
                fontSize: 12,
                color: _DHT.sub,
                marginTop: 2,
              }}
            >
              {sub}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '12px 16px 34px',
              background: _DHT.bg,
              borderTop: `1px solid ${_DHT.border}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

function _PickDateTimeSheet({
  action,
  initialDate,
  initialTime,
  notify,
  onToggleNotify,
  onCancel,
  onBack,
  onNext,
}) {
  const [date, setDate] = React.useState(initialDate);
  const [time, setTime] = React.useState(initialTime);

  return (
    <_SheetShell
      title={`${action?.label || '作業'} の日付`}
      sub="予定日を選択"
      onCancel={onCancel}
      height="86%"
      footer={
        <button
          onClick={() => onNext(date, time)}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 12,
            background: _DHT.primary,
            color: '#F7F3E8',
            border: 'none',
            fontFamily: _dSansJa,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          予定を追加する
        </button>
      }
    >
      <_DateTimePicker date={date} time={time} onChangeDate={setDate} onChangeTime={setTime} />
      <div
        style={{
          margin: '8px 16px 16px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 10,
          background: _DHT.surface,
          border: `1px solid ${_DHT.border}`,
        }}
      >
        <div>
          <div style={{ fontFamily: _dSansJa, fontSize: 14, fontWeight: 500, color: _DHT.text }}>
            通知する
          </div>
          <div style={{ fontFamily: _dSansJa, fontSize: 11, color: _DHT.sub, marginTop: 2 }}>
            予定日にプッシュ通知でお知らせ
          </div>
        </div>
        <_Toggle on={notify} onChange={onToggleNotify} />
      </div>
      <button
        onClick={onBack}
        style={{
          margin: '0 16px 24px',
          display: 'block',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: _dSansJa,
          fontSize: 13,
          color: _DHT.sub,
        }}
      >
        ‹ 作業を選び直す
      </button>
    </_SheetShell>
  );
}

function AddScheduleFlow({
  step,
  action,
  date,
  time,
  notify,
  onPickAction,
  onPickDateTime,
  onToggleNotify,
  onBack,
  onCancel,
  onConfirm,
}) {
  if (step === 'pickAction') {
    return (
      <_SheetShell title="作業を選ぶ" sub="予定する作業の種類" onCancel={onCancel} height="78%">
        <div style={{ padding: '4px 16px 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {_SCHED_ACTIONS.map((a) => (
              <button
                key={a.k}
                onClick={() => onPickAction(a)}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 12,
                  background: _DHT.surface,
                  border: `1px solid ${_DHT.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: 8,
                }}
              >
                <div style={{ color: _DHT.primary, display: 'inline-flex' }}>
                  {a.Icon ? <a.Icon s={30} /> : null}
                </div>
                <div
                  style={{
                    fontFamily: _dSansJa,
                    fontSize: 13,
                    color: _DHT.text,
                    textAlign: 'center',
                  }}
                >
                  {a.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </_SheetShell>
    );
  }

  if (step === 'pickDateTime') {
    return (
      <_PickDateTimeSheet
        action={action}
        initialDate={date}
        initialTime={time}
        notify={notify}
        onToggleNotify={onToggleNotify}
        onCancel={onCancel}
        onBack={onBack}
        onNext={(d, t) => onPickDateTime(d, t)}
      />
    );
  }

  if (step === 'confirm') {
    const dateStr = `${date.m}月${date.d}日`;
    const dateLong = `${date.y}年${date.m}月${date.d}日`;
    return (
      <_SheetShell
        title="この内容で予定を追加"
        sub="あとから編集・削除できます"
        onCancel={onCancel}
        height="62%"
        footer={
          <button
            onClick={onConfirm}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: _DHT.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _dSansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            予定を追加する
          </button>
        }
      >
        <div style={{ padding: '0 16px 16px' }}>
          {/* Summary card */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: _DHT.surface,
              border: `1px solid ${_DHT.border}`,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: _DHT.bg,
                border: `1px solid ${_DHT.border}`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                fontSize: 28,
                lineHeight: 1,
              }}
            >
              {action?.e}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: _dSerifJa,
                  fontSize: 18,
                  fontWeight: 500,
                  color: _DHT.text,
                }}
              >
                {action?.label}
              </div>
              <div
                style={{
                  fontFamily: _dSansJa,
                  fontSize: 14,
                  color: _DHT.sub,
                  marginTop: 4,
                }}
              >
                {dateLong}
              </div>
            </div>
          </div>

          {/* Notification row */}
          <div
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: notify ? 'rgba(31,58,46,0.06)' : _DHT.surface,
              border: `1px solid ${notify ? _DHT.primary : _DHT.border}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                flexShrink: 0,
                background: notify ? _DHT.primary : 'transparent',
                border: `1.5px solid ${notify ? _DHT.primary : _DHT.borderStrong}`,
                display: 'grid',
                placeItems: 'center',
                marginTop: 1,
              }}
            >
              {notify && (
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path
                    d="M3 7l3 3 5-6"
                    stroke="#F7F3E8"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: _dSansJa,
                  fontSize: 14,
                  fontWeight: 500,
                  color: _DHT.text,
                }}
              >
                {notify ? '通知をオン' : '通知なし'}
              </div>
              <div
                style={{
                  fontFamily: _dSansJa,
                  fontSize: 12,
                  color: _DHT.sub,
                  marginTop: 2,
                  lineHeight: '18px',
                }}
              >
                {notify
                  ? `${dateLong} にプッシュ通知でお知らせします。`
                  : 'タイムライン表示のみ。通知は届きません。'}
              </div>
            </div>
          </div>

          <button
            onClick={onBack}
            style={{
              marginTop: 16,
              display: 'block',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: _dSansJa,
              fontSize: 13,
              color: _DHT.sub,
            }}
          >
            ‹ 日付を変更
          </button>
        </div>
      </_SheetShell>
    );
  }

  return null;
}

function _Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        padding: 0,
        background: on ? _DHT.primary : _DHT.borderStrong,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: '#F7F3E8',
          transition: 'left 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function _DateTimePicker({ date, time, onChangeDate, onChangeTime }) {
  // Date-only picker. Time has been removed — schedules are day-level only.
  const [vY, setVY] = React.useState(date.y);
  const [vM, setVM] = React.useState(date.m);

  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const firstDow = (y, m) => new Date(y, m - 1, 1).getDay();
  const dn = daysInMonth(vY, vM);
  const fd = firstDow(vY, vM);
  const cells = [];
  for (let i = 0; i < fd; i++) cells.push(null);
  for (let d = 1; d <= dn; d++) cells.push(d);

  const goPrev = () => {
    if (vM === 1) {
      setVY(vY - 1);
      setVM(12);
    } else setVM(vM - 1);
  };
  const goNext = () => {
    if (vM === 12) {
      setVY(vY + 1);
      setVM(1);
    } else setVM(vM + 1);
  };

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Month nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 4px 12px',
        }}
      >
        <button
          onClick={goPrev}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: _dMono,
            fontSize: 18,
            color: _DHT.sub,
          }}
        >
          ‹
        </button>
        <div
          style={{
            fontFamily: _dSerifJa,
            fontSize: 16,
            fontWeight: 500,
            color: _DHT.text,
          }}
        >
          {vY}年 {vM}月
        </div>
        <button
          onClick={goNext}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: _dMono,
            fontSize: 18,
            color: _DHT.sub,
          }}
        >
          ›
        </button>
      </div>
      {/* Weekday labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          marginBottom: 4,
        }}
      >
        {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
          <div
            key={w}
            style={{
              textAlign: 'center',
              fontFamily: _dMono,
              fontSize: 10,
              color: i === 0 ? _DHT.danger : i === 6 ? _DHT.primary : _DHT.muted,
              letterSpacing: '0.08em',
              padding: '4px 0',
            }}
          >
            {w}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {cells.map((d, i) => {
          if (d == null) return <div key={'e' + i} />;
          const sel = d === date.d && vM === date.m && vY === date.y;
          const dow = (fd + d - 1) % 7;
          return (
            <button
              key={d}
              onClick={() => onChangeDate({ y: vY, m: vM, d })}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 8,
                background: sel ? _DHT.primary : 'transparent',
                border: `1px solid ${sel ? _DHT.primary : _DHT.border}`,
                fontFamily: _dMono,
                fontSize: 14,
                color: sel ? '#F7F3E8' : dow === 0 ? _DHT.danger : _DHT.text,
                cursor: 'pointer',
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Timeline tab — forward-looking schedule (today + future) =====
// 水やりも予定として登録できる（v1.4）。連続する水やり予定は折りたたみで
// 1 行に集約（v1.5）し、剪定・植替えなどの単発予定が埋もれないようにする。
function TimelineTab({ addStep, setAddStep }) {
  // Add-schedule flow: null → 'pickAction' → 'pickDateTime' → 'confirm'
  // addStep / setAddStep は親 BonsaiDetailScreen に持ち上げ。FAB の挙動が
  // タブにより切り替わるため、親が一元的に状態を握る。
  const [pendingAction, setPendingAction] = React.useState(
    addStep && addStep !== 'pickAction' ? { k: 'fert', e: '🌱', label: '施肥' } : null,
  );
  const [pendingDate, setPendingDate] = React.useState({ y: 2026, m: 5, d: 20 });
  const [pendingTime, setPendingTime] = React.useState({ h: 9, mi: 0 });
  const [notify, setNotify] = React.useState(true);
  const [userItems, setUserItems] = React.useState([]);
  // 連続水やり折りたたみの展開制御（id で開閉）
  const [expandedWaterId, setExpandedWaterId] = React.useState(null);

  // Schedule items (today + future). Daily watering can flood the timeline,
  // so consecutive water entries are folded into a single range row below.
  const baseItems = [
    { y: 2026, m: 4, d: 25, type: 'today', label: '今日', today: true },
    { y: 2026, m: 4, d: 26, type: 'water', label: '水やり', future: true, userAdded: true },
    { y: 2026, m: 4, d: 27, type: 'water', label: '水やり', future: true, userAdded: true },
    {
      y: 2026,
      m: 4,
      d: 28,
      type: 'repot',
      label: '植替え',
      range: '4月28日 〜 5月5日',
      note: '芽膨張前の最終目安。土を桐生混合に。',
      future: true,
      suggestion: true,
    },
    { y: 2026, m: 5, d: 1, type: 'water', label: '水やり', future: true, userAdded: true },
    { y: 2026, m: 5, d: 2, type: 'water', label: '水やり', future: true, userAdded: true },
    { y: 2026, m: 5, d: 3, type: 'water', label: '水やり', future: true, userAdded: true },
    { y: 2026, m: 5, d: 4, type: 'water', label: '水やり', future: true, userAdded: true },
    { y: 2026, m: 5, d: 5, type: 'water', label: '水やり', future: true, userAdded: true },
    {
      y: 2026,
      m: 5,
      d: 12,
      type: 'fert',
      label: '春の施肥',
      range: '5月中旬',
      note: '固形肥料を置く。芽出し肥。',
      future: true,
      suggestion: true,
    },
    {
      y: 2026,
      m: 6,
      d: 1,
      type: 'wire',
      label: '針金外し',
      range: '6月初〜中旬',
      note: '幹2mm銅線・3月10日装着分。食い込み確認。',
      future: true,
      warn: true,
    },
    {
      y: 2026,
      m: 6,
      d: 15,
      type: 'mekiri',
      label: '芽切り',
      range: '6月中旬〜7月初',
      note: '黒松の二番芽促進。葉数バランス調整。',
      future: true,
      suggestion: true,
    },
    {
      y: 2026,
      m: 7,
      d: 10,
      type: 'spray',
      label: '夏の消毒',
      range: '7月梅雨明け',
      note: '殺菌・殺虫を兼ねて。スミチオン1000倍など。',
      future: true,
      suggestion: true,
    },
  ];
  // Merge user-added items, then sort chronologically (today stays first).
  const sortedItems = [...baseItems, ...userItems].sort((a, b) => {
    if (a.today) return -1;
    if (b.today) return 1;
    const ka = a.y * 10000 + a.m * 100 + a.d;
    const kb = b.y * 10000 + b.m * 100 + b.d;
    return ka - kb;
  });

  // Collapse consecutive water entries into a single range row.
  // sortedItems is earliest-first → run[0] = first, run[last] = last.
  const items = [];
  let _i = 0;
  while (_i < sortedItems.length) {
    const cur = sortedItems[_i];
    if (cur.type === 'water') {
      let j = _i;
      while (j < sortedItems.length && sortedItems[j].type === 'water') j++;
      const run = sortedItems.slice(_i, j);
      if (run.length === 1) {
        items.push({ ...run[0], _kind: 'single' });
      } else {
        items.push({
          _kind: 'water-range',
          _id: `water-${run[0].y}${run[0].m}${run[0].d}-${run.length}`,
          _entries: run,
          y: run[0].y,
          m: run[0].m,
          d: run[0].d,
          last: run[run.length - 1],
          type: 'water',
          label: '水やり',
          future: true,
          userAdded: true,
        });
      }
      _i = j;
    } else {
      items.push({ ...cur, _kind: 'single' });
      _i += 1;
    }
  }

  const iconFor = (t) => {
    switch (t) {
      case 'water':
        return <_DHI.Droplet />;
      case 'prune':
        return <_DHI.Scissors />;
      case 'wire':
        return <_DHI.Wire />;
      case 'repot':
        return <_DHI.Pot />;
      case 'fert':
        return <_DHI.Fertilizer />;
      case 'spray':
        return <_DHI.Droplet c={_DHT.danger} />;
      case 'mekiri':
        return <_DHI.Scissors c={_DHT.primary} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Section label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <div
          style={{
            fontFamily: _dMono,
            fontSize: 11,
            color: _DHT.muted,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          これからの予定
        </div>
        <div
          style={{
            fontFamily: _dMono,
            fontSize: 10,
            color: _DHT.muted,
            letterSpacing: '0.06em',
          }}
        >
          連続水やりは折りたたみ
        </div>
      </div>

      {/* Vertical timeline (future only) */}
      <div style={{ position: 'relative', paddingLeft: 52 }}>
        {/* line */}
        <div
          style={{
            position: 'absolute',
            left: 21,
            top: 6,
            bottom: 6,
            width: 2,
            background: _DHT.border,
          }}
        />
        {items.map((e, i) => {
          // 連続水やり折りたたみ行（v1.5）
          if (e._kind === 'water-range') {
            const expanded = expandedWaterId === e._id;
            const days = e._entries.length;
            const rangeLabel = `${e.m}月${e.d}日 〜 ${e.last.m}月${e.last.d}日 ・ ${days}日連続`;
            return (
              <React.Fragment key={i}>
                <button
                  onClick={() => setExpandedWaterId(expanded ? null : e._id)}
                  aria-expanded={expanded}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    marginBottom: expanded ? 8 : 18,
                    position: 'relative',
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -52 + 8,
                      top: 2,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: 'transparent',
                      border: `2px solid ${_DHT.border}`,
                      borderStyle: 'dashed',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <_DHI.Droplet />
                  </div>
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div
                      style={{
                        fontFamily: _dMono,
                        fontSize: 11,
                        color: _DHT.muted,
                        letterSpacing: '0.08em',
                        marginBottom: 2,
                      }}
                    >
                      {rangeLabel}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: _dSansJa,
                        fontSize: 15,
                        fontWeight: 500,
                        color: _DHT.text,
                      }}
                    >
                      <span>水やり</span>
                      <span
                        style={{
                          fontFamily: _dMono,
                          fontSize: 10,
                          padding: '1px 6px',
                          background: _DHT.surface,
                          color: _DHT.muted,
                          border: `1px solid ${_DHT.border}`,
                          borderRadius: 8,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {expanded ? '折りたたむ ▾' : `${days}日 ▸`}
                      </span>
                    </div>
                  </div>
                </button>
                {expanded &&
                  e._entries.map((sub, j) => (
                    <div
                      key={`sub-${j}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        marginBottom: 8,
                        paddingLeft: 8,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: -52 + 8 + 10,
                          top: '50%',
                          marginTop: -4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: _DHT.surface,
                          border: `1.5px solid ${_DHT.border}`,
                        }}
                      />
                      <div style={{ flex: 1, paddingLeft: 8 }}>
                        <span
                          style={{
                            fontFamily: _dMono,
                            fontSize: 11,
                            color: _DHT.sub,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {sub.m}月{sub.d}日
                        </span>
                      </div>
                    </div>
                  ))}
              </React.Fragment>
            );
          }
          // 通常行（単発予定 / 今日マーカー）
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 18,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -52 + 8,
                  top: 2,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: e.today ? _DHT.primary : e.future ? 'transparent' : _DHT.surface,
                  border: `2px solid ${
                    e.today
                      ? _DHT.primary
                      : e.warn
                        ? _DHT.danger
                        : e.future
                          ? _DHT.border
                          : _DHT.borderStrong
                  }`,
                  display: 'grid',
                  placeItems: 'center',
                  ...(e.future && !e.today ? { borderStyle: 'dashed' } : {}),
                }}
              >
                {e.today ? (
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: '#F7F3E8' }} />
                ) : (
                  iconFor(e.type)
                )}
              </div>

              <div style={{ flex: 1, paddingTop: 2 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <div
                    style={{
                      fontFamily: _dMono,
                      fontSize: 11,
                      color: _DHT.muted,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {e.range || `${e.m}月${e.d}日`}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: _dSansJa,
                    fontSize: 15,
                    fontWeight: e.today ? 600 : 500,
                    color: e.today ? _DHT.primary : e.warn ? _DHT.danger : _DHT.text,
                  }}
                >
                  {e.label}
                </div>
                {e.note && (
                  <div
                    style={{
                      fontFamily: _dSansJa,
                      fontSize: 12,
                      lineHeight: '18px',
                      color: _DHT.sub,
                      marginTop: 4,
                    }}
                  >
                    {e.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add custom schedule */}
      <button
        onClick={() => setAddStep('pickAction')}
        style={{
          marginTop: 8,
          width: '100%',
          height: 48,
          borderRadius: 12,
          background: 'transparent',
          color: _DHT.sub,
          border: `1px dashed ${_DHT.borderStrong}`,
          fontFamily: _dSansJa,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
        <span>予定を追加</span>
      </button>

      {/* Add-schedule flow sheets */}
      {addStep && (
        <AddScheduleFlow
          step={addStep}
          action={pendingAction}
          date={pendingDate}
          time={pendingTime}
          notify={notify}
          onPickAction={(a) => {
            setPendingAction(a);
            setAddStep('pickDateTime');
          }}
          onPickDateTime={(d, t) => {
            setPendingDate(d);
            setPendingTime(t);
            onConfirm && onConfirm();
            setAddStep(null);
          }}
          onToggleNotify={setNotify}
          onBack={() => {
            if (addStep === 'pickDateTime') setAddStep('pickAction');
            else if (addStep === 'confirm') setAddStep('pickDateTime');
          }}
          onCancel={() => setAddStep(null)}
          onConfirm={() => {
            // Append the new item to the timeline.
            setUserItems((arr) => [
              ...arr,
              {
                y: pendingDate.y,
                m: pendingDate.m,
                d: pendingDate.d,
                type: pendingAction.k,
                label: pendingAction.label,
                time: pendingTime,
                note: notify ? '当日に通知' : '通知なし',
                future: true,
                userAdded: true,
              },
            ]);
            setAddStep(null);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// History display schema — see docs/display-schema.md v1.0
// 14 作業の入力フィールドから HistoryTab チップを構築する。
// ラベル辞書は _Seg のラベルと一致させ、PDF / CSV と粒度整合させる。
// ═════════════════════════════════════════════════════════════
const _LABEL = {
  normal: 'いつも通り',
  plenty: 'たっぷり',
  light: '軽く',
  tip: '枝先のみ',
  mid: 'そこそこ',
  bold: '思い切り',
  eda: '枝',
  ha: '葉',
  shinme: '新芽',
  ne: '根',
  all: 'すべて',
  miki: '幹',
  solid: '置肥（玉肥）',
  liquid: '液肥',
  slow: '緩効性',
  other: 'その他',
  prevent: '予防',
  treat: '治療',
  both: '両方',
  yake: '葉焼け',
  kare: '枝枯れ',
  mushi: '虫',
  kabi: 'カビ',
  add: '貼り直し',
  remove: '剥がす',
  water: '湿らす',
};
const _ROOTS_LABEL = { none: '整理なし', light: '軽く整理', half: '1/3整理', heavy: '1/2整理' };

function _fmtRemoveDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
}

function _buildChipsFor(entry) {
  const t = entry.type;
  const out = [];
  switch (t) {
    case 'water':
      // 'normal' (デフォルト) は冗長になるので chip 省略。'plenty'/'light' のみ強調
      if (entry.amount && entry.amount !== 'normal') {
        out.push({ k: 'amount', label: _LABEL[entry.amount] });
      }
      break;
    case 'prune':
      (entry.parts || []).forEach((p) => out.push({ k: 'part', label: _LABEL[p] }));
      if (entry.amount) out.push({ k: 'amount', label: _LABEL[entry.amount] });
      break;
    case 'wire':
      if (entry.gauge) out.push({ k: 'gauge', label: `番手 ${entry.gauge}` });
      (entry.parts || []).forEach((p) => out.push({ k: 'part', label: _LABEL[p] }));
      if (entry.removeDate)
        out.push({ k: 'removeDate', label: `外し ${_fmtRemoveDate(entry.removeDate)}` });
      break;
    case 'unwire':
      (entry.parts || []).forEach((p) => out.push({ k: 'part', label: _LABEL[p] }));
      break;
    case 'repot':
      if (entry.potSize) out.push({ k: 'pot', label: `鉢 ${entry.potSize}cm` });
      if (entry.roots) out.push({ k: 'roots', label: _ROOTS_LABEL[entry.roots] });
      if (entry.soil) out.push({ k: 'soil', label: entry.soil, long: true });
      break;
    case 'fert':
      if (entry.kind) out.push({ k: 'kind', label: _LABEL[entry.kind] });
      if (entry.brand) out.push({ k: 'brand', label: entry.brand, long: true });
      if (entry.dilution) out.push({ k: 'dilution', label: `${entry.dilution}倍` });
      break;
    case 'spray':
      if (entry.purpose) out.push({ k: 'purpose', label: _LABEL[entry.purpose] });
      if (entry.dilution) out.push({ k: 'dilution', label: `${entry.dilution}倍` });
      if (entry.chemical) out.push({ k: 'chemical', label: entry.chemical, long: true });
      break;
    case 'heal':
      (entry.symptoms || []).forEach((s) => {
        const lbl = s === 'other' ? '症状その他' : _LABEL[s];
        if (lbl) out.push({ k: 'symptom', label: lbl });
      });
      if (entry.treatment) out.push({ k: 'treatment', label: entry.treatment, long: true });
      break;
    case 'leaf':
    case 'defol':
    case 'bud':
      if (entry.scope) out.push({ k: 'scope', label: _LABEL[entry.scope] });
      break;
    case 'mekiri':
      if (entry.scope) out.push({ k: 'scope', label: _LABEL[entry.scope] });
      if (entry.count) out.push({ k: 'count', label: `${entry.count}本` });
      break;
    case 'moss':
      (entry.tasks || []).forEach((s) => out.push({ k: 'task', label: _LABEL[s] }));
      break;
    case 'move':
      if (entry.location) out.push({ k: 'location', label: `→ ${entry.location}` });
      break;
    default:
      break;
  }
  return out;
}

function _HistoryChip({ label, long = false }) {
  return (
    <span
      style={{
        fontFamily: _dSansJa,
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 6,
        background: _DHT.surface,
        color: _DHT.sub,
        border: `1px solid ${_DHT.border}`,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        maxWidth: long ? 200 : 'unset',
        overflow: long ? 'hidden' : 'visible',
        textOverflow: long ? 'ellipsis' : 'clip',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}

function _ChipRow({ chips }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {chips.map((c, i) => (
        <_HistoryChip key={i} label={c.label} long={c.long} />
      ))}
    </div>
  );
}

// max 3 thumbs + +N badge (display-schema.md §写真サムネ仕様)
function _HistoryPhotos({ photos, seedBase = 0 }) {
  if (!photos || photos <= 0) return null;
  const shown = Math.min(photos, 3);
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      {Array.from({ length: shown }).map((_, p) => (
        <_DBP key={p} w={88} h={88} radius={8} seed={seedBase + p} />
      ))}
      {photos > 3 && (
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 8,
            background: _DHT.surface,
            border: `1px solid ${_DHT.border}`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            fontFamily: _dMono,
            fontSize: 14,
            fontWeight: 500,
            color: _DHT.muted,
            letterSpacing: '0.04em',
          }}
        >
          +{photos - 3}
        </div>
      )}
    </div>
  );
}

// ===== History tab =====
// Consecutive water entries are collapsed into a single range row to keep
// the history scannable. Tap the row to expand into individual entries.
function HistoryTab() {
  const chips = ['すべて', '水やり', '剪定', '針金', '植替え', '施肥', '消毒', '芽切り'];
  const [active, setActive] = React.useState(0);
  const [expandedId, setExpandedId] = React.useState(null);

  // Raw chronological entries (newest first). Watering shows up daily.
  // 構造化フィールドは care-screens-v2.jsx の入力フォームと整合（display-schema.md 参照）。
  // チップは _buildChipsFor() が type 別に組み立てる。note は自由メモ専用。
  const raw = [
    { type: 'water', date: '4月22日', amount: 'normal', note: '' },
    { type: 'water', date: '4月21日', amount: 'normal', note: '' },
    { type: 'water', date: '4月20日', amount: 'plenty', note: '朝のうちに' },
    { type: 'fert', date: '4月15日', kind: 'solid', brand: 'バイオゴールド', note: '春の定期' },
    { type: 'water', date: '4月14日', amount: 'normal', note: '' },
    { type: 'water', date: '4月13日', amount: 'normal', note: '' },
    { type: 'water', date: '4月12日', amount: 'light', note: '' },
    { type: 'water', date: '4月11日', amount: 'normal', note: '' },
    {
      type: 'prune',
      date: '3月20日',
      parts: ['eda'],
      amount: 'mid',
      note: '徒長枝を 2 本カット',
      photos: 1,
    },
    {
      type: 'wire',
      date: '3月10日',
      gauge: '2mm',
      parts: ['miki'],
      removeDate: '2026-06-02',
      note: '食い込みやすいので注意',
    },
    { type: 'water', date: '3月5日', amount: 'normal', note: '' },
    { type: 'water', date: '3月4日', amount: 'normal', note: '' },
    {
      type: 'repot',
      date: '2月15日',
      potSize: '18',
      soil: '赤玉土:桐生砂 = 7:3',
      roots: 'half',
      note: '根を整理して鉢替え',
      photos: 3,
    },
    { type: 'water', date: '2月10日', amount: 'normal', note: '' },
    {
      type: 'spray',
      date: '1月28日',
      purpose: 'prevent',
      chemical: '石灰硫黄合剤',
      dilution: '10',
      note: '',
    },
    { type: 'water', date: '1月20日', amount: 'normal', note: '' },
    { type: 'mekiri', date: '2025/11/20', scope: 'mid', count: '5', note: '二番芽対策' },
    { type: 'water', date: '2025/11/15', amount: 'normal', note: '' },
  ];

  // 14 作業の表示ラベル — display-schema.md 参照
  const labelFor = (t) =>
    ({
      water: '水やり',
      prune: '剪定',
      wire: '針金',
      unwire: '針金外し',
      repot: '植替え',
      fert: '施肥',
      spray: '消毒',
      heal: '葉の手当',
      leaf: '葉刈り',
      defol: '葉柄切り',
      bud: '芽摘み',
      mekiri: '芽切り',
      moss: '苔の手入れ',
      move: '置き場変更',
    })[t] || t;

  // Collapse consecutive same-type entries (currently only water) into ranges.
  const groups = [];
  let i = 0;
  while (i < raw.length) {
    const cur = raw[i];
    if (cur.type === 'water') {
      let j = i;
      while (j < raw.length && raw[j].type === 'water') j++;
      const run = raw.slice(i, j);
      if (run.length === 1) {
        groups.push({ kind: 'single', entry: run[0], idx: i });
      } else {
        // raw is newest-first → run[0] = latest, run[last] = earliest
        groups.push({
          kind: 'range',
          type: 'water',
          first: run[run.length - 1],
          last: run[0],
          entries: run,
          idx: i,
        });
      }
      i = j;
    } else {
      groups.push({ kind: 'single', entry: cur, idx: i });
      i += 1;
    }
  }

  // Filter by chip
  const filterKey = chips[active];
  const visible = groups.filter((g) => {
    if (filterKey === 'すべて') return true;
    const t = g.kind === 'range' ? g.type : g.entry.type;
    return labelFor(t) === filterKey;
  });

  const icon = (t, size = 20) => {
    switch (t) {
      case 'water':
        return <_DHI.Droplet s={size} />;
      case 'prune':
        return <_DHI.Scissors s={size} />;
      case 'wire':
        return <_DHI.Wire s={size} />;
      case 'repot':
        return <_DHI.Pot s={size} />;
      case 'fert':
        return <_DHI.Fertilizer s={size} />;
      case 'spray':
        return <_DHI.Droplet s={size} c={_DHT.danger} />;
      case 'mekiri':
        return <_DHI.Scissors s={size} c={_DHT.primary} />;
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          overflowX: 'auto',
          borderBottom: `1px solid ${_DHT.border}`,
          background: _DHT.bg,
        }}
      >
        {chips.map((c, idx) => {
          const on = idx === active;
          return (
            <button
              key={c}
              onClick={() => setActive(idx)}
              style={{
                padding: '6px 12px',
                minHeight: 32,
                borderRadius: 8,
                background: on ? _DHT.primary : 'transparent',
                color: on ? '#F7F3E8' : _DHT.sub,
                border: `1px solid ${on ? _DHT.primary : _DHT.border}`,
                fontFamily: _dSansJa,
                fontSize: 12,
                fontWeight: on ? 500 : 400,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div>
        {visible.map((g, gi) => {
          if (g.kind === 'single') {
            const h = g.entry;
            return (
              <div
                key={'s' + gi}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '16px',
                  borderBottom: `1px solid ${_DHT.border}`,
                  minHeight: 80,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: _DHT.surface,
                    border: `1px solid ${_DHT.border}`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {icon(h.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: _dSansJa,
                        fontSize: 16,
                        fontWeight: 500,
                        color: _DHT.text,
                      }}
                    >
                      {labelFor(h.type)}
                    </div>
                    <div
                      style={{
                        fontFamily: _dMono,
                        fontSize: 12,
                        color: _DHT.muted,
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.date}
                    </div>
                  </div>
                  <_ChipRow chips={_buildChipsFor(h)} />
                  {h.note && (
                    <div
                      style={{
                        fontFamily: _dSansJa,
                        fontSize: 13,
                        lineHeight: '20px',
                        color: _DHT.sub,
                        marginTop: 6,
                      }}
                    >
                      {h.note}
                    </div>
                  )}
                  <_HistoryPhotos photos={h.photos} seedBase={gi} />
                </div>
              </div>
            );
          }

          // Range row (collapsed consecutive water)
          const rangeId = `r-${g.idx}`;
          const open = expandedId === rangeId;
          return (
            <div key={'r' + gi} style={{ borderBottom: `1px solid ${_DHT.border}` }}>
              <button
                onClick={() => setExpandedId(open ? null : rangeId)}
                style={{
                  width: '100%',
                  display: 'flex',
                  gap: 14,
                  padding: '16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: 80,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: _DHT.surface,
                    border: `1px solid ${_DHT.border}`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {icon(g.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        fontFamily: _dSansJa,
                        fontSize: 16,
                        fontWeight: 500,
                        color: _DHT.text,
                      }}
                    >
                      <span>{labelFor(g.type)}</span>
                      <span
                        style={{
                          fontFamily: _dMono,
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 8,
                          background: _DHT.primary,
                          color: '#F7F3E8',
                          letterSpacing: '0.04em',
                        }}
                      >
                        ×{g.entries.length}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: _dMono,
                        fontSize: 12,
                        color: _DHT.muted,
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {g.first.date} 〜 {g.last.date}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: _dSansJa,
                      fontSize: 13,
                      lineHeight: '20px',
                      color: _DHT.sub,
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{g.entries.length}回まとめて表示</span>
                    <span style={{ color: _DHT.muted }}>·</span>
                    <span
                      style={{
                        fontFamily: _dMono,
                        fontSize: 11,
                        color: _DHT.primary,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {open ? '閉じる' : '個別に開く'} {open ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
              </button>

              {open && (
                <div
                  style={{
                    background: 'rgba(31,58,46,0.03)',
                    borderTop: `1px solid ${_DHT.border}`,
                  }}
                >
                  {g.entries.map((h, ei) => (
                    <div
                      key={ei}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '12px 16px 12px 70px',
                        borderBottom:
                          ei < g.entries.length - 1 ? `1px solid ${_DHT.border}` : 'none',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 32,
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: _DHT.border,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: 28,
                          top: '50%',
                          marginTop: -3,
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          background: _DHT.surface,
                          border: `1.5px solid ${_DHT.borderStrong}`,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: _dSansJa,
                              fontSize: 14,
                              color: _DHT.text,
                            }}
                          >
                            {labelFor(h.type)}
                          </div>
                          <div
                            style={{
                              fontFamily: _dMono,
                              fontSize: 11,
                              color: _DHT.muted,
                              letterSpacing: '0.06em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h.date}
                          </div>
                        </div>
                        <_ChipRow chips={_buildChipsFor(h)} />
                        {h.note && (
                          <div
                            style={{
                              fontFamily: _dSansJa,
                              fontSize: 12,
                              lineHeight: '18px',
                              color: _DHT.sub,
                              marginTop: 4,
                            }}
                          >
                            {h.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Basic info tab =====
// 樹の基本情報（編集を兼ねる）。CreateBonsaiScreen を embedded モードで埋め込む。
// ヘッダ右上の編集ボタンが廃止されたため、このタブが「樹そのものを書き換える場所」を担う。
function BasicInfoTab({ bonsai }) {
  const Create = window.CreateBonsaiScreen;
  if (!Create) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: _dSansJa,
          fontSize: 14,
          color: _DHT.muted,
        }}
      >
        基本情報フォームが読み込まれていません。
      </div>
    );
  }
  return (
    <div>
      <Create
        embedded={true}
        prefill={bonsai}
        showArchive={true}
        title="基本情報"
        onClose={() => {}}
        onSave={() => {}}
      />
    </div>
  );
}

function BonsaiDetailScreen({
  bonsai,
  onBack,
  initialTab = 'history',
  initialAddStep = null,
  initialMenuOpen = false,
  initialRecordStep = null,
  initialRecordType = null,
  initialProLock = false,
}) {
  const [tab, setTab] = React.useState(initialTab);
  const [menuOpen, setMenuOpen] = React.useState(initialMenuOpen);
  // 作業記録フロー: null → 'pickWork' → 'confirm'
  const [recordStep, setRecordStep] = React.useState(initialRecordStep);
  const [recordType, setRecordType] = React.useState(initialRecordType);
  const [proLockOpen, setProLockOpen] = React.useState(initialProLock);
  // 予定追加フロー: null → 'pickAction' → 'pickDateTime' → 'confirm'
  // FAB が予定タブのとき開くフロー。TimelineTab が中身を担当。
  const [addStep, setAddStep] = React.useState(initialAddStep);

  const Picker = window.WorkPickerSheet;
  const Confirm = window.WorkLogConfirmSheet;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _DHT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <window.HStatusBar />
      <DetailHeader onBack={onBack} title={bonsai.name} onOpenMenu={() => setMenuOpen(true)} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DetailHero bonsai={bonsai} />
        <div style={{ position: 'sticky', top: 0, zIndex: 5 }}>
          <DetailTabs active={tab} onChange={setTab} />
        </div>
        {tab === 'history' && <HistoryTab />}
        {tab === 'timeline' && <TimelineTab addStep={addStep} setAddStep={setAddStep} />}
        {tab === 'basic' && <BasicInfoTab bonsai={bonsai} />}
      </div>

      {/* FAB: タブにより遷移先が分岐（D1 v1.5 / v1.6）。
          - 履歴タブ → 作業を記録（WorkPickerSheet）
          - 予定タブ → 予定を追加（AddScheduleFlow / pickAction）
          Apple Mail の鉛筆 FAB と同じ作法。56dp 円形 + シャドウでシニアにも視認しやすく。 */}
      {tab !== 'basic' && !menuOpen && !recordStep && !addStep && !proLockOpen && (
        <button
          onClick={() => {
            if (tab === 'timeline') setAddStep('pickAction');
            else setRecordStep('pickWork');
          }}
          aria-label={tab === 'timeline' ? '予定を追加する' : '作業を記録する'}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 80,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: _DHT.primary,
            color: '#F7F3E8',
            border: 'none',
            cursor: 'pointer',
            zIndex: 30,
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 6px 16px rgba(31,58,46,0.32), 0 2px 4px rgba(0,0,0,0.12)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 4v14M4 11h14" stroke="#F7F3E8" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {menuOpen && (
        <DetailMoreMenu
          bonsai={bonsai}
          onClose={() => setMenuOpen(false)}
          onEditBasic={() => {
            setMenuOpen(false);
            setTab('basic');
          }}
          onExportPdf={() => {
            setMenuOpen(false);
            setProLockOpen(true);
          }}
          onArchive={() => {
            setMenuOpen(false);
          }}
        />
      )}

      {/* 作業記録フロー: WorkPickerSheet → WorkLogConfirmSheet。care-screens.jsx 既存資産を再利用 */}
      {recordStep === 'pickWork' && Picker && (
        <Picker
          species={bonsai.species && bonsai.species.indexOf('松') >= 0 ? 'pine' : 'other'}
          bonsaiName={bonsai.name}
          onSelect={(w) => {
            setRecordType(w);
            setRecordStep('confirm');
          }}
          onDismiss={() => setRecordStep(null)}
        />
      )}
      {recordStep === 'confirm' && Confirm && (
        <Confirm
          type={recordType?.k || initialRecordType?.k || 'water'}
          bonsaiName={bonsai.name}
          onSave={() => {
            setRecordStep(null);
            setRecordType(null);
          }}
          onDismiss={() => {
            setRecordStep(null);
            setRecordType(null);
          }}
        />
      )}

      {proLockOpen && (
        <ProLockModal
          feature="PDFで書き出し"
          onClose={() => setProLockOpen(false)}
          onShowPro={() => setProLockOpen(false)}
        />
      )}
    </div>
  );
}

Object.assign(window, { BonsaiDetailScreen, DetailMoreMenu, ProLockModal });
