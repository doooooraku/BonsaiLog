// BonsaiLog — Create / Species picker / Edit modals

// Use HT, HI, hSerifJa, hSansJa, hMono from window scope
const { HT: _HT, HI: _HI, hSerifJa: _serifJa, hSansJa: _sansJa, hMono: _mono } = window;

// 樹形候補は STYLE_LIST（描画用オブジェクト配列）が正本。文字列配列の旧 STYLES は v1.12 で削除。

// ───── Custom input modal (reusable: species / style / tag etc.) ─────
// 名前を入力して「作成」を押した時、existingNames に同名があれば
// 「既に <name> があります。新しく作成しますか？」と分岐確認する。
function CustomInputModal({
  title,
  placeholder,
  existingNames = [],
  onCancel,
  onConfirm,
  onSelectExisting,
}) {
  const [name, setName] = React.useState('');
  const [showConflict, setShowConflict] = React.useState(false);
  const trimmed = name.trim();
  const matched = existingNames.find((n) => n.toLowerCase() === trimmed.toLowerCase());

  const handleCreate = () => {
    if (!trimmed) return;
    if (matched) {
      setShowConflict(true);
      return;
    }
    onConfirm && onConfirm(trimmed);
  };

  const btnBase = {
    height: 44,
    padding: '0 18px',
    borderRadius: 10,
    fontFamily: _sansJa,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    letterSpacing: '0.02em',
  };
  const btnSecondary = {
    ...btnBase,
    background: 'transparent',
    color: _HT.sub,
    border: `1px solid ${_HT.border}`,
  };
  const btnPrimary = {
    ...btnBase,
    background: _HT.primary,
    color: '#F7F3E8',
  };

  return (
    <React.Fragment>
      <div
        onClick={onCancel}
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
          left: 16,
          right: 16,
          top: '18%',
          zIndex: 91,
          background: _HT.bg,
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
        }}
      >
        <div
          style={{
            fontFamily: _serifJa,
            fontSize: 18,
            fontWeight: 500,
            color: _HT.text,
            marginBottom: 14,
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, 60));
            if (showConflict) setShowConflict(false);
          }}
          placeholder={placeholder || '名前を入力'}
          autoFocus
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            padding: '0 14px',
            boxSizing: 'border-box',
            border: `1px solid ${showConflict ? _HT.danger : _HT.border}`,
            background: _HT.surface,
            fontFamily: _sansJa,
            fontSize: 16,
            color: _HT.text,
            outline: 'none',
          }}
        />

        {showConflict && matched && (
          <div
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(139,46,46,0.06)',
              border: `1px solid ${_HT.danger}`,
            }}
          >
            <div
              style={{
                fontFamily: _sansJa,
                fontSize: 13,
                lineHeight: '20px',
                color: _HT.text,
              }}
            >
              既に「<b style={{ fontWeight: 600 }}>{matched}</b>」があります。
              <br />
              新しく作成しますか？
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {showConflict && matched ? (
            <React.Fragment>
              <button
                onClick={() => onSelectExisting && onSelectExisting(matched)}
                style={btnSecondary}
              >
                既存を選ぶ
              </button>
              <button onClick={() => onConfirm && onConfirm(trimmed)} style={btnPrimary}>
                新しく作成
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <button onClick={onCancel} style={btnSecondary}>
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!trimmed}
                style={{
                  ...btnPrimary,
                  opacity: trimmed ? 1 : 0.4,
                  cursor: trimmed ? 'pointer' : 'not-allowed',
                }}
              >
                作成
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

// ───── Sticky bottom "+ カスタム入力" button (used in pickers) ─────
function _CustomCreateButton({ label = '＋ カスタム入力', onClick }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        paddingBottom: 12 + 24,
        background: _HT.bg,
        borderTop: `1px solid ${_HT.border}`,
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 12,
          background: 'transparent',
          color: _HT.primary,
          border: `1.5px dashed ${_HT.primary}`,
          fontFamily: _sansJa,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ───── Screen 3: Create Bonsai (modal) ─────
function CreateBonsaiScreen({
  onClose,
  onSave,
  onPickSpecies,
  onPickStyle,
  prefill = null,
  title = '新しい盆栽を登録',
  showArchive = false,
  openSpeciesSheet = false,
  openStyleSheet = false,
  embedded = false,
  availableTags = ['#要注意', '@ベランダ', '#展示会候補'],
}) {
  const [name, setName] = React.useState(prefill?.name || '');
  const [potExpanded, setPotExpanded] = React.useState(false);
  const [memo, setMemo] = React.useState(prefill?.memo || '');
  const [species, setSpecies] = React.useState(prefill?.species || '');
  const [style, setStyle] = React.useState(prefill?.style || '');
  const [age, setAge] = React.useState(prefill?.age || '');
  const [showSpecies, setShowSpecies] = React.useState(openSpeciesSheet);
  const [showStyle, setShowStyle] = React.useState(openStyleSheet);
  const [selectedTags, setSelectedTags] = React.useState(new Set(prefill?.tags || []));
  const [showTagModal, setShowTagModal] = React.useState(false);
  const [tagPool, setTagPool] = React.useState(availableTags);

  const toggleTag = (t) => {
    setSelectedTags((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  };

  const field = (label, required, children, hint = null) => (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          fontFamily: _sansJa,
          fontSize: 13,
          fontWeight: 500,
          color: _HT.sub,
          letterSpacing: '0.04em',
        }}
      >
        <span>{label}</span>
        {required && (
          <span
            style={{
              fontFamily: _mono,
              fontSize: 10,
              padding: '1px 6px',
              background: _HT.danger,
              color: '#F7F3E8',
              borderRadius: 8,
              letterSpacing: '0.08em',
            }}
          >
            必須
          </span>
        )}
        {required === false && (
          <span
            style={{
              fontFamily: _mono,
              fontSize: 10,
              color: _HT.muted,
              letterSpacing: '0.08em',
            }}
          >
            任意
          </span>
        )}
        {hint && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: _mono,
              fontSize: 11,
              fontWeight: 400,
              color: _HT.muted,
              letterSpacing: 0,
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );

  const inputStyle = {
    width: '100%',
    height: 48,
    borderRadius: 12,
    padding: '0 14px',
    boxSizing: 'border-box',
    border: `1px solid ${_HT.border}`,
    background: _HT.surface,
    fontFamily: _sansJa,
    fontSize: 16,
    color: _HT.text,
    outline: 'none',
  };

  return (
    <div
      style={
        embedded
          ? {
              background: _HT.bg,
              display: 'flex',
              flexDirection: 'column',
            }
          : {
              position: 'absolute',
              top: 54,
              left: 0,
              right: 0,
              bottom: 0,
              background: _HT.bg,
              display: 'flex',
              flexDirection: 'column',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
            }
      }
    >
      {!embedded && (
        <>
          {/* grabber */}
          <div
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              background: _HT.borderStrong,
              opacity: 0.5,
              margin: '10px auto 4px',
            }}
          />

          {/* modal header */}
          <div
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              position: 'relative',
            }}
          >
            <button
              onClick={onClose}
              aria-label="閉じる"
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
              <_HI.Close />
            </button>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                textAlign: 'center',
                fontFamily: _serifJa,
                fontSize: 20,
                fontWeight: 500,
                color: _HT.text,
                letterSpacing: '0.02em',
                pointerEvents: 'none',
              }}
            >
              {title}
            </div>
            <button
              onClick={onSave}
              style={{
                marginLeft: 'auto',
                height: 48,
                padding: '0 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: _sansJa,
                fontSize: 17,
                fontWeight: 500,
                color: _HT.primary,
                letterSpacing: '0.02em',
              }}
            >
              保存
            </button>
          </div>
        </>
      )}

      {/* scroll body */}
      <div
        style={
          embedded ? { padding: '16px' } : { flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }
        }
      >
        {/* Photo */}
        {field(
          '写真',
          false,
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 12,
                border: `1.5px dashed ${_HT.border}`,
                background: _HT.surface,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <_HI.Camera />
            </div>
            <div
              style={{
                fontFamily: _sansJa,
                fontSize: 13,
                lineHeight: '20px',
                color: _HT.muted,
              }}
            >
              + 写真を追加
              <br />
              （後からでも追加できます）
            </div>
          </div>,
        )}

        {/* Name */}
        {field(
          '名前',
          true,
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="例: 父の黒松"
              style={inputStyle}
            />
            <div
              style={{
                marginTop: 4,
                textAlign: 'right',
                fontFamily: _mono,
                fontSize: 11,
                color: _HT.muted,
              }}
            >
              {name.length}/100
            </div>
          </div>,
        )}

        {/* Species picker */}
        {field(
          '樹種',
          false,
          <button
            onClick={() => {
              setShowSpecies(true);
              onPickSpecies && onPickSpecies();
            }}
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ color: species ? _HT.text : _HT.muted }}>{species || '未選択'}</span>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path
                d="M1 1l5 5 5-5"
                stroke={_HT.muted}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>,
        )}

        {/* Style picker — same pattern as species so it stays calm and scannable. */}
        {field(
          '樹形',
          false,
          <button
            onClick={() => {
              setShowStyle(true);
              onPickStyle && onPickStyle();
            }}
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ color: style ? _HT.text : _HT.muted }}>
              {style || '未選択（例：模様木・直幹）'}
            </span>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path
                d="M1 1l5 5 5-5"
                stroke={_HT.muted}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>,
        )}

        {/* Estimated age — bonsai often track age in years (incl. "推定" / "実生から"). Free text keeps the philosophy: 事実を記録する、強制しない。 */}
        {field(
          '樹齢',
          false,
          <input
            type="text"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.slice(0, 30))}
            placeholder="例: 35（推定） / 不明"
            style={inputStyle}
          />,
        )}

        {/* Purchase date */}
        {field(
          '購入日',
          false,
          <div
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>今日（2026年4月25日）</span>
            <_HI.Cal s={20} c={_HT.muted} />
          </div>,
        )}

        {/* Source memo */}
        {field(
          '入手元メモ',
          false,
          <input type="text" placeholder="例: 父から継承 / 高崎盆栽市" style={inputStyle} />,
        )}

        {/* Pot info collapsible */}
        {field(
          '鉢情報',
          false,
          <div
            style={{ border: `1px solid ${_HT.border}`, borderRadius: 12, background: _HT.surface }}
          >
            <button
              onClick={() => setPotExpanded((o) => !o)}
              style={{
                width: '100%',
                height: 48,
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: _sansJa,
                fontSize: 15,
                color: _HT.text,
              }}
            >
              <span>鉢情報を追加</span>
              <span
                style={{
                  transform: potExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 150ms ease-out',
                  display: 'inline-flex',
                }}
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                  <path
                    d="M1 1l6 6-6 6"
                    stroke={_HT.muted}
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            {potExpanded && (
              <div
                style={{
                  borderTop: `1px solid ${_HT.border}`,
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <input placeholder="幅（cm）" style={{ ...inputStyle, height: 44 }} />
                <input placeholder="深さ（cm）" style={{ ...inputStyle, height: 44 }} />
                <input placeholder="材質（例: 常滑・紫泥）" style={{ ...inputStyle, height: 44 }} />
              </div>
            )}
          </div>,
        )}

        {/* Tags — multi-select chips + create new */}
        {field(
          'タグ',
          false,
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tagPool.map((t) => {
                const on = selectedTags.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    style={{
                      padding: '8px 12px',
                      minHeight: 36,
                      borderRadius: 8,
                      background: on ? _HT.primary : 'transparent',
                      color: on ? '#F7F3E8' : _HT.sub,
                      border: `1px solid ${on ? _HT.primary : _HT.border}`,
                      fontFamily: _sansJa,
                      fontSize: 13,
                      fontWeight: on ? 500 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
              <button
                onClick={() => setShowTagModal(true)}
                aria-label="タグを追加"
                style={{
                  padding: '8px 12px',
                  minHeight: 36,
                  borderRadius: 8,
                  background: 'transparent',
                  color: _HT.muted,
                  border: `1px dashed ${_HT.borderStrong}`,
                  fontFamily: _sansJa,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
                <span>タグ追加</span>
              </button>
            </div>
          </div>,
        )}

        {/* Free memo — counter mirrors care-screens (right-aligned in label row) */}
        {field(
          'メモ',
          false,
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 3000))}
            placeholder="自由メモ"
            style={{
              width: '100%',
              minHeight: 120,
              padding: 14,
              boxSizing: 'border-box',
              borderRadius: 12,
              border: `1px solid ${_HT.border}`,
              background: _HT.surface,
              fontFamily: _sansJa,
              fontSize: 16,
              lineHeight: '26px',
              color: _HT.text,
              outline: 'none',
              resize: 'none',
            }}
          />,
          `${memo.length}/3000`,
        )}

        {showArchive && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${_HT.border}` }}>
            <button
              style={{
                width: '100%',
                height: 48,
                borderRadius: 12,
                background: 'transparent',
                color: _HT.danger,
                border: `1px solid ${_HT.danger}`,
                fontFamily: _sansJa,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              この盆栽をアーカイブ
            </button>
            <div
              style={{
                marginTop: 8,
                fontFamily: _sansJa,
                fontSize: 12,
                color: _HT.muted,
                lineHeight: '18px',
              }}
            >
              アーカイブは削除ではありません。履歴は保持され、いつでも復元できます。
            </div>
          </div>
        )}
      </div>

      {/* Bottom save — sticky in modal mode, in-flow in embedded mode */}
      <div
        style={
          embedded
            ? {
                padding: '8px 16px 24px',
                borderTop: `1px solid ${_HT.border}`,
                background: _HT.bg,
              }
            : {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                paddingBottom: 34 + 12,
                background: _HT.bg,
                borderTop: `1px solid ${_HT.border}`,
              }
        }
      >
        <button
          onClick={onSave}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 12,
            background: _HT.primary,
            color: '#F7F3E8',
            border: 'none',
            fontFamily: _sansJa,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          保存
        </button>
      </div>

      {showSpecies && (
        <SpeciesPickerSheet
          current={species}
          onDismiss={() => setShowSpecies(false)}
          onSelect={(name) => {
            setSpecies(name);
            setShowSpecies(false);
          }}
        />
      )}
      {showStyle && (
        <StylePickerSheet
          current={style}
          onDismiss={() => setShowStyle(false)}
          onSelect={(name) => {
            setStyle(name);
            setShowStyle(false);
          }}
        />
      )}
      {showTagModal && window.TagEditModal && (
        <window.TagEditModal
          onCancel={() => setShowTagModal(false)}
          onSave={({ name }) => {
            if (!tagPool.includes(name)) setTagPool((arr) => [...arr, name]);
            setSelectedTags((prev) => {
              const n = new Set(prev);
              n.add(name);
              return n;
            });
            setShowTagModal(false);
          }}
        />
      )}
    </div>
  );
}

// ───── Screen 4: Species picker ─────
const SPECIES_LIST = [
  { name: '黒松', latin: 'Pinus thunbergii', en: 'Japanese black pine', cat: '松類' },
  { name: '五葉松', latin: 'Pinus parviflora', en: 'Japanese white pine', cat: '松類' },
  { name: '赤松', latin: 'Pinus densiflora', en: 'Japanese red pine', cat: '松類' },
  { name: '真柏', latin: 'Juniperus chinensis "Shimpaku"', en: 'Chinese juniper', cat: '真柏類' },
  { name: 'モミジ', latin: 'Acer palmatum', en: 'Japanese maple', cat: '落葉' },
  { name: 'ケヤキ', latin: 'Zelkova serrata', en: 'Japanese zelkova', cat: '落葉' },
  { name: 'Ficus retusa', latin: 'Ficus retusa', en: 'Banyan fig', cat: '屋内向け' },
  { name: '姫リンゴ', latin: 'Malus × micromalus', en: 'Crabapple', cat: '実もの' },
  { name: 'カリン', latin: 'Pseudocydonia sinensis', en: 'Chinese quince', cat: '実もの' },
];

function SpeciesPickerScreen({ onBack, onSelect, current = null }) {
  const [showCustom, setShowCustom] = React.useState(false);
  const filtered = SPECIES_LIST;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _HT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <window.HStatusBar />
      {/* header */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          borderBottom: `1px solid ${_HT.border}`,
          position: 'relative',
          background: _HT.bg,
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
          <_HI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _serifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _HT.text,
            letterSpacing: '0.02em',
            pointerEvents: 'none',
          }}
        >
          樹種を選択
        </div>
      </div>

      {/* search */}
      <div style={{ padding: 12, background: _HT.bg, borderBottom: `1px solid ${_HT.border}` }}>
        <div
          style={{
            height: 44,
            borderRadius: 12,
            border: `1px solid ${_HT.border}`,
            background: _HT.surface,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 14px',
          }}
        >
          <_HI.Search s={18} c={_HT.muted} />
          <span style={{ fontFamily: _sansJa, fontSize: 15, color: _HT.muted }}>
            樹種名で検索（例: 黒松, pine）
          </span>
        </div>
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((s) => {
          const on = current === s.name;
          return (
            <div
              key={s.name}
              onClick={() => onSelect && onSelect(s.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                minHeight: 56,
                cursor: 'pointer',
                borderBottom: `1px solid ${_HT.border}`,
                background: on ? 'rgba(31,58,46,0.04)' : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: _sansJa,
                    fontSize: 17,
                    lineHeight: '22px',
                    color: _HT.text,
                    fontWeight: on ? 500 : 400,
                  }}
                >
                  {s.name}
                </div>
              </div>
              {on && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: _HT.primary,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <_HI.Check s={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* sticky bottom — custom input */}
      <_CustomCreateButton onClick={() => setShowCustom(true)} />

      {showCustom && (
        <CustomInputModal
          title="カスタム樹種を作成"
          placeholder="例: 黒松"
          existingNames={SPECIES_LIST.map((s) => s.name)}
          onCancel={() => setShowCustom(false)}
          onConfirm={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
          onSelectExisting={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
        />
      )}
    </div>
  );
}

// ───── Screen: Style picker (mirrors species picker) ─────
const STYLE_LIST = [
  { name: '直幹', en: 'Chokkan', desc: '幹がまっすぐ垂直に立つ、最も基本的な樹形。' },
  { name: '模様木', en: 'Moyogi', desc: '幹が緩やかにくねり、自然な動きを見せる樹形。' },
  { name: '斜幹', en: 'Shakan', desc: '幹が一方向に傾いて立つ樹形。風雪に耐えた姿。' },
  { name: '懸崖', en: 'Kengai', desc: '幹が鉢の縁よりも下に垂れる、崖から伸びる姿。' },
  { name: '半懸崖', en: 'Han-kengai', desc: '幹が水平〜やや下方に伸びる、懸崖の控えめな形。' },
  {
    name: '文人木',
    en: 'Bunjingi',
    desc: '細い幹を高く伸ばし、上部にだけ枝を残す洗練された樹形。',
  },
  { name: '双幹', en: 'Sokan', desc: '一つの根元から二本の幹が立ち上がる樹形。' },
  { name: '株立ち', en: 'Kabudachi', desc: '一つの根元から複数（3本以上）の幹が立つ樹形。' },
  { name: '寄せ植え', en: 'Yose-ue', desc: '複数の樹を一つの鉢に植えて、林や森を表現する樹形。' },
  { name: 'その他', en: 'Other', desc: '上記に当てはまらない樹形・特殊な仕立て。' },
];

function StylePickerScreen({ onBack, onSelect, current = null }) {
  const [showCustom, setShowCustom] = React.useState(false);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _HT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <window.HStatusBar />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          borderBottom: `1px solid ${_HT.border}`,
          position: 'relative',
          background: _HT.bg,
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
          <_HI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _serifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _HT.text,
            letterSpacing: '0.02em',
            pointerEvents: 'none',
          }}
        >
          樹形を選択
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {STYLE_LIST.map((s) => {
          const on = current === s.name;
          return (
            <div
              key={s.name}
              onClick={() => onSelect && onSelect(s.name)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                minHeight: 56,
                cursor: 'pointer',
                borderBottom: `1px solid ${_HT.border}`,
                background: on ? 'rgba(31,58,46,0.04)' : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div
                    style={{
                      fontFamily: _sansJa,
                      fontSize: 17,
                      lineHeight: '24px',
                      color: _HT.text,
                      fontWeight: on ? 500 : 400,
                    }}
                  >
                    {s.name}
                  </div>
                  {s.en && (
                    <div
                      style={{
                        fontFamily: 'var(--font-display-latin)',
                        fontStyle: 'italic',
                        fontSize: 12,
                        color: _HT.muted,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {s.en}
                    </div>
                  )}
                </div>
                {s.desc && (
                  <div
                    style={{
                      fontFamily: _sansJa,
                      fontSize: 12,
                      lineHeight: '18px',
                      color: _HT.sub,
                      marginTop: 4,
                    }}
                  >
                    {s.desc}
                  </div>
                )}
              </div>
              {on && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: _HT.primary,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <_HI.Check s={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <_CustomCreateButton onClick={() => setShowCustom(true)} />

      {showCustom && (
        <CustomInputModal
          title="カスタム樹形を作成"
          placeholder="例: 直幹"
          existingNames={STYLE_LIST.map((s) => s.name)}
          onCancel={() => setShowCustom(false)}
          onConfirm={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
          onSelectExisting={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
        />
      )}
    </div>
  );
}

// ───── Species picker — bottom sheet ─────
function SpeciesPickerSheet({ current = null, onDismiss, onSelect }) {
  const [q, setQ] = React.useState('');
  const [showCustom, setShowCustom] = React.useState(false);
  const lower = q.trim().toLowerCase();
  const filtered = SPECIES_LIST.filter((s) => {
    if (!lower) return true;
    return (
      s.name.toLowerCase().includes(lower) ||
      (s.latin || '').toLowerCase().includes(lower) ||
      (s.en || '').toLowerCase().includes(lower)
    );
  });

  return (
    <React.Fragment>
      <div
        onClick={onDismiss}
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
          height: '78%',
          background: _HT.bg,
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
            background: _HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '6px 16px 8px', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              fontFamily: _serifJa,
              fontSize: 18,
              fontWeight: 500,
              color: _HT.text,
            }}
          >
            樹種を選択
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: _sansJa,
              fontSize: 15,
              color: _HT.sub,
              padding: '6px 8px',
            }}
          >
            キャンセル
          </button>
        </div>

        {/* Search field */}
        <div style={{ padding: '4px 16px 10px' }}>
          <div
            style={{
              height: 44,
              borderRadius: 12,
              border: `1px solid ${_HT.border}`,
              background: _HT.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
            }}
          >
            <_HI.Search s={18} c={_HT.muted} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="樹種名で検索（例: 黒松, pine）"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: _sansJa,
                fontSize: 15,
                color: _HT.text,
              }}
            />
            {q && (
              <button
                onClick={() => setQ('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: _HT.muted,
                  fontSize: 18,
                  padding: 4,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* List — tap to select immediately */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((s) => {
            const on = current === s.name;
            return (
              <div
                key={s.name}
                onClick={() => onSelect && onSelect(s.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  minHeight: 52,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${_HT.border}`,
                  background: on ? 'rgba(31,58,46,0.04)' : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: _sansJa,
                      fontSize: 15,
                      lineHeight: '20px',
                      color: _HT.text,
                      fontWeight: on ? 500 : 400,
                    }}
                  >
                    {s.name}
                  </div>
                </div>
                {on && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: _HT.primary,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <_HI.Check s={14} />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                fontFamily: _sansJa,
                fontSize: 13,
                color: _HT.muted,
              }}
            >
              該当なし
            </div>
          )}
        </div>

        {/* sticky bottom — custom input */}
        <_CustomCreateButton onClick={() => setShowCustom(true)} />
      </div>

      {showCustom && (
        <CustomInputModal
          title="カスタム樹種を作成"
          placeholder="例: 黒松"
          existingNames={SPECIES_LIST.map((s) => s.name)}
          onCancel={() => setShowCustom(false)}
          onConfirm={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
          onSelectExisting={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
        />
      )}
    </React.Fragment>
  );
}

// ───── Style picker — bottom sheet ─────
function StylePickerSheet({ current = null, onDismiss, onSelect }) {
  const [q, setQ] = React.useState('');
  const [showCustom, setShowCustom] = React.useState(false);
  const lower = q.trim().toLowerCase();
  const filtered = STYLE_LIST.filter((s) => {
    if (!lower) return true;
    return s.name.toLowerCase().includes(lower) || (s.en || '').toLowerCase().includes(lower);
  });

  return (
    <React.Fragment>
      <div
        onClick={onDismiss}
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
          height: '72%',
          background: _HT.bg,
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
            background: _HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '6px 16px 8px', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              fontFamily: _serifJa,
              fontSize: 18,
              fontWeight: 500,
              color: _HT.text,
            }}
          >
            樹形を選択
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: _sansJa,
              fontSize: 15,
              color: _HT.sub,
              padding: '6px 8px',
            }}
          >
            キャンセル
          </button>
        </div>

        <div style={{ padding: '4px 16px 10px' }}>
          <div
            style={{
              height: 44,
              borderRadius: 12,
              border: `1px solid ${_HT.border}`,
              background: _HT.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
            }}
          >
            <_HI.Search s={18} c={_HT.muted} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="樹形名で検索（例: 模様木, Moyogi）"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: _sansJa,
                fontSize: 15,
                color: _HT.text,
              }}
            />
            {q && (
              <button
                onClick={() => setQ('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: _HT.muted,
                  fontSize: 18,
                  padding: 4,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((s) => {
            const on = current === s.name;
            return (
              <div
                key={s.name}
                onClick={() => onSelect && onSelect(s.name)}
                style={{
                  padding: '12px 16px',
                  minHeight: 52,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${_HT.border}`,
                  background: on ? 'rgba(31,58,46,0.04)' : 'transparent',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div
                      style={{
                        fontFamily: _sansJa,
                        fontSize: 15,
                        lineHeight: '22px',
                        color: _HT.text,
                        fontWeight: on ? 500 : 400,
                      }}
                    >
                      {s.name}
                    </div>
                    {s.en && (
                      <div
                        style={{
                          fontFamily: 'var(--font-display-latin)',
                          fontStyle: 'italic',
                          fontSize: 11,
                          color: _HT.muted,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {s.en}
                      </div>
                    )}
                  </div>
                  {s.desc && (
                    <div
                      style={{
                        fontFamily: _sansJa,
                        fontSize: 11,
                        lineHeight: '17px',
                        color: _HT.sub,
                        marginTop: 3,
                      }}
                    >
                      {s.desc}
                    </div>
                  )}
                </div>
                {on && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: _HT.primary,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <_HI.Check s={14} />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                fontFamily: _sansJa,
                fontSize: 13,
                color: _HT.muted,
              }}
            >
              該当なし
            </div>
          )}
        </div>

        {/* sticky bottom — custom input */}
        <_CustomCreateButton onClick={() => setShowCustom(true)} />
      </div>

      {showCustom && (
        <CustomInputModal
          title="カスタム樹形を作成"
          placeholder="例: 直幹"
          existingNames={STYLE_LIST.map((s) => s.name)}
          onCancel={() => setShowCustom(false)}
          onConfirm={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
          onSelectExisting={(name) => {
            setShowCustom(false);
            onSelect && onSelect(name);
          }}
        />
      )}
    </React.Fragment>
  );
}

Object.assign(window, {
  CreateBonsaiScreen,
  SpeciesPickerScreen,
  StylePickerScreen,
  SpeciesPickerSheet,
  StylePickerSheet,
  CustomInputModal,
  STYLE_LIST,
  SPECIES_LIST,
});
