// BonsaiLog — Paywall / Settings / Migration / Ads screens
const {
  HT: _XT,
  HI: _XI,
  hSerifJa: _xSerifJa,
  hSansJa: _xSansJa,
  hMono: _xMono,
  BonsaiPlaceholder: _XBP,
  HStatusBar: _XSB,
  TabBar: _XTB,
} = window;

// ═════════ Screen 1: Paywall Modal ═════════
function PaywallScreen({ onClose, onPurchase, onRestore }) {
  const [plan, setPlan] = React.useState('year');

  const FeatureRow = ({ name, free, pro, highlight }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 72px 72px',
        alignItems: 'center',
        padding: '14px 4px',
        borderBottom: `1px solid ${_XT.border}`,
      }}
    >
      <div
        style={{
          fontFamily: _xSansJa,
          fontSize: 14,
          color: _XT.text,
          fontWeight: highlight ? 500 : 400,
        }}
      >
        {name}
      </div>
      <div style={{ textAlign: 'center', fontFamily: _xMono, fontSize: 13, color: _XT.muted }}>
        {free}
      </div>
      <div
        style={{
          textAlign: 'center',
          fontFamily: _xMono,
          fontSize: 13,
          color: _XT.primary,
          fontWeight: 500,
        }}
      >
        {pro}
      </div>
    </div>
  );

  const PlanCard = ({ k, title, price, sub, badge, icon, recommended }) => {
    const on = plan === k;
    return (
      <button
        onClick={() => setPlan(k)}
        style={{
          width: '100%',
          padding: '16px 18px',
          borderRadius: 12,
          background: on ? 'rgba(31,58,46,0.04)' : _XT.surface,
          border: `${on ? 2 : 1}px solid ${on ? _XT.primary : _XT.border}`,
          cursor: 'pointer',
          textAlign: 'left',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {recommended && (
          <div
            style={{
              position: 'absolute',
              top: -10,
              left: 16,
              padding: '2px 10px',
              background: _XT.primary,
              color: '#F7F3E8',
              borderRadius: 10,
              fontFamily: _xMono,
              fontSize: 10,
              letterSpacing: '0.14em',
            }}
          >
            おすすめ
          </div>
        )}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            border: `2px solid ${on ? _XT.primary : _XT.borderStrong}`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {on && (
            <div style={{ width: 10, height: 10, borderRadius: 5, background: _XT.primary }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontFamily: _xSansJa, fontSize: 15, fontWeight: 500, color: _XT.text }}>
              {title}
            </span>
            <span
              style={{
                fontFamily: _xSerifJa,
                fontSize: 22,
                fontWeight: 500,
                color: _XT.text,
                letterSpacing: '0.02em',
              }}
            >
              {price}
            </span>
            {badge && (
              <span
                style={{
                  fontFamily: _xMono,
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(198,158,72,0.18)',
                  color: _XT.text,
                  letterSpacing: '0.06em',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontFamily: _xSansJa, fontSize: 12, color: _XT.sub, marginTop: 4 }}>
            {sub}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _XT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_XSB />
      {/* header */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid ${_XT.border}`,
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
          <_XI.Close s={28} />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _xSerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _XT.text,
            letterSpacing: '0.02em',
          }}
        >
          BonsaiLog Pro
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 120px' }}>
        {/* Hero */}
        <div style={{ padding: '12px 8px 24px' }}>
          <div
            style={{
              fontFamily: _xMono,
              fontSize: 11,
              color: _XT.muted,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Unlock
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: _xSerifJa,
              fontSize: 32,
              lineHeight: '42px',
              fontWeight: 500,
              color: _XT.text,
              letterSpacing: '0.02em',
            }}
          >
            鉢1本ずつ、
            <br />
            一生分。
          </h1>
          <div
            style={{
              marginTop: 10,
              fontFamily: _xSansJa,
              fontSize: 15,
              lineHeight: '24px',
              color: _XT.sub,
            }}
          >
            Proで、記録の可能性を解き放つ。
          </div>
        </div>

        {/* Feature comparison */}
        <div
          style={{
            background: _XT.surface,
            border: `1px solid ${_XT.border}`,
            borderRadius: 12,
            padding: '8px 16px 4px',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 72px',
              padding: '10px 4px',
              borderBottom: `1px solid ${_XT.borderStrong}`,
            }}
          >
            <div
              style={{
                fontFamily: _xMono,
                fontSize: 10,
                color: _XT.muted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              機能
            </div>
            <div
              style={{
                textAlign: 'center',
                fontFamily: _xMono,
                fontSize: 10,
                color: _XT.muted,
                letterSpacing: '0.12em',
              }}
            >
              FREE
            </div>
            <div
              style={{
                textAlign: 'center',
                fontFamily: _xMono,
                fontSize: 10,
                color: _XT.primary,
                letterSpacing: '0.12em',
                fontWeight: 500,
              }}
            >
              PRO
            </div>
          </div>
          <FeatureRow name="樹木登録数" free="∞" pro="∞" />
          <FeatureRow name="写真枚数" free="∞" pro="∞" />
          <FeatureRow name="作業履歴" free="∞" pro="∞" />
          <FeatureRow name="全データバックアップ(ZIP)" free="◎" pro="◎" />
          <FeatureRow name="CSV/PDFエクスポート" free="—" pro="◎" highlight />
          <FeatureRow name="テーマ" free="標準" pro="◎" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 72px',
              alignItems: 'center',
              padding: '14px 4px',
            }}
          >
            <div style={{ fontFamily: _xSansJa, fontSize: 14, color: _XT.text }}>広告表示</div>
            <div
              style={{ textAlign: 'center', fontFamily: _xMono, fontSize: 12, color: _XT.muted }}
            >
              あり
            </div>
            <div
              style={{
                textAlign: 'center',
                fontFamily: _xMono,
                fontSize: 12,
                color: _XT.primary,
                fontWeight: 500,
              }}
            >
              なし
            </div>
          </div>
        </div>

        {/* Plans — v2: 買切（Lifetime）を最上段に。JP/シニア/盆栽園プロ向け */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <PlanCard
            k="life"
            title="買切（Lifetime）"
            price="¥9,800"
            sub="一度払えば、ずっと。サブスクではありません"
            badge="おすすめ"
            recommended
          />
          <PlanCard k="year" title="年額" price="¥3,980" sub="月換算 ¥331 · 月額より 33% お得" />
          <PlanCard k="month" title="月額" price="¥500" sub="気軽に始める · いつでも解約" />
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: _XT.muted,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          サブスクは自動更新 ・ 設定からいつでも解約 ・ 買切は一度のお支払い
        </div>

        {/* links */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            marginTop: 24,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onRestore}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              color: _XT.primary,
              fontFamily: _xSansJa,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            購入を復元
          </button>
          <button
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              color: _XT.sub,
              fontFamily: _xSansJa,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            利用規約
          </button>
          <button
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              color: _XT.sub,
              fontFamily: _xSansJa,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            プライバシー
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: '0 4px',
            fontFamily: _xSansJa,
            fontSize: 11,
            lineHeight: '18px',
            color: _XT.muted,
          }}
        >
          サブスクは次回更新日の24時間前までに解約しない場合、自動更新されます。解約は端末の設定{' '}
          {'>'} Apple ID {'>'} サブスクリプションから可能です。買切は
          Non-Consumable（一度購入で永続有効）。
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px 34px',
          background: _XT.bg,
          borderTop: `1px solid ${_XT.border}`,
        }}
      >
        <button
          onClick={onPurchase}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 12,
            background: _XT.primary,
            color: '#F7F3E8',
            border: 'none',
            fontFamily: _xSansJa,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          購読する
        </button>
      </div>
    </div>
  );
}

// ═════════ Screen 2: Settings ═════════
function SettingsScreen({ onOpenPaywall, onOpenArchive, onOpenBackup }) {
  const Row = ({ label, value, onTap, right, first }) => (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        minHeight: 56,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: _XT.surface,
        border: 'none',
        borderTop: first ? `1px solid ${_XT.border}` : 'none',
        borderBottom: `1px solid ${_XT.border}`,
        cursor: onTap ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, fontFamily: _xSansJa, fontSize: 15, color: _XT.text }}>{label}</div>
      {value && <div style={{ fontFamily: _xSansJa, fontSize: 14, color: _XT.sub }}>{value}</div>}
      {right !== undefined
        ? right
        : onTap && (
            <svg width="8" height="14" viewBox="0 0 8 14" style={{ marginLeft: 4 }}>
              <path
                d="M1 1l6 6-6 6"
                stroke={_XT.muted}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
    </button>
  );
  const SectionHeader = ({ children }) => (
    <div
      style={{
        padding: '20px 16px 8px',
        fontFamily: _xMono,
        fontSize: 10,
        color: _XT.muted,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
  const Switch = ({ on = true }) => (
    <div
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        background: on ? _XT.primary : _XT.borderStrong,
        position: 'relative',
        flexShrink: 0,
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
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.15s',
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _XT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_XSB />
      <div style={{ padding: '8px 16px 12px' }}>
        <div
          style={{
            fontFamily: _xSerifJa,
            fontSize: 22,
            fontWeight: 500,
            color: _XT.text,
            letterSpacing: '0.04em',
          }}
        >
          設定
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 56 + 34 + 20 }}>
        <SectionHeader>アカウント・プラン</SectionHeader>
        <Row
          first
          label="プラン"
          value="Free"
          onTap={onOpenPaywall}
          right={
            <span
              style={{
                padding: '4px 10px',
                background: _XT.primary,
                color: '#F7F3E8',
                borderRadius: 14,
                fontFamily: _xMono,
                fontSize: 11,
                letterSpacing: '0.08em',
                marginLeft: 8,
              }}
            >
              Upgrade
            </span>
          }
        />
        <Row label="購入を復元" onTap={() => {}} />

        <SectionHeader>表示</SectionHeader>
        <Row first label="言語" value="日本語" onTap={() => {}} />
        <Row label="テーマ" value="システム設定に従う" onTap={() => {}} />

        <SectionHeader>通知</SectionHeader>
        <Row first label="通知" right={<Switch on={false} />} />
        <Row label="通知の時間帯" value="8:00 – 20:00" onTap={() => {}} />

        <SectionHeader>アーカイブ</SectionHeader>
        <Row first label="アーカイブ済み盆栽" value="3件" onTap={onOpenArchive} />

        <SectionHeader>書き出し</SectionHeader>
        <Row
          first
          label="CSV エクスポート"
          right={
            <span
              style={{
                fontFamily: _xMono,
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(198,158,72,0.18)',
                color: _XT.text,
                letterSpacing: '0.08em',
              }}
            >
              PRO
            </span>
          }
          onTap={onOpenPaywall}
        />
        <Row
          label="PDF エクスポート"
          right={
            <span
              style={{
                fontFamily: _xMono,
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(198,158,72,0.18)',
                color: _XT.text,
                letterSpacing: '0.08em',
              }}
            >
              PRO
            </span>
          }
          onTap={onOpenPaywall}
        />

        <SectionHeader>バックアップ</SectionHeader>
        <Row first label="バックアップ（ZIP 書き出し / 取り込み）" onTap={onOpenBackup} />

        <SectionHeader>その他</SectionHeader>
        <Row first label="利用規約" onTap={() => {}} />
        <Row label="プライバシーポリシー" onTap={() => {}} />
      </div>

      <_XTB active="set" />
    </div>
  );
}

// ═════════ Screen 3: Backup ═════════
// ZIP エクスポート / インポート の独立画面。両方 Free（バックアップは権利・GDPR Art.20 整合）。
function BackupScreen({ onBack }) {
  const ActionCard = ({ kicker, title, body, cta, onTap }) => (
    <div
      style={{
        background: _XT.surface,
        border: `1px solid ${_XT.border}`,
        borderRadius: 14,
        padding: '20px 18px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: _xMono,
          fontSize: 10,
          color: _XT.muted,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: _xSerifJa,
          fontSize: 18,
          fontWeight: 500,
          color: _XT.text,
          letterSpacing: '0.02em',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: _xSansJa,
          fontSize: 13,
          lineHeight: '21px',
          color: _XT.sub,
          marginBottom: 16,
        }}
      >
        {body}
      </div>
      <button
        onClick={onTap}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 10,
          background: _XT.surface,
          color: _XT.text,
          border: `1px solid ${_XT.borderStrong}`,
          fontFamily: _xSansJa,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: '0.02em',
          cursor: 'pointer',
        }}
      >
        {cta}
      </button>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _XT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_XSB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid ${_XT.border}`,
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
          <_XI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _xSerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _XT.text,
            letterSpacing: '0.02em',
          }}
        >
          バックアップ
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>
        <div
          style={{
            fontFamily: _xSansJa,
            fontSize: 13,
            lineHeight: '21px',
            color: _XT.sub,
            marginBottom: 20,
          }}
        >
          写真・記録・メモを含む全データを ZIP
          にまとめて書き出し、別端末への移行や手元保管に使えます。
        </div>

        <ActionCard
          kicker="EXPORT"
          title="全データを書き出す"
          body="現在の盆栽・写真・作業記録・メモをすべて ZIP ファイルにまとめます。書き出したファイルは別端末への移行や、定期的な保管にお使いいただけます。"
          cta="ZIP を書き出す"
          onTap={() => {}}
        />

        <ActionCard
          kicker="IMPORT"
          title="データを取り込む"
          body="以前書き出した ZIP から、盆栽データを復元します。新しい端末でアプリを使い始めるときや、データを別端末から引き継ぐときにお使いください。"
          cta="ZIP を取り込む"
          onTap={() => {}}
        />

        <div
          style={{
            marginTop: 8,
            padding: '16px',
            borderRadius: 10,
            background: _XT.surface,
            border: `1px solid ${_XT.border}`,
          }}
        >
          <div
            style={{
              fontFamily: _xMono,
              fontSize: 10,
              color: _XT.muted,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            NOTE
          </div>
          <div style={{ fontFamily: _xSansJa, fontSize: 12, lineHeight: '19px', color: _XT.muted }}>
            バックアップ機能は Free
            でもすべてご利用いただけます。あなたの記録は、いつでも手元に取り戻せます。
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════ Screen 4: Archive List ═════════
// 長押し → 完全削除確認モーダル（D8 v1.5）。誤操作防止のため確認ダイアログで二重ガード。
function ArchiveCard({ item, onLongPress }) {
  const timerRef = React.useRef(null);
  const start = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onLongPress && onLongPress(), 550);
  };
  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  return (
    <div
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress && onLongPress();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: _XT.surface,
        border: `1px solid ${_XT.border}`,
        borderRadius: 12,
        marginBottom: 8,
        minHeight: 96,
        opacity: 0.85,
        cursor: 'pointer',
      }}
    >
      <div style={{ filter: 'grayscale(0.5)' }}>
        <_XBP w={64} h={64} radius={8} seed={item.idx} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: _xSansJa,
            fontSize: 16,
            fontWeight: 500,
            color: _XT.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontFamily: _xMono,
            fontSize: 11,
            color: _XT.muted,
            marginTop: 4,
            letterSpacing: '0.06em',
          }}
        >
          Archived · {item.date}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          cancel();
        }}
        style={{
          height: 40,
          padding: '0 14px',
          borderRadius: 10,
          background: 'transparent',
          color: _XT.primary,
          border: `1px solid ${_XT.primary}`,
          fontFamily: _xSansJa,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        復元
      </button>
    </div>
  );
}

function DeleteConfirmModal({ name, onCancel, onConfirm }) {
  return (
    <React.Fragment>
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,26,26,0.55)',
          zIndex: 80,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 81,
          width: 320,
          background: _XT.bg,
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
            background: 'rgba(139,46,46,0.08)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path
              d="M5 8h16M9 8v-2a2 2 0 012-2h4a2 2 0 012 2v2M7 8v13a2 2 0 002 2h8a2 2 0 002-2V8"
              stroke="#8B2E2E"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M11 12v7M15 12v7" stroke="#8B2E2E" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div
          style={{
            fontFamily: _xSerifJa,
            fontSize: 18,
            fontWeight: 500,
            color: _XT.text,
            textAlign: 'center',
            letterSpacing: '0.02em',
            marginBottom: 8,
          }}
        >
          「{name}」を完全削除します
        </div>
        <div
          style={{
            fontFamily: _xSansJa,
            fontSize: 13,
            lineHeight: '21px',
            color: _XT.sub,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          削除すると履歴も写真もすべて失われ、<b style={{ color: '#8B2E2E' }}>復元できません</b>。
        </div>
        <button
          onClick={onConfirm}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            background: '#8B2E2E',
            color: '#F7F3E8',
            border: 'none',
            cursor: 'pointer',
            fontFamily: _xSansJa,
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '0.04em',
            marginBottom: 8,
          }}
        >
          完全削除
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            background: 'transparent',
            color: _XT.sub,
            border: 'none',
            cursor: 'pointer',
            fontFamily: _xSansJa,
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          キャンセル
        </button>
      </div>
    </React.Fragment>
  );
}

function ArchiveListScreen({ onBack, initialDeleteFor = null }) {
  const items = [
    { name: '枯死した真柏', date: '2025/12/10', idx: 1 },
    { name: '譲った黒松', date: '2025/09/15', idx: 0 },
    { name: '改作用ケヤキ', date: '2025/05/20', idx: 2 },
  ];
  const [deleteFor, setDeleteFor] = React.useState(
    typeof initialDeleteFor === 'number' ? initialDeleteFor : null,
  );
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: _XT.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <_XSB />
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          borderBottom: `1px solid ${_XT.border}`,
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
          <_XI.Back />
        </button>
        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            textAlign: 'center',
            fontFamily: _xSerifJa,
            fontSize: 20,
            fontWeight: 500,
            color: _XT.text,
            letterSpacing: '0.02em',
          }}
        >
          アーカイブ済み · 3
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px' }}>
        <div
          style={{
            fontFamily: _xSansJa,
            fontSize: 13,
            color: _XT.sub,
            marginBottom: 12,
            lineHeight: '20px',
          }}
        >
          アーカイブは非表示になるだけで、データは残ります。いつでも復元できます。
        </div>
        {items.map((it, i) => (
          <ArchiveCard key={i} item={it} onLongPress={() => setDeleteFor(i)} />
        ))}
        <div
          style={{
            marginTop: 24,
            padding: '16px',
            borderRadius: 10,
            background: _XT.surface,
            border: `1px solid ${_XT.border}`,
            fontFamily: _xSansJa,
            fontSize: 11,
            lineHeight: '18px',
            color: _XT.muted,
          }}
        >
          <div
            style={{
              fontFamily: _xMono,
              fontSize: 10,
              color: _XT.muted,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            完全削除について
          </div>
          項目を<b>長押し</b>すると完全削除の確認画面が表示されます。削除後は復元できません。
        </div>
      </div>

      {deleteFor !== null && items[deleteFor] && (
        <DeleteConfirmModal
          name={items[deleteFor].name}
          onCancel={() => setDeleteFor(null)}
          onConfirm={() => setDeleteFor(null)}
        />
      )}
    </div>
  );
}

