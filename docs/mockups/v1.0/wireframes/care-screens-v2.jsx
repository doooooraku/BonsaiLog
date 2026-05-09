// BonsaiLog — Care v2: bulk-select, per-action forms, heatmap watering history
const {
  HT: _C2HT,
  HI: _C2HI,
  hSerifJa: _c2SerifJa,
  hSansJa: _c2SansJa,
  hMono: _c2Mono,
  BonsaiPlaceholder: _C2BP,
  HStatusBar: _C2SB,
  MOCK_BONSAI: _C2MOCK,
  WORK_TYPES: _C2WORK_TYPES,
} = window;

// ═════════════════════════════════════════════════════════════
// Per-action form fields
// ═════════════════════════════════════════════════════════════

// Pill/segmented selector
function _Seg({ items, value, onChange, multi = false, small = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it) => {
        const v = typeof it === 'string' ? it : it.v;
        const l = typeof it === 'string' ? it : it.l;
        const on = multi ? (value || []).includes(v) : value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => {
              if (!onChange) return;
              if (multi) {
                const next = new Set(value || []);
                if (next.has(v)) next.delete(v);
                else next.add(v);
                onChange([...next]);
              } else onChange(v);
            }}
            style={{
              minHeight: small ? 40 : 44,
              padding: `0 ${small ? 12 : 16}px`,
              borderRadius: small ? 10 : 12,
              background: on ? _C2HT.primary : 'transparent',
              color: on ? '#F7F3E8' : _C2HT.sub,
              border: `1px solid ${on ? _C2HT.primary : _C2HT.border}`,
              fontFamily: _c2SansJa,
              fontSize: small ? 13 : 14,
              fontWeight: on ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function _Field({ label, hint, children, required = false }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <div style={{ fontFamily: _c2SansJa, fontSize: 13, fontWeight: 500, color: _C2HT.sub }}>
          {label}
          {!required && (
            <span style={{ color: _C2HT.muted, fontWeight: 400, marginLeft: 6 }}>任意</span>
          )}
        </div>
        {hint && (
          <div style={{ fontFamily: _c2Mono, fontSize: 11, color: _C2HT.muted }}>{hint}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function _TextInput({ value, onChange, placeholder, suffix }) {
  return (
    <div
      style={{
        height: 48,
        borderRadius: 12,
        background: _C2HT.surface,
        border: `1px solid ${_C2HT.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 8,
      }}
    >
      <input
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: _c2SansJa,
          fontSize: 16,
          color: _C2HT.text,
        }}
      />
      {suffix && (
        <span style={{ fontFamily: _c2Mono, fontSize: 13, color: _C2HT.muted }}>{suffix}</span>
      )}
    </div>
  );
}

// ═════════ Action-specific form bodies ═════════
function ActionFormFields({ workKey, state, setState, isBulk = false, onOpenPlacePicker }) {
  const set = (k, v) => setState((s) => ({ ...s, [k]: v }));

  switch (workKey) {
    case 'water':
      return (
        <_Field label="水量">
          <_Seg
            items={[
              { v: 'normal', l: 'いつも通り' },
              { v: 'plenty', l: 'たっぷり' },
              { v: 'light', l: '軽く' },
            ]}
            value={state.amount || 'normal'}
            onChange={(v) => set('amount', v)}
          />
        </_Field>
      );

    case 'prune':
      return (
        <React.Fragment>
          <_Field label="剪定部位">
            <_Seg
              multi
              items={[
                { v: 'eda', l: '枝' },
                { v: 'ha', l: '葉' },
                { v: 'shinme', l: '新芽' },
                { v: 'ne', l: '根' },
              ]}
              value={state.parts || ['eda']}
              onChange={(v) => set('parts', v)}
            />
          </_Field>
          <_Field label="切り取った量">
            <_Seg
              items={[
                { v: 'tip', l: '枝先のみ' },
                { v: 'mid', l: 'そこそこ' },
                { v: 'bold', l: '思い切り' },
              ]}
              value={state.amount || 'mid'}
              onChange={(v) => set('amount', v)}
            />
          </_Field>
        </React.Fragment>
      );

    case 'wire':
      return (
        <React.Fragment>
          <_Field label="番手">
            <_Seg
              items={['1mm', '1.5mm', '2mm', '2.5mm', '3mm', '3.5mm']}
              value={state.gauge || '1mm'}
              onChange={(v) => set('gauge', v)}
              small
            />
          </_Field>
          <_Field label="巻く部位">
            <_Seg
              multi
              items={[
                { v: 'all', l: 'すべて' },
                { v: 'miki', l: '幹' },
                { v: 'eda', l: '枝' },
              ]}
              value={state.parts || ['eda']}
              onChange={(v) => {
                const prev = state.parts || ['eda'];
                const justAdded = v.find((x) => !prev.includes(x));
                if (justAdded === 'all') set('parts', ['all']);
                else if (v.includes('all') && v.length > 1)
                  set(
                    'parts',
                    v.filter((x) => x !== 'all'),
                  );
                else set('parts', v);
              }}
            />
          </_Field>
          <_Field label="外し予定日" hint="外し時期の通知に使用">
            <input
              type="date"
              value={state.removeDate || ''}
              onChange={(e) => set('removeDate', e.target.value)}
              style={{
                height: 48,
                padding: '0 14px',
                borderRadius: 12,
                background: _C2HT.surface,
                border: `1px solid ${_C2HT.border}`,
                fontFamily: _c2Mono,
                fontSize: 14,
                color: _C2HT.text,
                letterSpacing: '0.04em',
                appearance: 'none',
                WebkitAppearance: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </_Field>
        </React.Fragment>
      );

    case 'unwire':
      return (
        <_Field label="外した部位">
          <_Seg
            multi
            items={[
              { v: 'miki', l: '幹' },
              { v: 'eda', l: '枝' },
              { v: 'all', l: 'すべて' },
            ]}
            value={state.parts || ['all']}
            onChange={(v) => set('parts', v)}
          />
        </_Field>
      );

    case 'repot':
      return (
        <React.Fragment>
          <_Field label="鉢サイズ" hint="cm">
            <_TextInput
              value={state.potSize}
              onChange={(v) => set('potSize', v)}
              placeholder="例: 18"
              suffix="cm"
            />
          </_Field>
          <_Field label="用土レシピ">
            <_TextInput
              value={state.soil}
              onChange={(v) => set('soil', v)}
              placeholder="例: 赤玉土:桐生砂 = 7:3"
            />
          </_Field>
          <_Field label="根の整理">
            <_Seg
              items={[
                { v: 'none', l: 'なし' },
                { v: 'light', l: '軽く' },
                { v: 'half', l: '1/3' },
                { v: 'heavy', l: '1/2' },
              ]}
              value={state.roots || 'light'}
              onChange={(v) => set('roots', v)}
            />
          </_Field>
        </React.Fragment>
      );

    case 'fert':
      return (
        <React.Fragment>
          <_Field label="肥料の種類">
            <_Seg
              items={[
                { v: 'solid', l: '置肥（玉肥）' },
                { v: 'liquid', l: '液肥' },
                { v: 'slow', l: '緩効性' },
                { v: 'other', l: 'その他' },
              ]}
              value={state.kind || 'solid'}
              onChange={(v) => set('kind', v)}
              small
            />
          </_Field>
          <_Field label="銘柄・配合" hint="任意">
            <_TextInput
              value={state.brand}
              onChange={(v) => set('brand', v)}
              placeholder="例: バイオゴールド"
            />
          </_Field>
          {state.kind === 'liquid' && (
            <_Field label="希釈倍率">
              <_TextInput
                value={state.dilution}
                onChange={(v) => set('dilution', v)}
                placeholder="例: 1000"
                suffix="倍"
              />
            </_Field>
          )}
        </React.Fragment>
      );

    case 'spray':
      return (
        <React.Fragment>
          <_Field label="目的">
            <_Seg
              items={[
                { v: 'prevent', l: '予防' },
                { v: 'treat', l: '治療' },
                { v: 'both', l: '両方' },
              ]}
              value={state.purpose || 'prevent'}
              onChange={(v) => set('purpose', v)}
            />
          </_Field>
          <_Field label="薬剤名">
            <_TextInput
              value={state.chemical}
              onChange={(v) => set('chemical', v)}
              placeholder="例: スミチオン"
            />
          </_Field>
          <_Field label="希釈倍率">
            <_TextInput
              value={state.dilution}
              onChange={(v) => set('dilution', v)}
              placeholder="例: 1000"
              suffix="倍"
            />
          </_Field>
        </React.Fragment>
      );

    case 'heal':
      return (
        <React.Fragment>
          <_Field label="症状">
            <_Seg
              multi
              items={[
                { v: 'yake', l: '葉焼け' },
                { v: 'kare', l: '枝枯れ' },
                { v: 'mushi', l: '虫' },
                { v: 'kabi', l: 'カビ' },
                { v: 'other', l: 'その他' },
              ]}
              value={state.symptoms || []}
              onChange={(v) => set('symptoms', v)}
              small
            />
          </_Field>
          <_Field label="処置">
            <_TextInput
              value={state.treatment}
              onChange={(v) => set('treatment', v)}
              placeholder="例: 患部除去・癒合剤塗布"
            />
          </_Field>
        </React.Fragment>
      );

    case 'leaf':
    case 'defol':
    case 'bud':
      return (
        <_Field label="範囲">
          <_Seg
            items={[
              { v: 'tip', l: '枝先のみ' },
              { v: 'mid', l: 'そこそこ' },
              { v: 'bold', l: '思い切り' },
            ]}
            value={state.scope || 'mid'}
            onChange={(v) => set('scope', v)}
          />
        </_Field>
      );

    case 'mekiri':
      return (
        <React.Fragment>
          <_Field label="範囲">
            <_Seg
              items={[
                { v: 'tip', l: '枝先のみ' },
                { v: 'mid', l: 'そこそこ' },
                { v: 'bold', l: '思い切り' },
              ]}
              value={state.scope || 'mid'}
              onChange={(v) => set('scope', v)}
            />
          </_Field>
          <_Field label="本数" hint="任意">
            <_TextInput
              value={state.count}
              onChange={(v) => set('count', v)}
              placeholder="例: 5"
              suffix="本"
            />
          </_Field>
        </React.Fragment>
      );

    case 'moss':
      return (
        <_Field label="作業内容">
          <_Seg
            multi
            items={[
              { v: 'add', l: '貼り直し' },
              { v: 'remove', l: '剥がす' },
              { v: 'water', l: '湿らす' },
            ]}
            value={state.tasks || ['water']}
            onChange={(v) => set('tasks', v)}
            small
          />
        </_Field>
      );
    case 'move':
      return (
        <React.Fragment>
          <_Field label="移動先">
            <button
              type="button"
              onClick={() => onOpenPlacePicker && onOpenPlacePicker()}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '0 14px',
                boxSizing: 'border-box',
                borderRadius: 12,
                border: `1px solid ${_C2HT.border}`,
                background: _C2HT.surface,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: _c2SansJa,
                fontSize: 17,
                color: state.location ? _C2HT.text : _C2HT.muted,
              }}
            >
              <span>{state.location || '選択してください'}</span>
              <span style={{ color: _C2HT.muted }}>›</span>
            </button>
          </_Field>
        </React.Fragment>
      );

    default:
      return null;
  }
}

// ═════════════════════════════════════════════════════════════
// Place picker sheet — prefers user-entered places, with presets
// ═════════════════════════════════════════════════════════════
const _PLACE_PRESETS = ['ベランダ南', 'ベランダ北', '棚', '室内', '日陰'];

function PlacePickerSheet({ current = null, onDismiss, onSelect }) {
  const [q, setQ] = React.useState('');
  const [showCustom, setShowCustom] = React.useState(false);
  const lower = q.trim().toLowerCase();
  const filtered = _PLACE_PRESETS.filter((p) => !lower || p.toLowerCase().includes(lower));

  return (
    <React.Fragment>
      <div
        onClick={onDismiss}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,26,26,0.4)',
          zIndex: 90,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 91,
          height: '78%',
          background: _C2HT.bg,
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
            background: _C2HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '6px 16px 8px', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              fontFamily: _c2SerifJa,
              fontSize: 18,
              fontWeight: 500,
              color: _C2HT.text,
            }}
          >
            移動先を選択
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: _c2SansJa,
              fontSize: 15,
              color: _C2HT.sub,
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
              border: `1px solid ${_C2HT.border}`,
              background: _C2HT.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
            }}
          >
            <_C2HI.Search s={18} c={_C2HT.muted} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="場所名で検索"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: _c2SansJa,
                fontSize: 15,
                color: _C2HT.text,
              }}
            />
            {q && (
              <button
                onClick={() => setQ('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: _C2HT.muted,
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
          {filtered.map((p) => {
            const on = current === p;
            return (
              <div
                key={p}
                onClick={() => onSelect && onSelect(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  minHeight: 52,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${_C2HT.border}`,
                  background: on ? 'rgba(31,58,46,0.04)' : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: _c2SansJa,
                      fontSize: 15,
                      lineHeight: '20px',
                      color: _C2HT.text,
                      fontWeight: on ? 500 : 400,
                    }}
                  >
                    {p}
                  </div>
                </div>
                {on && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: _C2HT.primary,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <_C2HI.Check s={14} />
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
                fontFamily: _c2SansJa,
                fontSize: 13,
                color: _C2HT.muted,
              }}
            >
              該当なし
            </div>
          )}
        </div>

        {/* sticky bottom — custom input */}
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: 'none',
            borderTop: `1px solid ${_C2HT.border}`,
            background: _C2HT.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: _c2SansJa,
            fontSize: 15,
            fontWeight: 500,
            color: _C2HT.primary,
            cursor: 'pointer',
          }}
        >
          <_C2HI.Plus s={18} c={_C2HT.primary} />
          カスタム入力
        </button>
      </div>

      {showCustom && (
        <window.CustomInputModal
          title="カスタム場所を作成"
          placeholder="例: 玄関先"
          existingNames={_PLACE_PRESETS}
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

// ═════════════════════════════════════════════════════════════
// Enhanced single-bonsai log sheet (replacement for WorkLogConfirmSheet)
// ═════════════════════════════════════════════════════════════
function WorkLogConfirmSheetV2({ type = 'water', onDismiss, onSave, bonsaiName = '父の黒松' }) {
  const work = (_C2WORK_TYPES || []).find((w) => w.k === type) || {
    k: type,
    label: type,
    Icon: () => null,
  };
  const [state, setState] = React.useState({});
  const [note, setNote] = React.useState('');
  const [showPlacePicker, setShowPlacePicker] = React.useState(false);

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
          height: '82%',
          background: _C2HT.bg,
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
            background: _C2HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div
          style={{
            padding: '8px 24px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: _C2HT.primary, display: 'inline-flex' }}>
            {work.Icon ? <work.Icon s={24} /> : null}
          </span>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: _c2SerifJa,
                fontSize: 20,
                fontWeight: 500,
                color: _C2HT.text,
                letterSpacing: '0.02em',
                lineHeight: '24px',
              }}
            >
              {work.label}を記録
            </div>
            <div style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.sub, marginTop: 2 }}>
              {bonsaiName}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }}>
          <_Field label="日付">
            <div
              style={{
                height: 48,
                borderRadius: 12,
                background: _C2HT.surface,
                border: `1px solid ${_C2HT.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 14px',
                fontFamily: _c2SansJa,
                fontSize: 17,
                color: _C2HT.text,
              }}
            >
              <span>今日（4月24日）</span>
              <_C2HI.Edit s={18} c={_C2HT.muted} />
            </div>
          </_Field>

          <ActionFormFields
            workKey={work.k}
            state={state}
            setState={setState}
            onOpenPlacePicker={() => setShowPlacePicker(true)}
          />

          {/* Memo */}
          <_Field label="メモ" hint={`${note.length}/2000`}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              placeholder="自由メモ"
              style={{
                width: '100%',
                minHeight: 96,
                padding: 14,
                boxSizing: 'border-box',
                borderRadius: 12,
                border: `1px solid ${_C2HT.border}`,
                background: _C2HT.surface,
                fontFamily: _c2SansJa,
                fontSize: 16,
                lineHeight: '26px',
                color: _C2HT.text,
                outline: 'none',
                resize: 'none',
              }}
            />
          </_Field>

          {/* Photos — Repolog-inspired: vertical, large preview, reorder + caption */}
          <_Field label="写真" hint="↑↓で並べ替え、×で削除">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1].map((i, idx, arr) => {
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${_C2HT.border}`,
                      borderRadius: 12,
                      background: _C2HT.surface,
                      overflow: 'hidden',
                    }}
                  >
                    {/* toolbar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px 6px 12px',
                        borderBottom: `1px solid ${_C2HT.border}`,
                        background: _C2HT.bg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            fontFamily: _c2Mono,
                            fontSize: 12,
                            fontWeight: 600,
                            color: _C2HT.muted,
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
                            color: _C2HT.text,
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
                            color: _C2HT.text,
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
                        <_C2HI.Close s={18} c="#8B2E2E" />
                      </button>
                    </div>
                    {/* photo body (placeholder) */}
                    <div
                      style={{
                        width: '100%',
                        height: 200,
                        background: `linear-gradient(135deg, ${_C2HT.border} 0%, ${_C2HT.muted} 100%)`,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <_C2HI.Camera s={36} c="#F7F3E8" />
                    </div>
                    {/* caption */}
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
                          fontFamily: _c2SansJa,
                          fontSize: 14,
                          color: _C2HT.text,
                          padding: '4px 0',
                        }}
                      />
                      <div
                        style={{
                          fontFamily: _c2Mono,
                          fontSize: 10,
                          color: _C2HT.muted,
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
                  border: `1.5px dashed ${_C2HT.primary}`,
                  background: 'transparent',
                  color: _C2HT.primary,
                  fontFamily: _c2SansJa,
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <_C2HI.Plus s={18} c={_C2HT.primary} /> 追加
              </button>
            </div>
          </_Field>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 34px',
            background: _C2HT.bg,
            borderTop: `1px solid ${_C2HT.border}`,
          }}
        >
          <button
            onClick={onSave}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: _C2HT.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _c2SansJa,
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
      {showPlacePicker && (
        <PlacePickerSheet
          current={state.location || null}
          onDismiss={() => setShowPlacePicker(false)}
          onSelect={(name) => {
            setState((s) => ({ ...s, location: name }));
            setShowPlacePicker(false);
          }}
        />
      )}
    </React.Fragment>
  );
}

