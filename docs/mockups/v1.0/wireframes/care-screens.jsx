// BonsaiLog — Care feature screens (7)
const {
  HT: _CHT,
  HI: _CHI,
  hSerifJa: _cSerifJa,
  hSansJa: _cSansJa,
  hMono: _cMono,
  BonsaiPlaceholder: _CBP,
  HStatusBar: _CSB,
  TabBar: _CTB,
} = window;

// ═════════ Screen 1: Work type picker (bottom sheet) ═════════
// Refined line icons (28×28, stroke-only) — matches the calm/serif aesthetic of BonsaiLog.
const WIcon = {
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
};

const WORK_TYPES = [
  { k: 'water', Icon: WIcon.water, label: '水やり' },
  { k: 'prune', Icon: WIcon.prune, label: '剪定' },
  { k: 'wire', Icon: WIcon.wire, label: '針金がけ' },
  { k: 'unwire', Icon: WIcon.unwire, label: '針金外し' },
  { k: 'repot', Icon: WIcon.repot, label: '植替え' },
  { k: 'fert', Icon: WIcon.fert, label: '施肥' },
  { k: 'spray', Icon: WIcon.spray, label: '消毒' },
  { k: 'heal', Icon: WIcon.heal, label: '葉の手当' },
  { k: 'leaf', Icon: WIcon.leaf, label: '葉刈り' },
  { k: 'defol', Icon: WIcon.defol, label: '全葉刈' },
  { k: 'bud', Icon: WIcon.bud, label: '芽かき' },
  { k: 'mekiri', Icon: WIcon.mekiri, label: '芽切り', speciesOnly: 'pine' },
  { k: 'moss', Icon: WIcon.moss, label: '苔手入れ' },
  { k: 'move', Icon: WIcon.move, label: '置き場変更' },
];