// ═════════ Screen 4: Home with Ad Banner ═════════
function HomeWithAdScreen({ onDismissAd }) {
  const { HomeScreen } = window;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <HomeScreen onOpenBonsai={() => {}} onOpenCreate={() => {}} />
      {/* Lift tab bar up by 60pt */}
      {/* Banner sits just above tab bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 56 + 34, // tab bar height + safe area
          height: 60,
          background: '#F0EEE8',
          borderTop: `1px solid ${_XT.border}`,
          borderBottom: `1px solid ${_XT.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          zIndex: 50,
        }}
      >
        {/* Ad label */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 10,
            fontFamily: _xMono,
            fontSize: 10,
            color: _XT.muted,
            letterSpacing: '0.14em',
            padding: '1px 5px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 3,
          }}
        >
          広告 · Ad
        </div>

        {/* Ad content placeholder */}
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingLeft: 60,
            paddingRight: 56, // left gap for label, right for close
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: '#D9D4C5',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              fontFamily: _xMono,
              fontSize: 9,
              color: _XT.muted,
              letterSpacing: '0.1em',
            }}
          >
            IMG
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: _xSansJa,
                fontSize: 13,
                fontWeight: 500,
                color: '#4A4A4A',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Advertisement placeholder
            </div>
            <div
              style={{
                fontFamily: _xMono,
                fontSize: 10,
                color: _XT.muted,
                marginTop: 1,
                letterSpacing: '0.06em',
              }}
            >
              Sponsored · example.com
            </div>
          </div>
        </div>

        {/* Close — 48×48 tap target, 16pt icon */}
        <button
          onClick={onDismissAd}
          aria-label="広告を閉じる"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 48,
            height: 48,
            background: 'none',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke={_XT.muted}
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  PaywallScreen,
  SettingsScreen,
  BackupScreen,
  ArchiveListScreen,
  HomeWithAdScreen,
});
