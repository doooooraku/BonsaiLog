// BonsaiLog — Home / Bonsai management screens
// iPhone 15 Pro inner 393 × 852, SA top 59 / bottom 34

const HT = {
  bg: 'var(--bg-primary)',
  surface: 'var(--bg-surface)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  primary: 'var(--primary)',
  primaryHover: 'var(--primary-hover)',
  bark: 'var(--accent-bark)',
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  danger: 'var(--danger)',
};
const hSerifJa = 'var(--font-display-ja)';
const hSerifLa = 'var(--font-display-latin)';
const hSansJa = 'var(--font-body-ja)';
const hMono = 'var(--font-mono)';

// ───── Placeholder image: washi-toned abstract bonsai silhouette ─────
function BonsaiPlaceholder({ w, h, radius = 12, seed = 0, label, noBorder = false }) {
  // Stripe pattern id must be unique per seed
  const pid = `pp-${seed}`;
  // slight hue variation
  const bg = ['#E7DFC9', '#D9D1BF', '#D2C9B3', '#DED6C3', '#EAE1CB'][seed % 5];
  const stroke = ['#5A4637', '#3E5C39', '#1F3A2E', '#5A4637', '#3E5C39'][seed % 5];
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        overflow: 'hidden',
        background: bg,
        position: 'relative',
        flexShrink: 0,
        border: noBorder ? 'none' : `1px solid ${HT.border}`,
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <pattern
            id={pid}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={stroke}
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={w} height={h} fill={`url(#${pid})`} />
        {/* very abstract bonsai: pot + canopy */}
        <ellipse
          cx={w / 2}
          cy={h * 0.45}
          rx={w * 0.32}
          ry={h * 0.22}
          fill={stroke}
          fillOpacity="0.18"
        />
        <ellipse
          cx={w * 0.42}
          cy={h * 0.4}
          rx={w * 0.18}
          ry={h * 0.14}
          fill={stroke}
          fillOpacity="0.22"
        />
        <path
          d={`M ${w / 2} ${h * 0.52} Q ${w * 0.48} ${h * 0.65} ${w * 0.5} ${h * 0.72}`}
          stroke={stroke}
          strokeOpacity="0.35"
          strokeWidth="1.5"
          fill="none"
        />
        <rect
          x={w * 0.28}
          y={h * 0.72}
          width={w * 0.44}
          height={h * 0.14}
          rx="2"
          fill={stroke}
          fillOpacity="0.25"
        />
        <rect
          x={w * 0.32}
          y={h * 0.72}
          width={w * 0.36}
          height="2"
          fill={stroke}
          fillOpacity="0.35"
        />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            fontFamily: hMono,
            fontSize: 10,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ───── Shared line icons (outline, 1.5 stroke) ─────
const HI = {
  Search: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke={c} strokeWidth="1.5" />
      <path d="M15.5 15.5L20 20" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Cog: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.76 6.76 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.93 6.93 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.281Z"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.5" />
    </svg>
  ),
  Leaf: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 4c0 10-6 14-12 14 0 0-1-5 3-9s9-5 9-5z"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 18l6-6" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Cal: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke={c} strokeWidth="1.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Compass: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
      <path
        d="M15 9l-1.5 4.5L9 15l1.5-4.5L15 9z"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Pencil: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 6l4 4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Plus: ({ s = 28, c = '#F7F3E8' }) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <path d="M14 6v16M6 14h16" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Back: ({ s = 20, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path
        d="M12.5 4L6.5 10l6 6"
        stroke={c}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Close: ({ s = 24, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  Edit: ({ s = 22, c = HT.text }) => (
    <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
      <path
        d="M3 19l3-1 12-12-2-2L4 16l-1 3z"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Droplet: ({ s = 16, c = HT.primary }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2C8 2 3 7 3 11a5 5 0 0010 0c0-4-5-9-5-9z"
        stroke={c}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Scissors: ({ s = 16, c = HT.bark }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="12" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2" stroke={c} strokeWidth="1.4" />
      <path d="M5.5 10.5L14 2M10.5 10.5L2 2" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Wire: ({ s = 16, c = HT.bark }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8c2 0 2-4 4-4s2 8 4 8 2-4 4-4"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
  Pot: ({ s = 16, c = HT.bark }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M3 7h10l-1 6H4L3 7z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2 7h12" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 4c0 1 1 2 2 2s2-1 2-2" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Fertilizer: ({ s = 16, c = '#3E5C39' }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="10" r="1.5" fill={c} fillOpacity="0.35" stroke={c} strokeWidth="1.2" />
      <circle cx="11" cy="10" r="1.5" fill={c} fillOpacity="0.35" stroke={c} strokeWidth="1.2" />
      <circle cx="8" cy="6" r="1.5" fill={c} fillOpacity="0.35" stroke={c} strokeWidth="1.2" />
    </svg>
  ),
  Camera: ({ s = 32, c = HT.muted }) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect x="3" y="8" width="26" height="18" rx="3" stroke={c} strokeWidth="1.5" />
      <path d="M10 8l2-3h8l2 3" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16" cy="17" r="5" stroke={c} strokeWidth="1.5" />
    </svg>
  ),
  Empty: ({ s = 200, c = HT.primary }) => (
    <svg width={s} height={s} viewBox="0 0 200 200" fill="none">
      {/* pot */}
      <path d="M50 120h100l-10 50H60l-10-50z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 120h112" stroke={c} strokeWidth="2" strokeLinecap="round" />
      {/* soil line */}
      <path d="M58 128h84" stroke={c} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
      {/* subtle stub */}
      <path d="M100 120v-14" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      <circle
        cx="100"
        cy="100"
        r="3"
        stroke={c}
        strokeWidth="1.5"
        fill="none"
        strokeOpacity="0.5"
      />
    </svg>
  ),
  Check: ({ s = 18, c = '#F7F3E8' }) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none">
      <path
        d="M3 9l4 4 8-9"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  More: ({ s = 20, c = HT.muted }) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="4.5" r="1.4" fill={c} />
      <circle cx="10" cy="10" r="1.4" fill={c} />
      <circle cx="10" cy="15.5" r="1.4" fill={c} />
    </svg>
  ),
};

// Status bar (fake, for screens that render inside phone shell)
function HStatusBar() {
  return (
    <div
      style={{
        height: 59,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '21px 32px 0',
        position: 'relative',
        zIndex: 40,
      }}
    >
      <div style={{ fontFamily: '-apple-system,system-ui', fontSize: 17, fontWeight: 600 }}>
        9:41
      </div>
      <div style={{ width: 80 }} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="#000" />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="#000" />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="#000" />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="#000" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="12"
            rx="3.5"
            stroke="#000"
            strokeOpacity="0.35"
            fill="none"
          />
          <rect x="2" y="2" width="20" height="9" rx="2" fill="#000" />
        </svg>
      </div>
    </div>
  );
}

// ───── Tab bar (bottom) ─────
// onTabChange(key) — 各タブの onClick を呼び出し側で配線するためのフック。
// 未指定時は装飾だけになる（既存呼び出し側の段階移行のため）。
function TabBar({ active = 'bonsai', onTabChange }) {
  const items = [
    { k: 'bonsai', label: '盆栽', icon: HI.Leaf },
    { k: 'plan', label: '予定', icon: HI.Cal },
    { k: 'log', label: 'ふりかえり', icon: HI.Pencil },
    { k: 'set', label: '設定', icon: HI.Cog },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56 + 34,
        paddingBottom: 34,
        background: HT.surface,
        borderTop: `1px solid ${HT.border}`,
        display: 'flex',
        zIndex: 40,
      }}
    >
      {items.map((it) => {
        const on = it.k === active;
        const Icon = it.icon;
        const color = on ? HT.primary : HT.muted;
        return (
          <button
            key={it.k}
            onClick={() => onTabChange && onTabChange(it.k)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              paddingTop: 6,
              borderTop: on ? `2px solid ${HT.primary}` : '2px solid transparent',
              marginTop: -1,
              background: 'none',
              border: 'none',
              cursor: onTabChange ? 'pointer' : 'default',
            }}
          >
            <Icon s={22} c={color} />
            <div
              style={{
                fontFamily: hSansJa,
                fontSize: 11,
                color,
                fontWeight: on ? 500 : 400,
                letterSpacing: '0.04em',
              }}
            >
              {it.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ───── Header (home) ─────
// selectMode 中は「キャンセル」+ 「N件選択中」、通常時は「選択」+ Search + Cog
function HomeHeader({
  selectMode = false,
  selectedCount = 0,
  onEnterSelect,
  onCancelSelect,
  onOpenSearch,
  onOpenSettings,
}) {
  if (selectMode) {
    return (
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: `1px solid ${HT.border}`,
          background: HT.bg,
        }}
      >
        <button
          onClick={onCancelSelect}
          style={{
            minWidth: 60,
            minHeight: 44,
            padding: '0 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: hSansJa,
            fontSize: 17,
            fontWeight: 400,
            color: HT.primary,
            letterSpacing: '0.02em',
            textAlign: 'left',
          }}
        >
          キャンセル
        </button>
        <div
          style={{
            fontFamily: hSerifJa,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: HT.text,
          }}
        >
          {selectedCount > 0 ? `${selectedCount}件選択中` : '項目を選択'}
        </div>
        <div style={{ minWidth: 60 }} />
      </div>
    );
  }
  return (
    <div
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: `1px solid ${HT.border}`,
        background: HT.bg,
      }}
    >
      <div
        style={{
          fontFamily: hSerifJa,
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: HT.text,
          whiteSpace: 'nowrap',
        }}
      >
        盆栽手帳
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <button
          onClick={onEnterSelect}
          aria-label="複数の盆栽を選択する"
          style={{
            minHeight: 44,
            padding: '0 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: hSansJa,
            fontSize: 15,
            fontWeight: 500,
            color: HT.primary,
            letterSpacing: '0.02em',
          }}
        >
          複数選択
        </button>
        <button
          onClick={onOpenSearch}
          aria-label="検索"
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
          <HI.Search />
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="設定"
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
          <HI.Cog />
        </button>
      </div>
    </div>
  );
}

// Tabs (horizontal scroll) — タグはユーザーが作る
// チップ：「すべて」+ ユーザー定義タグ + 「+ 追加」（末尾）
function HomeFilterTabs({ tags, activeIndex, onChangeActive, onAddTag, onEditTag }) {
  const items = ['すべて', ...tags];
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        borderBottom: `1px solid ${HT.border}`,
        background: HT.bg,
      }}
    >
      {items.map((t, i) => {
        const on = i === activeIndex;
        return (
          <button
            key={`${t}-${i}`}
            onClick={() => onChangeActive(i)}
            onContextMenu={(e) => {
              if (i === 0) return;
              e.preventDefault();
              onEditTag && onEditTag(i - 1);
            }}
            style={{
              padding: '8px 14px',
              minHeight: 36,
              borderRadius: 8,
              background: on ? HT.primary : 'transparent',
              color: on ? '#F7F3E8' : HT.sub,
              border: `1px solid ${on ? HT.primary : HT.border}`,
              fontFamily: hSansJa,
              fontSize: 13,
              fontWeight: on ? 500 : 400,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}
          >
            {t}
          </button>
        );
      })}
      <button
        onClick={onAddTag}
        aria-label="タグを追加"
        style={{
          padding: '8px 12px',
          minHeight: 36,
          borderRadius: 8,
          background: 'transparent',
          color: HT.muted,
          border: `1px dashed ${HT.borderStrong}`,
          fontFamily: hSansJa,
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          letterSpacing: '0.02em',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
        <span>タグ追加</span>
      </button>
    </div>
  );
}

// タグ作成・編集モーダル（シンプル：タグ名のみ。`#`/`@` はユーザーが任意で含める）
function TagEditModal({ initialName, onCancel, onSave, onDelete }) {
  const [name, setName] = React.useState(initialName || '');
  const isEdit = !!initialName;
  const canSave = name.trim().length > 0;
  const title = isEdit ? 'タグを編集' : 'タグを追加';
  const cta = isEdit ? '保存' : 'タグを追加';
  return (
    <React.Fragment>
      <div
        onClick={onCancel}
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
          background: HT.bg,
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
            background: HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div
          style={{
            padding: '8px 24px 16px',
            fontFamily: hSerifJa,
            fontSize: 18,
            fontWeight: 500,
            color: HT.text,
            letterSpacing: '0.02em',
            textAlign: 'center',
          }}
        >
          {title}
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              height: 48,
              borderRadius: 12,
              border: `1px solid ${HT.border}`,
              background: HT.surface,
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              gap: 4,
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="タグ名"
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: hSansJa,
                fontSize: 16,
                color: HT.text,
              }}
            />
            <span
              style={{
                fontFamily: hMono,
                fontSize: 11,
                color: HT.muted,
              }}
            >
              {name.length}/20
            </span>
          </div>
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => canSave && onSave({ name: name.trim() })}
            disabled={!canSave}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: canSave ? HT.primary : HT.border,
              color: canSave ? '#F7F3E8' : HT.muted,
              border: 'none',
              cursor: canSave ? 'pointer' : 'default',
              fontFamily: hSansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            {cta}
          </button>
        </div>
        <div style={{ padding: '4px 16px 0', textAlign: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              minHeight: 44,
              padding: '0 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: hSansJa,
              fontSize: 14,
              color: HT.sub,
            }}
          >
            キャンセル
          </button>
        </div>
        {isEdit && (
          <div style={{ padding: '4px 16px 0', textAlign: 'center' }}>
            <button
              onClick={onDelete}
              style={{
                minHeight: 44,
                padding: '0 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: hSansJa,
                fontSize: 14,
                color: HT.danger,
              }}
            >
              このタグを削除
            </button>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

// 選択モードのコンテキストツールバー（下部、TabBar の上に重ねる）
// 哲学整合：「削除」は出さない。「アーカイブ」も個別運用に寄せ、ツールバーは「事実の追加」3 種に絞る。
function SelectionToolbar({ count, onBulkLog, onBulkSchedule }) {
  const disabled = count === 0;
  const Item = ({ icon, label, onClick }) => (
    <button
      onClick={() => !disabled && onClick && onClick()}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{ color: HT.primary, display: 'inline-flex' }}>{icon}</div>
      <div
        style={{
          fontFamily: hSansJa,
          fontSize: 11,
          color: HT.text,
          fontWeight: 500,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
    </button>
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 56 + 34,
        background: HT.surface,
        borderTop: `1px solid ${HT.border}`,
        display: 'flex',
        zIndex: 50,
      }}
    >
      <Item
        icon={
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 4l3 3M11 4L8 7M11 4v9M5 13v3a2 2 0 002 2h8a2 2 0 002-2v-3"
              stroke={HT.primary}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        label="一括記録"
        onClick={onBulkLog}
      />
      <Item
        icon={
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="3" y="5" width="16" height="14" rx="2" stroke={HT.primary} strokeWidth="1.5" />
            <path
              d="M3 9h16M8 3v4M14 3v4"
              stroke={HT.primary}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path d="M11 13v4M9 15h4" stroke={HT.primary} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
        label="予定追加"
        onClick={onBulkSchedule}
      />
    </div>
  );
}

// Bonsai card — Repolog 準拠の縦型カード（写真大→タイトル→直近の事実→樹種）
// 直近の作業事実のみ表示（推奨は出さない / 全ペルソナ ○ 以上）
// selecting=true 中は写真左上にチェックマークが出てタップで選択トグル（Apple Photos 同型）
const CARD_W = 393 - 32; // 横マージン 16+16 を引いた幅
const CARD_HERO_H = 220; // ヒーロー写真の高さ（Repolog: 258dp ≈ 0.715、控えめに 220）

function BonsaiCard({ b, onClick, idx, selecting = false, selected = false, onLongPress }) {
  const pressTimer = React.useRef(null);
  const lastAction = b.lastAction || (b.water ? { kind: '水やり', ago: b.water } : null);
  // コメント行: 直近作業メモ → 樹種 → "—" の優先順で常に1行確保（line jitter 防止）
  const commentText = (lastAction && lastAction.note) || b.species || '—';

  const handlePointerDown = () => {
    if (selecting) return;
    pressTimer.current = setTimeout(() => {
      onLongPress && onLongPress();
      pressTimer.current = null;
    }, 500);
  };
  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        margin: '0 16px 16px',
        background: HT.surface,
        border: `1px solid ${selected ? HT.primary : HT.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: selected ? '0 1px 3px rgba(31,58,46,0.18)' : '0 1px 3px rgba(31,58,46,0.08)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* ヒーロー写真 */}
      <div style={{ position: 'relative' }}>
        <BonsaiPlaceholder w={CARD_W} h={CARD_HERO_H} radius={0} seed={idx} noBorder />
        {selecting && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 28,
              height: 28,
              borderRadius: 14,
              background: selected ? HT.primary : 'rgba(255,255,255,0.92)',
              border: `2px solid ${selected ? HT.primary : 'rgba(255,255,255,0.95)'}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 5,
            }}
          >
            {selected && <HI.Check s={16} />}
          </div>
        )}
      </div>

      {/* 本体: 3 階層（タイトル / メタ / コメント）— Repolog の役割分担を継承 */}
      <div
        style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* タイトル */}
        <div
          style={{
            fontFamily: hSerifJa,
            fontSize: 18,
            lineHeight: '28px',
            fontWeight: 600,
            color: HT.text,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {b.name}
        </div>

        {/* メタ行: 左 時間+作業 / 右 樹齢（mono tabular）。Repolog の date+weather に相当 */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            fontFamily: hSansJa,
            fontSize: 14,
            lineHeight: '20px',
            color: HT.sub,
            minHeight: 20,
          }}
        >
          {lastAction ? (
            <>
              <span style={{ fontFamily: hMono, color: HT.bark, letterSpacing: '0.04em' }}>
                {lastAction.ago === '今日' ? '今日' : `${lastAction.ago}前`}
              </span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {lastAction.kind === '剪定' ? <HI.Scissors s={14} /> : <HI.Droplet s={14} />}
                <span>{lastAction.kind}</span>
              </div>
            </>
          ) : (
            <span style={{ color: HT.muted }}>記録はまだありません</span>
          )}
          {b.age && (
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: hMono,
                fontSize: 13,
                color: HT.bark,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
              }}
            >
              {b.age}
            </span>
          )}
        </div>

        {/* コメント行: 直近作業メモ → 樹種 fallback → "—"。Repolog の comment 行に相当 */}
        <div
          style={{
            fontFamily: hSansJa,
            fontSize: 14,
            lineHeight: '20px',
            color: HT.sub,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {commentText}
        </div>
      </div>
    </div>
  );
}

// age / lastAction.note は事実記録（ユーザーが書いた値）。Home カードの 3 階層構造で
// メタ行右端に age（mono tabular）、コメント行に lastAction.note → species の fallback で表示。
const MOCK_BONSAI = [
  {
    id: 'a',
    name: '父の黒松',
    species: '黒松',
    latin: 'Pinus thunbergii',
    style: 'Moyogi',
    age: '35年（推定）',
    water: '3日',
    prune: '2週間',
    lastAction: { kind: '水やり', ago: '3日', note: '葉色やや薄め、潅水量を増やす' },
  },
  {
    id: 'b',
    name: '真柏・枝枯れ',
    species: '真柏',
    latin: 'Juniperus chinensis',
    style: 'Shakan',
    age: '80年',
    water: '1日',
    prune: '5ヶ月',
    lastAction: { kind: '水やり', ago: '1日', note: '右枝の枝枯れ進行を観察' },
  },
  {
    id: 'c',
    name: 'モミジ・夏',
    species: 'モミジ',
    latin: 'Acer palmatum',
    style: 'Chokkan',
    age: '12年',
    water: '5日',
    prune: '1ヶ月',
    lastAction: { kind: '剪定', ago: '1ヶ月' },
  },
  {
    id: 'd',
    name: 'ガジュマル',
    species: 'Ficus retusa',
    latin: '',
    style: 'Kengai',
    water: '今日',
    prune: '3週間',
    lastAction: { kind: '水やり', ago: '今日', note: '土がよく乾いていたので朝のうちに' },
  },
  {
    id: 'e',
    name: '五葉松',
    species: '五葉松',
    latin: 'Pinus parviflora',
    style: 'Bunjin-gi',
    age: '200年（推定）',
    water: '4日',
    prune: '8週間',
    lastAction: { kind: '水やり', ago: '4日' },
  },
];

// ───── Screen 1: Home (loaded) ─────
// v3 改善: 選択モード（ヘッダ「選択」+ 長押し）/ ユーザー作成タグ / 下部コンテキストツールバー
function HomeScreen({
  onOpenBonsai,
  onOpenCreate,
  onTabChange,
  onOpenSearch,
  onOpenSettings,
  initialSelectMode = false,
  initialTagModal = false,
  initialBulkSchedStep = null,
  initialBulkSchedType = 'fert',
}) {
  const [tags, setTags] = React.useState(['#要注意', '@ベランダ', '#展示会候補']);
  const [activeTag, setActiveTag] = React.useState(0);
  const _initSelected =
    initialSelectMode || initialBulkSchedStep ? new Set(['a', 'c', 'd']) : new Set();
  const [selectMode, setSelectMode] = React.useState(initialSelectMode || !!initialBulkSchedStep);
  const [selected, setSelected] = React.useState(_initSelected);
  const [tagModal, setTagModal] = React.useState(initialTagModal ? { mode: 'add' } : null);
  const [bulkSchedStep, setBulkSchedStep] = React.useState(initialBulkSchedStep);
  const [bulkSchedType, setBulkSchedType] = React.useState(initialBulkSchedType);

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const enterSelect = () => {
    setSelectMode(true);
    setSelected(new Set());
  };
  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const onCardClick = (b) => {
    if (selectMode) toggle(b.id);
    else onOpenBonsai && onOpenBonsai(b);
  };
  const onCardLongPress = (b) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set([b.id]));
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: HT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HStatusBar />
      <HomeHeader
        selectMode={selectMode}
        selectedCount={selected.size}
        onEnterSelect={enterSelect}
        onCancelSelect={cancelSelect}
        onOpenSearch={onOpenSearch}
        onOpenSettings={onOpenSettings}
      />
      <HomeFilterTabs
        tags={tags}
        activeIndex={activeTag}
        onChangeActive={setActiveTag}
        onAddTag={() => setTagModal({ mode: 'add' })}
        onEditTag={(idx) => setTagModal({ mode: 'edit', index: idx, name: tags[idx] })}
      />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: 12,
          paddingBottom: selectMode ? 56 + 56 + 34 : 100,
        }}
      >
        {MOCK_BONSAI.map((b, i) => (
          <BonsaiCard
            key={b.id}
            b={b}
            idx={i}
            selecting={selectMode}
            selected={selected.has(b.id)}
            onClick={() => onCardClick(b)}
            onLongPress={() => onCardLongPress(b)}
          />
        ))}
      </div>

      {/* FAB（選択モード時は隠す） */}
      {!selectMode && (
        <button
          onClick={onOpenCreate}
          aria-label="盆栽を追加 / 長押しで選択モード"
          style={{
            position: 'absolute',
            right: 16,
            bottom: 56 + 34 + 24,
            width: 64,
            height: 64,
            borderRadius: 32,
            background: HT.primary,
            border: 'none',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 10px 24px rgba(31,58,46,0.26)',
            zIndex: 45,
          }}
        >
          <HI.Plus s={26} />
        </button>
      )}

      {/* 選択モード中の下部コンテキストツールバー */}
      {selectMode && !bulkSchedStep && (
        <SelectionToolbar
          count={selected.size}
          onBulkLog={() => {}}
          onBulkSchedule={() => setBulkSchedStep('pickWork')}
        />
      )}

      <TabBar active="bonsai" onTabChange={onTabChange} />

      {/* 一括予定追加・作業選択（BulkWorkPickerSheet, mode=schedule） */}
      {bulkSchedStep === 'pickWork' && window.BulkWorkPickerSheet && (
        <window.BulkWorkPickerSheet
          selectedIds={[...selected]}
          mode="schedule"
          onDismiss={() => setBulkSchedStep(null)}
          onSelect={(work) => {
            setBulkSchedType(work.k);
            setBulkSchedStep('pickDate');
          }}
        />
      )}

      {/* 一括予定追加・日付（BulkScheduleDateSheet） */}
      {bulkSchedStep === 'pickDate' && window.BulkScheduleDateSheet && (
        <window.BulkScheduleDateSheet
          selectedIds={[...selected]}
          type={bulkSchedType}
          onDismiss={() => setBulkSchedStep('pickWork')}
          onSave={() => {
            setBulkSchedStep(null);
            setSelectMode(false);
            setSelected(new Set());
          }}
        />
      )}

      {/* タグ作成・編集モーダル */}
      {tagModal && (
        <TagEditModal
          initialName={tagModal.mode === 'edit' ? tagModal.name || '' : ''}
          onCancel={() => setTagModal(null)}
          onSave={({ name }) => {
            if (tagModal.mode === 'edit') {
              setTags((arr) => arr.map((t, i) => (i === tagModal.index ? name : t)));
            } else {
              setTags((arr) => [...arr, name]);
              setActiveTag(tags.length + 1);
            }
            setTagModal(null);
          }}
          onDelete={() => {
            if (tagModal.mode === 'edit') {
              setTags((arr) => arr.filter((_, i) => i !== tagModal.index));
              setActiveTag(0);
            }
            setTagModal(null);
          }}
        />
      )}
    </div>
  );
}