function WorkPickerSheet({ onSelect, onDismiss, species = 'pine', bonsaiName = '父の黒松' }) {
  const items = WORK_TYPES.filter((w) => !w.speciesOnly || w.speciesOnly === species);
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
          height: '62%',
          background: _CHT.bg,
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
            background: _CHT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '12px 24px 8px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: _cSerifJa,
              fontSize: 20,
              fontWeight: 500,
              color: _CHT.text,
              letterSpacing: '0.02em',
            }}
          >
            作業を記録
          </div>
          <div style={{ fontFamily: _cSansJa, fontSize: 13, color: _CHT.sub, marginTop: 2 }}>
            {bonsaiName}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 34px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {items.map((w) => (
              <button
                key={w.k}
                onClick={() => onSelect && onSelect(w)}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 12,
                  background: _CHT.surface,
                  border: `1px solid ${_CHT.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: 8,
                }}
              >
                <div style={{ color: _CHT.primary }}>
                  <w.Icon s={32} />
                </div>
                <div
                  style={{
                    fontFamily: _cSansJa,
                    fontSize: 13,
                    color: _CHT.text,
                    textAlign: 'center',
                  }}
                >
                  {w.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ═════════ Screen 2: Log confirm sheet ═════════
function WorkLogConfirmSheet({ type = 'water', onDismiss, onSave, bonsaiName = '父の黒松' }) {
  const label = (WORK_TYPES.find((w) => w.k === type) || WORK_TYPES[0]).label;
  const [note, setNote] = React.useState('');
  const [showDuration, setShowDuration] = React.useState(false);
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
          height: '72%',
          background: _CHT.bg,
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
            background: _CHT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '12px 24px 12px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: _cSerifJa,
              fontSize: 20,
              fontWeight: 500,
              color: _CHT.text,
              letterSpacing: '0.02em',
            }}
          >
            {label}を記録
          </div>
          <div style={{ fontFamily: _cSansJa, fontSize: 13, color: _CHT.sub, marginTop: 2 }}>
            {bonsaiName}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }}>
          {/* datetime */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: _cSansJa,
                fontSize: 13,
                fontWeight: 500,
                color: _CHT.sub,
                marginBottom: 8,
              }}
            >
              日付
            </div>
            <div
              style={{
                height: 48,
                borderRadius: 12,
                background: _CHT.surface,
                border: `1px solid ${_CHT.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 14px',
                fontFamily: _cSansJa,
                fontSize: 17,
                color: _CHT.text,
              }}
            >
              <span>今日（4月24日）</span>
              <_CHI.Edit s={18} c={_CHT.muted} />
            </div>
          </div>
          {/* note */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontFamily: _cSansJa, fontSize: 13, fontWeight: 500, color: _CHT.sub }}>
                メモ <span style={{ color: _CHT.muted, fontWeight: 400 }}>任意</span>
              </div>
              <div style={{ fontFamily: _cMono, fontSize: 11, color: _CHT.muted }}>
                {note.length}/2000
              </div>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              placeholder="自由メモ（例: 朝8時、たっぷり）"
              style={{
                width: '100%',
                minHeight: 96,
                padding: 14,
                boxSizing: 'border-box',
                borderRadius: 12,
                border: `1px solid ${_CHT.border}`,
                background: _CHT.surface,
                fontFamily: _cSansJa,
                fontSize: 16,
                lineHeight: '26px',
                color: _CHT.text,
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>
          {/* photos — Repolog-inspired: vertical, large preview, reorder + caption */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <div style={{ fontFamily: _cSansJa, fontSize: 13, fontWeight: 500, color: _CHT.sub }}>
                写真 <span style={{ color: _CHT.muted, fontWeight: 400 }}>任意</span>
              </div>
              <div style={{ fontFamily: _cMono, fontSize: 11, color: _CHT.muted }}>
                ↑↓で並べ替え、×で削除
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1].map((i, idx, arr) => {
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${_CHT.border}`,
                      borderRadius: 12,
                      background: _CHT.surface,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px 6px 12px',
                        borderBottom: `1px solid ${_CHT.border}`,
                        background: _CHT.bg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            fontFamily: _cMono,
                            fontSize: 12,
                            fontWeight: 600,
                            color: _CHT.muted,
                            minWidth: 20,
                            textAlign: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={isFirst}
                          aria-label="上へ"
                          style={{
                            width: 32,
                            height: 32,
                            border: 'none',
                            background: 'transparent',
                            color: _CHT.text,
                            opacity: isFirst ? 0.25 : 1,
                            cursor: isFirst ? 'default' : 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M8 13V3M8 3L3 8M8 3l5 5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          aria-label="下へ"
                          style={{
                            width: 32,
                            height: 32,
                            border: 'none',
                            background: 'transparent',
                            color: _CHT.text,
                            opacity: isLast ? 0.25 : 1,
                            cursor: isLast ? 'default' : 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M8 3v10M8 13L3 8M8 13l5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="削除"
                        style={{
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: 'transparent',
                          color: '#8B2E2E',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <_CHI.Close s={18} c="#8B2E2E" />
                      </button>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 200,
                        background: `linear-gradient(135deg, ${_CHT.border} 0%, ${_CHT.muted} 100%)`,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <_CHI.Camera s={36} c="#F7F3E8" />
                    </div>
                    <div style={{ padding: '10px 12px 8px' }}>
                      <input
                        type="text"
                        maxLength={100}
                        placeholder="キャプション（任意・100文字まで）"
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontFamily: _cSansJa,
                          fontSize: 14,
                          color: _CHT.text,
                          padding: '4px 0',
                        }}
                      />
                      <div
                        style={{
                          fontFamily: _cMono,
                          fontSize: 10,
                          color: _CHT.muted,
                          textAlign: 'right',
                          marginTop: 2,
                        }}
                      >
                        0/100
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                style={{
                  width: '100%',
                  minHeight: 56,
                  borderRadius: 12,
                  border: `1.5px dashed ${_CHT.primary}`,
                  background: 'transparent',
                  color: _CHT.primary,
                  fontFamily: _cSansJa,
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <_CHI.Plus s={18} c={_CHT.primary} /> 追加
              </button>
            </div>
          </div>
          {/* duration collapsible */}
          <div
            style={{
              border: `1px solid ${_CHT.border}`,
              borderRadius: 12,
              background: _CHT.surface,
            }}
          >
            <button
              onClick={() => setShowDuration((o) => !o)}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '0 14px',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontFamily: _cSansJa,
                fontSize: 15,
                color: _CHT.text,
              }}
            >
              <span>所要時間を追加（任意）</span>
              <span
                style={{
                  transform: showDuration ? 'rotate(90deg)' : 'none',
                  display: 'inline-flex',
                }}
              >
                <svg width="8" height="14" viewBox="0 0 8 14">
                  <path
                    d="M1 1l6 6-6 6"
                    stroke={_CHT.muted}
                    strokeWidth="1.75"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            {showDuration && (
              <div
                style={{
                  borderTop: `1px solid ${_CHT.border}`,
                  padding: 14,
                  display: 'flex',
                  gap: 10,
                }}
              >
                <input
                  placeholder="分"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    padding: '0 12px',
                    border: `1px solid ${_CHT.border}`,
                    fontFamily: _cSansJa,
                    fontSize: 15,
                    outline: 'none',
                    background: _CHT.bg,
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {/* sticky save */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 34px',
            background: _CHT.bg,
            borderTop: `1px solid ${_CHT.border}`,
          }}
        >
          <button
            onClick={onSave}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: _CHT.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _cSansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            記録する
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ═════════ Screen 4: Calendar ═════════
// （旧 Screen 4「水やり履歴グラフ」は v1.7 で WateringHeatmapScreen (care-screens-v2.jsx) に置換）
function CalendarScreen({ onTabChange }) {
  const [selected, setSelected] = React.useState(24);
  // Build a 5-week April 2026 grid (simplified)
  const firstDow = 3; // April 1 2026 was Wednesday
  const daysInMonth = 30;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dotsByDay = { 5: 1, 12: 2, 15: 1, 18: 3, 20: 1, 22: 4, 24: 5, 25: 2, 28: 4, 30: 1 };
  const todayList = [
    { name: '父の黒松', type: 'water', label: '水やり' },
    { name: '真柏・枝枯れ', type: 'water', label: '水やり' },
    { name: 'Ficus retusa', type: 'prune', label: '剪定' },
  ];
  const icon = (t) => (t === 'water' ? <_CHI.Droplet s={18} /> : <_CHI.Scissors s={18} />);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _CHT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_CSB />
      {/* header */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: `1px solid ${_CHT.border}`,
        }}
      >
        <div
          style={{
            fontFamily: _cSerifJa,
            fontSize: 22,
            fontWeight: 500,
            color: _CHT.text,
            letterSpacing: '0.04em',
          }}
        >
          作業予定
        </div>
        <button
          style={{
            width: 44,
            height: 44,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <_CHI.Cog />
        </button>
      </div>

      {/* month title */}
      <div
        style={{
          padding: '12px 16px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          style={{ width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <_CHI.Back s={16} />
        </button>
        <div style={{ fontFamily: _cSerifJa, fontSize: 18, fontWeight: 500, color: _CHT.text }}>
          2026年 4月
        </div>
        <button
          style={{
            width: 32,
            height: 32,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transform: 'rotate(180deg)',
          }}
        >
          <_CHI.Back s={16} />
        </button>
      </div>

      {/* DOW header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          padding: '0 16px',
          gap: 2,
        }}
      >
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontFamily: _cMono,
              fontSize: 11,
              color: i === 0 ? _CHT.danger : i === 6 ? _CHT.primary : _CHT.muted,
              padding: '6px 0',
              letterSpacing: '0.06em',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* cells */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          padding: '0 16px',
          gap: 2,
        }}
      >
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dots = dotsByDay[d] || 0;
          const isSel = d === selected;
          const isToday = d === 24;
          return (
            <button
              key={i}
              onClick={() => setSelected(d)}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 8,
                border: `1px solid ${isSel ? _CHT.primary : 'transparent'}`,
                background: isSel ? 'rgba(31,58,46,0.06)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 4,
                gap: 3,
              }}
            >
              <div
                style={{
                  fontFamily: _cSansJa,
                  fontSize: 15,
                  fontWeight: isToday ? 600 : 400,
                  color: isToday ? _CHT.primary : _CHT.text,
                }}
              >
                {d}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 6 }}>
                {Array.from({ length: Math.min(dots, 3) }).map((_, k) => (
                  <div
                    key={k}
                    style={{ width: 5, height: 5, borderRadius: 3, background: _CHT.primary }}
                  />
                ))}
                {dots > 3 && (
                  <div
                    style={{
                      fontFamily: _cMono,
                      fontSize: 9,
                      lineHeight: '6px',
                      color: _CHT.primary,
                      fontWeight: 600,
                      marginLeft: 1,
                    }}
                  >
                    +
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 56 + 34 + 80 }}>
        <div
          style={{
            fontFamily: _cMono,
            fontSize: 11,
            color: _CHT.muted,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          4月{selected}日 {selected === 24 ? '（今日）' : ''} · {todayList.length}件
        </div>
        {todayList.map((it, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 12px',
              background: _CHT.surface,
              border: `1px solid ${_CHT.border}`,
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: _CHT.bg,
                border: `1px solid ${_CHT.border}`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {icon(it.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: _cSansJa,
                  fontSize: 15,
                  fontWeight: 500,
                  color: _CHT.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {it.name}
              </div>
              <div style={{ fontFamily: _cSansJa, fontSize: 12, color: _CHT.sub, marginTop: 2 }}>
                {it.label}
              </div>
            </div>
            <button
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 8,
                background: 'transparent',
                color: _CHT.primary,
                border: `1px solid ${_CHT.primary}`,
                fontFamily: _cSansJa,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              記録
            </button>
          </div>
        ))}
      </div>

      <_CTB active="plan" onTabChange={onTabChange} />
    </div>
  );
}

// ═════════ Screen 6: Wiring list ═════════
function WiringListScreen({ onBack }) {
  const items = [
    { name: '真柏・枝枯れ', gauge: '1mm', part: '枝', weeks: 14, left: -2, warn: true, idx: 1 },
    { name: '五葉松', gauge: '1mm', part: '枝', weeks: 10, left: 2, idx: 4 },
    { name: '父の黒松', gauge: '2mm', part: '幹', weeks: 8, left: 4, idx: 0 },
    { name: 'モミジ・夏', gauge: '1mm', part: '枝', weeks: 4, left: 4, idx: 2 },
    { name: 'Ficus retusa', gauge: '2mm', part: '幹', weeks: 2, left: 4, idx: 3 },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _CHT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_CSB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid ${_CHT.border}`,
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
          <_CHI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _cSerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _CHT.text,
            letterSpacing: '0.02em',
          }}
        >
          針金がけ一覧
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px' }}>
        {items.map((it, i) => {
          const subColor = it.warn ? _CHT.danger : it.left <= 2 ? 'var(--accent-gold)' : _CHT.sub;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: _CHT.surface,
                border: `1px solid ${it.warn ? _CHT.danger : _CHT.border}`,
                borderRadius: 12,
                marginBottom: 8,
                minHeight: 96,
              }}
            >
              <_CBP w={64} h={64} radius={8} seed={it.idx} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      fontFamily: _cSansJa,
                      fontSize: 16,
                      fontWeight: 500,
                      color: _CHT.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {it.name}
                  </div>
                  {it.warn && (
                    <span
                      style={{
                        fontFamily: _cMono,
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(139,46,46,0.1)',
                        color: _CHT.danger,
                        letterSpacing: '0.08em',
                      }}
                    >
                      要確認
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: _cMono,
                    fontSize: 12,
                    color: _CHT.sub,
                    marginTop: 4,
                    letterSpacing: '0.06em',
                  }}
                >
                  <_CHI.Wire s={12} /> {it.gauge}{' '}
                  <span style={{ color: _CHT.muted, margin: '0 4px' }}>·</span> {it.part}
                </div>
                <div style={{ fontFamily: _cSansJa, fontSize: 13, color: subColor, marginTop: 4 }}>
                  {it.warn
                    ? `${it.weeks}週経過 · 外し時期を${Math.abs(it.left)}週超過`
                    : `${it.weeks}週経過 · 外し予定まで${it.left}週`}
                </div>
              </div>
              <button
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  color: _CHT.primary,
                  border: `1px solid ${_CHT.primary}`,
                  fontFamily: _cSansJa,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                外す
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════ Screen 7: Search ═════════
function SearchScreen({ onBack }) {
  const [q, setQ] = React.useState('黒松');
  const history = ['真柏', 'Pinus', '父の', 'ベランダ', '剪定 3月'];
  const chips = ['すべて', '@ベランダ', '#展示会候補', '#要注意', '水やり', '剪定', '針金'];
  const hasQuery = q.length >= 2;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _CHT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_CSB />
      {/* search bar */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          borderBottom: `1px solid ${_CHT.border}`,
        }}
      >
        <button
          onClick={onBack}
          aria-label="戻る"
          style={{
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <_CHI.Back />
        </button>
        <div
          style={{
            flex: 1,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${_CHT.border}`,
            background: _CHT.surface,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
          }}
        >
          <_CHI.Search s={18} c={_CHT.muted} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="盆栽名・樹種・メモで検索"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: _cSansJa,
              fontSize: 15,
              color: _CHT.text,
            }}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="クリア"
              style={{
                width: 24,
                height: 24,
                display: 'grid',
                placeItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" fill={_CHT.muted} />
                <path
                  d="M5 5l6 6M11 5l-6 6"
                  stroke="#F7F3E8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* chips */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 16px',
          overflowX: 'auto',
          borderBottom: `1px solid ${_CHT.border}`,
        }}
      >
        {chips.map((c, i) => (
          <button
            key={c}
            style={{
              padding: '6px 12px',
              minHeight: 32,
              borderRadius: 8,
              background: 'transparent',
              color: _CHT.sub,
              border: `1px solid ${_CHT.border}`,
              fontFamily: _cSansJa,
              fontSize: 12,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!hasQuery ? (
          <React.Fragment>
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                fontFamily: _cSansJa,
                fontSize: 14,
                color: _CHT.muted,
              }}
            >
              2文字以上で検索できます
            </div>
            <div style={{ padding: '8px 16px' }}>
              <div
                style={{
                  fontFamily: _cMono,
                  fontSize: 11,
                  color: _CHT.muted,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  padding: '8px 0',
                }}
              >
                検索履歴
              </div>
              {history.map((h) => (
                <div
                  key={h}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: `1px solid ${_CHT.border}`,
                    minHeight: 48,
                  }}
                >
                  <_CHI.Search s={16} c={_CHT.muted} />
                  <div style={{ flex: 1, fontFamily: _cSansJa, fontSize: 15, color: _CHT.text }}>
                    {h}
                  </div>
                  <button
                    aria-label="削除"
                    style={{
                      width: 32,
                      height: 32,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <_CHI.Close s={16} c={_CHT.muted} />
                  </button>
                </div>
              ))}
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {/* Bonsai section */}
            <div style={{ padding: '16px 16px 8px' }}>
              <div
                style={{
                  fontFamily: _cMono,
                  fontSize: 11,
                  color: _CHT.muted,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                盆栽 · 2件
              </div>
            </div>
            {[0, 4].map((idx, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: `1px solid ${_CHT.border}`,
                }}
              >
                <_CBP w={56} h={56} radius={10} seed={idx} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: _cSerifJa,
                      fontSize: 17,
                      fontWeight: 500,
                      color: _CHT.text,
                    }}
                  >
                    {idx === 0 ? (
                      <>
                        <span>父の</span>
                        <mark
                          style={{
                            background: 'rgba(198,158,72,0.25)',
                            color: _CHT.text,
                            padding: '0 2px',
                          }}
                        >
                          黒松
                        </mark>
                      </>
                    ) : (
                      <>
                        <span>五葉松</span>
                      </>
                    )}
                  </div>
                  <div
                    style={{ fontFamily: _cSansJa, fontSize: 12, color: _CHT.sub, marginTop: 2 }}
                  >
                    {idx === 0 ? (
                      <>
                        <mark
                          style={{
                            background: 'rgba(198,158,72,0.25)',
                            color: _CHT.text,
                            padding: '0 2px',
                          }}
                        >
                          黒松
                        </mark>
                        <span
                          style={{
                            fontFamily: 'var(--font-display-latin)',
                            fontStyle: 'italic',
                            marginLeft: 4,
                          }}
                        >
                          Pinus thunbergii
                        </span>
                      </>
                    ) : (
                      <>
                        <span>五葉松 </span>
                        <span
                          style={{ fontFamily: 'var(--font-display-latin)', fontStyle: 'italic' }}
                        >
                          Pinus parviflora
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Work section */}
            <div style={{ padding: '24px 16px 8px' }}>
              <div
                style={{
                  fontFamily: _cMono,
                  fontSize: 11,
                  color: _CHT.muted,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                作業履歴 · 3件
              </div>
            </div>
            {[
              { date: '4月15日', label: '施肥', note: '黒松 春の定期' },
              { date: '3月20日', label: '剪定', note: '父の黒松の徒長枝を2本カット' },
              { date: '2月15日', label: '植替え', note: '黒松 赤玉土:桐生 = 7:3' },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: `1px solid ${_CHT.border}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: _CHT.surface,
                    border: `1px solid ${_CHT.border}`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {r.label === '施肥' ? (
                    <_CHI.Fertilizer s={18} />
                  ) : r.label === '剪定' ? (
                    <_CHI.Scissors s={18} />
                  ) : (
                    <_CHI.Pot s={18} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: _cSansJa,
                        fontSize: 15,
                        fontWeight: 500,
                        color: _CHT.text,
                      }}
                    >
                      {r.label}
                    </div>
                    <div
                      style={{
                        fontFamily: _cMono,
                        fontSize: 11,
                        color: _CHT.muted,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {r.date}
                    </div>
                  </div>
                  <div
                    style={{ fontFamily: _cSansJa, fontSize: 12, color: _CHT.sub, marginTop: 2 }}
                  >
                    {r.note.split('黒松').map((p, j, arr) => (
                      <React.Fragment key={j}>
                        {p}
                        {j < arr.length - 1 && (
                          <mark
                            style={{
                              background: 'rgba(198,158,72,0.25)',
                              color: _CHT.text,
                              padding: '0 2px',
                            }}
                          >
                            黒松
                          </mark>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ═════════ Screen 8: Care Hub (ふりかえりタブのトップ) ═════════
// 「ふりかえり」タブ＝Care 系横断ビューの置き場。命令はせず、記録を一覧する手段だけ提供する。
function CareHubScreen({ onNavigateHeat, onNavigateWiring, onNavigateSearch, onTabChange }) {
  const Chev = ({ s = 20, c = _CHT.muted }) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 4l6 6-6 6"
        stroke={c}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const cards = [
    {
      key: 'heat',
      title: '水やり履歴',
      desc: 'カレンダー・ヒートマップで過去の水やりを確認',
      Icon: WIcon.water,
      onClick: onNavigateHeat,
    },
    {
      key: 'wiring',
      title: '針金がけ一覧',
      desc: '巻いた針金と、自分で決めた外し予定を一覧',
      Icon: WIcon.wire,
      onClick: onNavigateWiring,
    },
    {
      key: 'search',
      title: '盆栽を検索',
      desc: '名前 / 樹種 / メモ / タグから探す',
      Icon: _CHI.Search,
      onClick: onNavigateSearch,
    },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _CHT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_CSB />
      {/* Header — TabBar 経由で到達するので戻るボタンなし */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${_CHT.border}`,
          background: _CHT.bg,
        }}
      >
        <div
          style={{
            fontFamily: _cSerifJa,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: _CHT.text,
          }}
        >
          ふりかえり
        </div>
      </div>

      <div
        style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', paddingBottom: 56 + 34 + 16 }}
      >
        <div
          style={{
            fontFamily: _cSansJa,
            fontSize: 13,
            color: _CHT.sub,
            marginBottom: 20,
            lineHeight: '20px',
          }}
        >
          記録したケアを一覧で振り返るビューです。
        </div>

        {cards.map((c) => (
          <button
            key={c.key}
            onClick={c.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              marginBottom: 12,
              background: _CHT.surface,
              border: `1px solid ${_CHT.border}`,
              borderRadius: 14,
              width: '100%',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: _CHT.bg,
                border: `1px solid ${_CHT.border}`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <c.Icon s={22} c={_CHT.primary} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: _cSerifJa,
                  fontSize: 17,
                  fontWeight: 500,
                  color: _CHT.text,
                  letterSpacing: '0.02em',
                }}
              >
                {c.title}
              </div>
              <div style={{ fontFamily: _cSansJa, fontSize: 13, color: _CHT.sub, marginTop: 2 }}>
                {c.desc}
              </div>
            </div>
            <Chev s={20} c={_CHT.muted} />
          </button>
        ))}
      </div>

      <_CTB active="log" onTabChange={onTabChange} />
    </div>
  );
}

// Per-action form metadata (shared between 02-Home.html gallery and other consumers)
const WORK_FORM_OPTIONS = [
  { v: 'water', l: '💧 水やり', desc: '水量のみ' },
  { v: 'prune', l: '✂️ 剪定', desc: '部位 / 量' },
  { v: 'wire', l: '〰️ 針金がけ', desc: '番手 / 部位 / 期間' },
  { v: 'unwire', l: '〰️ 針金外し', desc: '外した部位' },
  { v: 'repot', l: '🪴 植替え', desc: '鉢サイズ / 用土 / 根' },
  { v: 'fert', l: '🌱 施肥', desc: '種類 / 銘柄 / 希釈' },
  { v: 'spray', l: '🦋 消毒', desc: '目的 / 薬剤 / 倍率' },
  { v: 'heal', l: '🩹 葉の手当て', desc: '症状 / 処置' },
  { v: 'leaf', l: '🍃 葉刈り', desc: '範囲' },
  { v: 'defol', l: '🍃 葉柄切り', desc: '範囲' },
  { v: 'mekiri', l: '🌲 芽切り', desc: '範囲 / 本数（任意）' },
  { v: 'bud', l: '🌿 芽摘み', desc: '範囲' },
  { v: 'moss', l: '🌿 苔', desc: '貼り直し / 剥がす' },
  { v: 'move', l: '📍 置き場変更', desc: '移動先 / 理由' },
];

Object.assign(window, {
  WORK_TYPES,
  WORK_FORM_OPTIONS,
  WorkPickerSheet,
  WorkLogConfirmSheet,
  CalendarScreen,
  WiringListScreen,
  SearchScreen,
  CareHubScreen,
});