// ═════════════════════════════════════════════════════════════
// Bulk-select Home screen
// ═════════════════════════════════════════════════════════════
function HomeBulkSelectScreen({
  selected = ['a', 'b', 'd'],
  onToggle,
  onCancel,
  onNext,
  mode = 'log',
}) {
  const list = _C2MOCK || [];
  const isSel = (id) => selected.includes(id);
  const count = selected.length;
  const isSchedule = mode === 'schedule';
  const headerTitle =
    count > 0 ? `${count}件 選択中` : isSchedule ? '予定を追加する盆栽' : '盆栽を選択';
  const ctaLabel = isSchedule ? `${count}件にまとめて予定追加` : `${count}件をまとめて記録`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _C2HT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_C2SB />
      {/* Selection header */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 16px',
          borderBottom: `1px solid ${_C2HT.border}`,
          background: _C2HT.surface,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer',
            fontFamily: _c2SansJa,
            fontSize: 15,
            color: _C2HT.sub,
          }}
        >
          キャンセル
        </button>
        <div style={{ fontFamily: _c2SerifJa, fontSize: 17, fontWeight: 500, color: _C2HT.text }}>
          {headerTitle}
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer',
            fontFamily: _c2SansJa,
            fontSize: 14,
            color: _C2HT.primary,
            fontWeight: 500,
          }}
        >
          すべて
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 120 }}>
        {list.map((b, i) => {
          const sel = isSel(b.id);
          return (
            <div
              key={b.id}
              onClick={() => onToggle && onToggle(b.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                cursor: 'pointer',
                background: sel ? 'rgba(31,58,46,0.05)' : 'transparent',
                borderBottom: `1px solid ${_C2HT.border}`,
              }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  flexShrink: 0,
                  border: `2px solid ${sel ? _C2HT.primary : _C2HT.borderStrong}`,
                  background: sel ? _C2HT.primary : 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {sel && (
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path
                      d="M2 6l3 3 5-6"
                      stroke="#F7F3E8"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <_C2BP w={56} h={56} radius={10} seed={i} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: _c2SerifJa,
                    fontSize: 17,
                    fontWeight: 500,
                    color: _C2HT.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {b.name}
                </div>
                <div
                  style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.sub, marginTop: 2 }}
                >
                  {b.species}
                  {b.latin && (
                    <span
                      style={{
                        fontFamily: 'var(--font-display-latin)',
                        fontStyle: 'italic',
                        marginLeft: 6,
                      }}
                    >
                      {b.latin}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: _c2Mono,
                    fontSize: 11,
                    color: _C2HT.muted,
                    marginTop: 4,
                    letterSpacing: '0.06em',
                  }}
                >
                  最終水やり {b.water}前
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom action bar */}
      {count > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 34px',
            background: _C2HT.bg,
            borderTop: `1px solid ${_C2HT.border}`,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={onNext}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: _C2HT.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _c2SansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <_C2HI.Check s={18} />
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Bulk action picker (compact)
// ═════════════════════════════════════════════════════════════
function BulkWorkPickerSheet({ selectedIds = ['a', 'b', 'd'], onSelect, onDismiss, mode = 'log' }) {
  const list = _C2MOCK || [];
  const selected = list.filter((b) => selectedIds.includes(b.id));
  const items = (_C2WORK_TYPES || []).filter((w) => !w.speciesOnly); // hide species-locked in bulk
  const isSchedule = mode === 'schedule';
  const sheetTitle = isSchedule ? 'まとめて予定追加' : 'まとめて記録';
  const sheetSub = isSchedule
    ? `${selectedIds.length}件の盆栽に同じ予定を追加`
    : `${selectedIds.length}件の盆栽に同じ作業を記録`;
  const noteText = isSchedule
    ? '一括予定追加では樹種を問わない作業のみ表示。松類限定の「芽切り」は単独追加から。'
    : '一括記録では樹種を問わない作業のみ表示。松類限定の「芽切り」は単独記録から。';
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
          background: _C2HT.bg,
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
            background: _C2HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '10px 24px 8px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: _c2SerifJa,
              fontSize: 20,
              fontWeight: 500,
              color: _C2HT.text,
              letterSpacing: '0.02em',
            }}
          >
            {sheetTitle}
          </div>
          <div style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.sub, marginTop: 2 }}>
            {sheetSub}
          </div>
        </div>
        {/* Selected chips */}
        <div
          style={{
            padding: '8px 16px 12px',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            borderBottom: `1px solid ${_C2HT.border}`,
          }}
        >
          {selected.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px 4px 4px',
                borderRadius: 18,
                background: _C2HT.surface,
                border: `1px solid ${_C2HT.border}`,
                flexShrink: 0,
              }}
            >
              <_C2BP w={24} h={24} radius={12} seed={list.findIndex((x) => x.id === b.id)} />
              <div
                style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.text, fontWeight: 500 }}
              >
                {b.name}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 34px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {items.map((w) => (
              <button
                key={w.k}
                onClick={() => onSelect && onSelect(w)}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 12,
                  background: _C2HT.surface,
                  border: `1px solid ${_C2HT.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: 8,
                }}
              >
                <div style={{ color: _C2HT.primary }}>{w.Icon ? <w.Icon s={32} /> : null}</div>
                <div
                  style={{
                    fontFamily: _c2SansJa,
                    fontSize: 13,
                    color: _C2HT.text,
                    textAlign: 'center',
                  }}
                >
                  {w.label}
                </div>
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              background: _C2HT.surface,
              border: `1px solid ${_C2HT.border}`,
            }}
          >
            <div
              style={{
                fontFamily: _c2Mono,
                fontSize: 10,
                color: _C2HT.muted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              NOTE
            </div>
            <div
              style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.sub, lineHeight: '19px' }}
            >
              {noteText}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ═════════════════════════════════════════════════════════════
// Bulk log confirm sheet — shared form, applied to all
// ═════════════════════════════════════════════════════════════
function BulkLogConfirmSheet({ type = 'water', selectedIds = ['a', 'b', 'd'], onDismiss, onSave }) {
  const list = _C2MOCK || [];
  const selected = list.filter((b) => selectedIds.includes(b.id));
  const work = (_C2WORK_TYPES || []).find((w) => w.k === type) || {
    k: type,
    label: type,
    Icon: () => null,
  };
  const [state, setState] = React.useState({});
  const [note, setNote] = React.useState('');
  const [excluded, setExcluded] = React.useState([]);
  const [showPlacePicker, setShowPlacePicker] = React.useState(false);
  const finalCount = selected.length - excluded.length;

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
          height: '90%',
          background: _C2HT.bg,
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
            background: _C2HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div
          style={{
            padding: '8px 24px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: _C2HT.primary, display: 'inline-flex' }}>
            {work.Icon ? <work.Icon s={24} /> : null}
          </span>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: _c2SerifJa,
                fontSize: 20,
                fontWeight: 500,
                color: _C2HT.text,
                letterSpacing: '0.02em',
                lineHeight: '24px',
              }}
            >
              {work.label}を{finalCount}件にまとめて記録
            </div>
            <div style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.sub, marginTop: 2 }}>
              同じ内容で各盆栽に保存します
            </div>
          </div>
        </div>

        {/* Selected list with toggle */}
        <div
          style={{
            padding: '8px 16px 12px',
            borderBottom: `1px solid ${_C2HT.border}`,
          }}
        >
          <div
            style={{
              fontFamily: _c2Mono,
              fontSize: 10,
              color: _C2HT.muted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            対象 · {finalCount}件
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selected.map((b, i) => {
              const off = excluded.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setExcluded((prev) =>
                      prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id],
                    );
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px 4px 4px',
                    borderRadius: 18,
                    background: off ? 'transparent' : _C2HT.surface,
                    border: `1px solid ${off ? _C2HT.border : _C2HT.primary}`,
                    cursor: 'pointer',
                    opacity: off ? 0.5 : 1,
                    textDecoration: off ? 'line-through' : 'none',
                    textDecorationColor: _C2HT.muted,
                  }}
                >
                  <_C2BP w={24} h={24} radius={12} seed={list.findIndex((x) => x.id === b.id)} />
                  <span
                    style={{
                      fontFamily: _c2SansJa,
                      fontSize: 12,
                      color: _C2HT.text,
                      fontWeight: 500,
                    }}
                  >
                    {b.name}
                  </span>
                  {!off && <_C2HI.Close s={12} c={_C2HT.muted} />}
                </button>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: _c2Mono,
              fontSize: 10,
              color: _C2HT.muted,
              marginTop: 8,
              letterSpacing: '0.06em',
            }}
          >
            タップで除外できます
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 140px' }}>
          <_Field label="日付">
            <div
              style={{
                height: 48,
                borderRadius: 12,
                background: _C2HT.surface,
                border: `1px solid ${_C2HT.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 14px',
                fontFamily: _c2SansJa,
                fontSize: 17,
                color: _C2HT.text,
              }}
            >
              <span>今日（4月24日）</span>
              <_C2HI.Edit s={18} c={_C2HT.muted} />
            </div>
          </_Field>

          <ActionFormFields
            workKey={work.k}
            state={state}
            setState={setState}
            isBulk
            onOpenPlacePicker={() => setShowPlacePicker(true)}
          />

          <_Field label="共通メモ" hint={`${note.length}/2000`}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              placeholder="全件に同じメモを保存"
              style={{
                width: '100%',
                minHeight: 80,
                padding: 14,
                boxSizing: 'border-box',
                borderRadius: 12,
                border: `1px solid ${_C2HT.border}`,
                background: _C2HT.surface,
                fontFamily: _c2SansJa,
                fontSize: 16,
                lineHeight: '26px',
                color: _C2HT.text,
                outline: 'none',
                resize: 'none',
              }}
            />
          </_Field>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: _C2HT.surface,
              border: `1px solid ${_C2HT.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'rgba(198,158,72,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: _c2Mono,
                    fontSize: 11,
                    color: 'var(--accent-gold)',
                    fontWeight: 600,
                  }}
                >
                  i
                </span>
              </div>
              <div
                style={{
                  fontFamily: _c2SansJa,
                  fontSize: 12,
                  color: _C2HT.sub,
                  lineHeight: '19px',
                }}
              >
                個別の写真や個別メモはあとから各盆栽の履歴で追記できます。
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 34px',
            background: _C2HT.bg,
            borderTop: `1px solid ${_C2HT.border}`,
          }}
        >
          <button
            onClick={onSave}
            disabled={finalCount === 0}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: finalCount === 0 ? _C2HT.borderStrong : _C2HT.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _c2SansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: finalCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {finalCount}件に記録する
          </button>
        </div>
      </div>
      {showPlacePicker && (
        <PlacePickerSheet
          current={state.location || null}
          onDismiss={() => setShowPlacePicker(false)}
          onSelect={(name) => {
            setState((s) => ({ ...s, location: name }));
            setShowPlacePicker(false);
          }}
        />
      )}
    </React.Fragment>
  );
}

// ═════════════════════════════════════════════════════════════
// GitHub-style watering heatmap
// ═════════════════════════════════════════════════════════════
function WateringHeatmapScreen({ onBack }) {
  const [range, setRange] = React.useState('90');
  const ranges = [
    { k: '30', l: '30日' },
    { k: '90', l: '90日' },
    { k: '365', l: '365日' },
  ];

  // Build deterministic intensity grid
  const days = parseInt(range, 10);
  const today = new Date(2026, 3, 24); // Apr 24 2026
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  // Pad to start of week (Sunday)
  const firstDow = start.getDay();
  const padStart = firstDow; // empty cells before
  const total = padStart + days;
  const weeks = Math.ceil(total / 7);

  // Pseudo-random intensity 0..2 (and 1-2 occasionally) — deterministic
  function intensityForDay(d, idx) {
    const seed = (d.getDate() * 31 + d.getMonth() * 17 + idx) % 13;
    if (seed === 0 || seed === 5) return 0; // ~15% no record
    if (seed === 3 || seed === 11) return 2; // ~15% double water
    return 1;
  }
  const cells = [];
  for (let i = 0; i < padStart; i++) cells.push(null);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, val: intensityForDay(d, i) });
  }
  while (cells.length < weeks * 7) cells.push(null);

  const palette = ['#EDE7D8', '#A7B79E', _C2HT.primary]; // 0,1,2 — soft → deep
  const cellSize = range === '30' ? 26 : range === '90' ? 16 : 8;
  const cellGap = range === '365' ? 2 : 3;

  // Month labels (only show first day-of-month with capacity)
  const monthLabels = [];
  cells.forEach((c, i) => {
    if (c && c.date.getDate() === 1) {
      const week = Math.floor(i / 7);
      const ja = [
        '1月',
        '2月',
        '3月',
        '4月',
        '5月',
        '6月',
        '7月',
        '8月',
        '9月',
        '10月',
        '11月',
        '12月',
      ][c.date.getMonth()];
      monthLabels.push({ week, label: ja });
    }
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _C2HT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_C2SB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid ${_C2HT.border}`,
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
          <_C2HI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _c2SerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _C2HT.text,
            letterSpacing: '0.02em',
          }}
        >
          水やり履歴
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>
        <div style={{ padding: '0 8px', fontFamily: _c2SansJa, fontSize: 13, color: _C2HT.sub }}>
          父の黒松{' '}
          <span
            style={{ fontFamily: 'var(--font-display-latin)', fontStyle: 'italic', marginLeft: 4 }}
          >
            Pinus thunbergii
          </span>
        </div>

        {/* Range tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            margin: '16px 8px 24px',
            border: `1px solid ${_C2HT.border}`,
            borderRadius: 8,
            padding: 2,
            background: _C2HT.surface,
          }}
        >
          {ranges.map((r) => {
            const on = r.k === range;
            return (
              <button
                key={r.k}
                onClick={() => setRange(r.k)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  background: on ? _C2HT.primary : 'transparent',
                  color: on ? '#F7F3E8' : _C2HT.sub,
                  border: 'none',
                  fontFamily: _c2SansJa,
                  fontSize: 14,
                  fontWeight: on ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                {r.l}
              </button>
            );
          })}
        </div>

        {/* Heatmap card */}
        <div
          style={{
            background: _C2HT.surface,
            border: `1px solid ${_C2HT.border}`,
            borderRadius: 12,
            padding: '18px 16px 16px',
            overflow: 'hidden',
          }}
        >
          {/* Month labels row */}
          <div
            style={{
              position: 'relative',
              height: 14,
              marginLeft: 24,
              marginBottom: 4,
            }}
          >
            {monthLabels.map((m, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: m.week * (cellSize + cellGap),
                  fontFamily: _c2Mono,
                  fontSize: 9,
                  color: _C2HT.muted,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {/* Day-of-week labels */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: cellGap,
                paddingTop: 0,
                width: 18,
                flexShrink: 0,
              }}
            >
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div
                  key={d}
                  style={{
                    height: cellSize,
                    lineHeight: `${cellSize}px`,
                    fontFamily: _c2Mono,
                    fontSize: 9,
                    color: i === 3 || i === 6 || i === 0 ? _C2HT.muted : 'transparent',
                    letterSpacing: '0.04em',
                    textAlign: 'right',
                  }}
                >
                  {i === 0 || i === 3 || i === 6 ? d : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
                gridTemplateRows: `repeat(7, ${cellSize}px)`,
                gridAutoFlow: 'column',
                gap: cellGap,
                flex: 1,
                minWidth: 0,
              }}
            >
              {cells.map((c, i) => {
                if (!c) {
                  return <div key={i} style={{ background: 'transparent' }} />;
                }
                const isToday = c.date.getTime() === today.getTime();
                const bg = c.val === 0 ? palette[0] : c.val === 1 ? palette[1] : palette[2];
                return (
                  <div
                    key={i}
                    title={`${c.date.getMonth() + 1}/${c.date.getDate()}: ${c.val === 0 ? '未記録' : c.val === 2 ? '2回' : '1回'}`}
                    style={{
                      background: bg,
                      borderRadius: range === '365' ? 1 : 3,
                      border: isToday ? `1.5px solid ${_C2HT.text}` : 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              fontFamily: _c2Mono,
              fontSize: 10,
              color: _C2HT.muted,
              letterSpacing: '0.06em',
            }}
          >
            <span>少</span>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: range === '365' ? 10 : 14,
                  height: range === '365' ? 10 : 14,
                  borderRadius: 3,
                  background: palette[i],
                }}
              />
            ))}
            <span>多</span>
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            marginTop: 24,
            padding: '20px 8px',
            borderTop: `1px solid ${_C2HT.border}`,
            borderBottom: `1px solid ${_C2HT.border}`,
          }}
        >
          <div
            style={{
              fontFamily: _c2Mono,
              fontSize: 11,
              color: _C2HT.muted,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            最後の水やりから
          </div>
          <div
            style={{
              fontFamily: _c2SerifJa,
              fontSize: 28,
              lineHeight: '36px',
              fontWeight: 500,
              color: _C2HT.text,
              letterSpacing: '0.02em',
            }}
          >
            1日
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: '0 8px',
            fontFamily: _c2Mono,
            fontSize: 11,
            lineHeight: '18px',
            color: _C2HT.muted,
            letterSpacing: '0.04em',
          }}
        >
          ※ これは記録の表示です。水やりの判定はしません。
          <br />
          濃淡は記録回数（薄: 0回 / 中: 1回 / 濃: 2回）。
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Bulk schedule date picker — pick a date that applies to all selected
// ═════════════════════════════════════════════════════════════
function BulkScheduleDateSheet({
  type = 'fert',
  selectedIds = ['a', 'b', 'd'],
  onDismiss,
  onSave,
}) {
  const list = _C2MOCK || [];
  const selected = list.filter((b) => selectedIds.includes(b.id));
  const work = (_C2WORK_TYPES || []).find((w) => w.k === type) || {
    k: type,
    label: type,
    Icon: () => null,
  };
  const [date, setDate] = React.useState({ y: 2026, m: 5, d: 20 });
  const [notify, setNotify] = React.useState(true);
  const dateLong = `${date.y}年${date.m}月${date.d}日`;

  const today = { y: 2026, m: 5, d: 7 };
  const daysInMonth = new Date(date.y, date.m, 0).getDate();
  const firstDow = new Date(date.y, date.m - 1, 1).getDay();
  const isToday = (d) => d === today.d && date.m === today.m && date.y === today.y;
  const isSel = (d) => d === date.d;

  const goPrev = () => {
    let m = date.m - 1,
      y = date.y;
    if (m < 1) {
      m = 12;
      y--;
    }
    setDate({ ...date, y, m, d: Math.min(date.d, new Date(y, m, 0).getDate()) });
  };
  const goNext = () => {
    let m = date.m + 1,
      y = date.y;
    if (m > 12) {
      m = 1;
      y++;
    }
    setDate({ ...date, y, m, d: Math.min(date.d, new Date(y, m, 0).getDate()) });
  };

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
          height: '88%',
          background: _C2HT.bg,
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
            background: _C2HT.borderStrong,
            opacity: 0.5,
            margin: '10px auto 4px',
          }}
        />
        <div style={{ padding: '8px 24px 10px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: _c2SerifJa,
              fontSize: 20,
              fontWeight: 500,
              color: _C2HT.text,
              letterSpacing: '0.02em',
            }}
          >
            {work.label} の予定日
          </div>
          <div style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.sub, marginTop: 2 }}>
            {selected.length}件の盆栽に同じ日付で追加
          </div>
        </div>

        {/* Selected chips */}
        <div
          style={{
            padding: '4px 16px 12px',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            borderBottom: `1px solid ${_C2HT.border}`,
          }}
        >
          {selected.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px 4px 4px',
                borderRadius: 18,
                background: _C2HT.surface,
                border: `1px solid ${_C2HT.border}`,
                flexShrink: 0,
              }}
            >
              <_C2BP w={24} h={24} radius={12} seed={list.findIndex((x) => x.id === b.id)} />
              <div
                style={{ fontFamily: _c2SansJa, fontSize: 12, color: _C2HT.text, fontWeight: 500 }}
              >
                {b.name}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
          {/* Month nav */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <button
              onClick={goPrev}
              style={{
                width: 44,
                height: 44,
                border: `1px solid ${_C2HT.border}`,
                borderRadius: 22,
                background: _C2HT.surface,
                fontFamily: _c2Mono,
                fontSize: 18,
                color: _C2HT.text,
                cursor: 'pointer',
              }}
            >
              ‹
            </button>
            <div
              style={{ fontFamily: _c2SerifJa, fontSize: 18, color: _C2HT.text, fontWeight: 500 }}
            >
              {date.y}年 {date.m}月
            </div>
            <button
              onClick={goNext}
              style={{
                width: 44,
                height: 44,
                border: `1px solid ${_C2HT.border}`,
                borderRadius: 22,
                background: _C2HT.surface,
                fontFamily: _c2Mono,
                fontSize: 18,
                color: _C2HT.text,
                cursor: 'pointer',
              }}
            >
              ›
            </button>
          </div>

          {/* Weekday header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              marginBottom: 6,
            }}
          >
            {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  fontFamily: _c2Mono,
                  fontSize: 11,
                  padding: '4px 0',
                  color: i === 0 ? _C2HT.danger : i === 6 ? _C2HT.primary : _C2HT.muted,
                  letterSpacing: '0.06em',
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`pad${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const sel = isSel(d);
              const today = isToday(d);
              const dow = (firstDow + d - 1) % 7;
              return (
                <button
                  key={d}
                  onClick={() => setDate({ ...date, d })}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: 8,
                    background: sel ? _C2HT.primary : 'transparent',
                    border: `1px solid ${sel ? _C2HT.primary : today ? _C2HT.primary : _C2HT.border}`,
                    fontFamily: _c2Mono,
                    fontSize: 14,
                    cursor: 'pointer',
                    color: sel ? '#F7F3E8' : dow === 0 ? _C2HT.danger : _C2HT.text,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Notify toggle */}
          <div
            onClick={() => setNotify((n) => !n)}
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: notify ? 'rgba(31,58,46,0.06)' : _C2HT.surface,
              border: `1px solid ${notify ? _C2HT.primary : _C2HT.border}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                flexShrink: 0,
                background: notify ? _C2HT.primary : 'transparent',
                border: `1.5px solid ${notify ? _C2HT.primary : _C2HT.borderStrong}`,
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
                style={{ fontFamily: _c2SansJa, fontSize: 14, fontWeight: 500, color: _C2HT.text }}
              >
                {notify ? '通知をオン' : '通知なし'}
              </div>
              <div
                style={{
                  fontFamily: _c2SansJa,
                  fontSize: 12,
                  color: _C2HT.sub,
                  marginTop: 2,
                  lineHeight: '18px',
                }}
              >
                {notify
                  ? `${dateLong} に各盆栽の予定としてプッシュ通知でお知らせします。`
                  : 'タイムライン表示のみ。通知は届きません。'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            padding: '12px 16px 22px',
            borderTop: `1px solid ${_C2HT.border}`,
            background: _C2HT.bg,
          }}
        >
          <button
            onClick={onSave}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 12,
              background: _C2HT.primary,
              color: '#F7F3E8',
              border: 'none',
              fontFamily: _c2SansJa,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            {selected.length}件にまとめて予定追加
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, {
  WorkLogConfirmSheetV2,
  HomeBulkSelectScreen,
  BulkWorkPickerSheet,
  BulkLogConfirmSheet,
  BulkScheduleDateSheet,
  WateringHeatmapScreen,
  ActionFormFields,
  PlacePickerSheet,
});