// ───── Screen 2: Home empty ─────
function HomeEmptyScreen({ onOpenCreate, onTabChange }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: HT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HStatusBar />
      <HomeHeader />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px 100px',
          textAlign: 'center',
        }}
      >
        <HI.Empty />
        <div
          style={{
            marginTop: 24,
            fontFamily: hSerifJa,
            fontSize: 24,
            lineHeight: '34px',
            fontWeight: 500,
            color: HT.text,
            letterSpacing: '0.02em',
          }}
        >
          最初の盆栽を追加しよう
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: hSansJa,
            fontSize: 16,
            lineHeight: '26px',
            color: HT.sub,
            maxWidth: 300,
          }}
        >
          あなたの一生分の記録が、ここから始まります。
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 56 + 34 + 16,
          left: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          onClick={onOpenCreate}
          style={{
            width: '100%',
            height: 72,
            borderRadius: 14,
            background: HT.primary,
            color: '#F7F3E8',
            border: 'none',
            fontFamily: hSansJa,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <HI.Plus s={24} />
          盆栽を登録
        </button>
      </div>
      <TabBar active="bonsai" onTabChange={onTabChange} />
    </div>
  );
}

// 設定画面は 05-Monetization.html の SettingsScreen が単一情報源（v1.11 で 02-Home.html の準備中スタブを削除）。

Object.assign(window, {
  HT,
  hSerifJa,
  hSerifLa,
  hSansJa,
  hMono,
  HI,
  MOCK_BONSAI,
  BonsaiPlaceholder,
  HStatusBar,
  TabBar,
  HomeHeader,
  HomeScreen,
  HomeEmptyScreen,
  HomeFilterTabs,
  TagEditModal,
  SelectionToolbar,
  BonsaiCard,
});
