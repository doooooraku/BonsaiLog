// BonsaiLog onboarding — 6 screens
// All sizes follow tokens.css. Device safe-area: iPhone 15 Pro (393 × 852, SA top 59 / bottom 34)
// Inner viewport = 393 × 852. Content clears top 59 and bottom 34.

const T = {
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
};

const sansJa = 'var(--font-body-ja)';
const serifJa = 'var(--font-display-ja)';
const mono = 'var(--font-mono)';

// ───────── Shared primitives ─────────
function PrimaryButton({ children, onClick, style = {} }) {
  const [down, setDown] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        width: '100%',
        height: 56,
        borderRadius: 12,
        background: down ? T.primaryHover : T.primary,
        color: '#F7F3E8',
        fontFamily: sansJa,
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: '0.04em',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 100ms ease-out, opacity 100ms ease-out',
        opacity: down ? 0.92 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 12,
        background: 'transparent',
        color: T.sub,
        fontFamily: sansJa,
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: '0.02em',
        border: `1px solid ${T.border}`,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function TextLink({ children, onClick, muted = false, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: '12px 16px',
        color: muted ? T.muted : T.sub,
        fontFamily: sansJa,
        fontSize: 14,
        fontWeight: 400,
        textDecorationLine: 'underline',
        textUnderlineOffset: 3,
        textDecorationColor: T.border,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="戻る"
      style={{
        position: 'absolute',
        top: 67,
        left: 8,
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'transparent',
        border: 'none',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        zIndex: 5,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M12.5 4L6.5 10l6 6"
          stroke={T.text}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// Line-icon primitives (stroke only, no emoji)
const Icon = {
  Leaf: ({ size = 32, color = T.primary }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M26 6C26 6 12 6 8 14C4 22 10 26 10 26C10 26 14 20 20 16C14 22 10 26 10 26"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 6C26 14 22 20 16 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Lock: ({ size = 32, color = T.primary }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="7" y="14" width="18" height="13" rx="2" stroke={color} strokeWidth="1.5" />
      <path
        d="M11 14V10C11 7.23858 13.2386 5 16 5C18.7614 5 21 7.23858 21 10V14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="20" r="1.5" fill={color} />
    </svg>
  ),
  Book: ({ size = 32, color = T.primary }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M6 6h9a3 3 0 013 3v18a2 2 0 00-2-2H6V6z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M26 6h-9a3 3 0 00-3 3v18a2 2 0 012-2h10V6z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Shield: ({ size = 80, color = T.primary }) => (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path
        d="M40 8L14 18V38C14 54 26 66 40 72C54 66 66 54 66 38V18L40 8Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M28 40L36 48L52 32"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Bell: ({ size = 88, color = T.primary }) => (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <path
        d="M44 16C32 16 24 24 24 36V48L18 56V60H70V56L64 48V36C64 24 56 16 44 16Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M38 66C38 69.3137 40.6863 72 44 72C47.3137 72 50 69.3137 50 66"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="12" r="2" fill={color} />
    </svg>
  ),
  RadioOn: ({ size = 24, color = T.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" fill={color} />
    </svg>
  ),
  RadioOff: ({ size = 24, color = T.borderStrong }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.5" stroke={color} strokeWidth="1.25" />
    </svg>
  ),
  Chevron: ({ color = T.muted }) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M4 2l4 4-4 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

// Safe-area frame: content sits inside 393x852 with SA top 59 / bottom 34
function Screen({ children, bg = T.bg }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: bg,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}

// Screen 1 — Splash
function SplashScreen() {
  return (
    <Screen>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            fontFamily: serifJa,
            fontWeight: 500,
            fontSize: 48,
            lineHeight: '58px',
            color: T.primary,
            letterSpacing: '0.02em',
          }}
        >
          BonsaiLog
        </div>
        <div
          style={{
            fontFamily: serifJa,
            fontWeight: 400,
            fontSize: 18,
            lineHeight: '27px',
            color: T.sub,
            letterSpacing: '0.12em',
          }}
        >
          盆栽手帳
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 54,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: mono,
          fontSize: 11,
          lineHeight: '16px',
          color: T.muted,
          letterSpacing: '0.08em',
        }}
      >
        loading...
      </div>
    </Screen>
  );
}

// Screen 2 — Welcome
function WelcomeScreen({ onStart }) {
  const values = [
    { icon: <Icon.Leaf />, text: '19言語、完全オフライン' },
    { icon: <Icon.Lock />, text: '個人情報は取得しません' },
    { icon: <Icon.Book />, text: '次世代へ引き継げる台帳' },
  ];
  return (
    <Screen>
      <div style={{ height: 59 }} />
      <div
        style={{
          padding: '48px 32px 0',
          fontFamily: serifJa,
          fontWeight: 500,
          fontSize: 32,
          lineHeight: '46px',
          color: T.text,
          letterSpacing: '0.02em',
          textWrap: 'pretty',
        }}
      >
        鉢1本ずつ、
        <br />
        一生分。
      </div>

      <div
        style={{
          flex: 1,
          padding: '40px 32px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {values.map((v, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '12px 0',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.surface,
              }}
            >
              {v.icon}
            </div>
            <div
              style={{
                fontFamily: sansJa,
                fontSize: 17,
                lineHeight: '26px',
                color: T.text,
                fontWeight: 400,
              }}
            >
              {v.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <PrimaryButton onClick={onStart}>はじめる</PrimaryButton>
        <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 34 + 8 }}>
          <span
            style={{
              fontFamily: sansJa,
              fontSize: 13,
              lineHeight: '19px',
              color: T.muted,
            }}
          >
            アカウント登録は不要です
          </span>
        </div>
      </div>
    </Screen>
  );
}

// Screen 3 — Language Picker
const LANGS = [
  { code: 'ja', native: '日本語', latin: 'Japanese', rec: true },
  { code: 'en', native: 'English', latin: 'English' },
  { code: 'zh-CN', native: '中文（简体）', latin: 'Chinese Simplified' },
  { code: 'zh-TW', native: '繁體中文', latin: 'Chinese Traditional' },
  { code: 'ko', native: '한국어', latin: 'Korean' },
  { code: 'es', native: 'Español', latin: 'Spanish' },
  { code: 'pt', native: 'Português', latin: 'Portuguese' },
  { code: 'fr', native: 'Français', latin: 'French' },
  { code: 'de', native: 'Deutsch', latin: 'German' },
  { code: 'it', native: 'Italiano', latin: 'Italian' },
  { code: 'nl', native: 'Nederlands', latin: 'Dutch' },
  { code: 'ru', native: 'Русский', latin: 'Russian' },
  { code: 'ar', native: 'العربية', latin: 'Arabic' },
  { code: 'hi', native: 'हिन्दी', latin: 'Hindi' },
  { code: 'id', native: 'Bahasa Indonesia', latin: 'Indonesian' },
  { code: 'th', native: 'ไทย', latin: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt', latin: 'Vietnamese' },
  { code: 'tr', native: 'Türkçe', latin: 'Turkish' },
  { code: 'pl', native: 'Polski', latin: 'Polish' },
];

function LanguagePickerScreen({ onBack, onNext }) {
  const [sel, setSel] = React.useState('ja');
  return (
    <Screen>
      <BackButton onClick={onBack} />

      <div style={{ height: 59 }} />
      <div
        style={{
          padding: '20px 32px 16px 72px',
          fontFamily: serifJa,
          fontWeight: 500,
          fontSize: 24,
          lineHeight: '32px',
          color: T.text,
          letterSpacing: '0.02em',
        }}
      >
        言語を選択
        <div
          style={{
            fontFamily: 'var(--font-display-latin)',
            fontStyle: 'italic',
            fontSize: 16,
            lineHeight: '24px',
            color: T.sub,
            marginTop: 2,
            letterSpacing: '0.02em',
            fontWeight: 400,
          }}
        >
          Select language
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          borderTop: `1px solid ${T.border}`,
        }}
      >
        {LANGS.map((l, i) => (
          <div
            key={l.code}
            onClick={() => setSel(l.code)}
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 56,
              padding: '0 24px 0 32px',
              cursor: 'pointer',
              borderBottom: i === LANGS.length - 1 ? 'none' : `1px solid ${T.border}`,
              background: sel === l.code ? 'rgba(31,58,46,0.04)' : 'transparent',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: sansJa,
                  fontSize: 17,
                  lineHeight: '24px',
                  color: T.text,
                  fontWeight: sel === l.code ? 500 : 400,
                }}
              >
                {l.native}
                {l.rec && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: 12,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: T.primary,
                      color: '#F7F3E8',
                      fontFamily: sansJa,
                      fontSize: 11,
                      lineHeight: '16px',
                      letterSpacing: '0.08em',
                      verticalAlign: '2px',
                    }}
                  >
                    端末の言語
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body-latin)',
                  fontSize: 12,
                  lineHeight: '18px',
                  color: T.muted,
                  marginTop: 2,
                  letterSpacing: '0.02em',
                }}
              >
                {l.latin}
              </div>
            </div>
            {sel === l.code ? <Icon.RadioOn /> : <Icon.RadioOff />}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px 16px',
          paddingBottom: 34 + 12,
          borderTop: `1px solid ${T.border}`,
          background: T.bg,
        }}
      >
        <PrimaryButton onClick={onNext}>選択して続ける</PrimaryButton>
      </div>
    </Screen>
  );
}

// Screen 4 — ATT Explain
function ATTScreen({ onBack, onNext, onLater }) {
  return (
    <Screen>
      <BackButton onClick={onBack} />
      <div style={{ height: 59 }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '32px 0 16px',
        }}
      >
        <Icon.Shield />
      </div>

      <div
        style={{
          padding: '8px 32px 0',
          fontFamily: serifJa,
          fontWeight: 500,
          fontSize: 24,
          lineHeight: '32px',
          color: T.text,
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}
      >
        追跡について
      </div>

      <div
        style={{
          flex: 1,
          padding: '24px 32px 0',
          fontFamily: sansJa,
          fontSize: 17,
          lineHeight: '27px',
          color: T.text,
          fontWeight: 400,
          letterSpacing: '0.02em',
        }}
      >
        <p style={{ margin: '0 0 16px' }}>次の画面で「追跡を許可しますか？」と聞かれます。</p>
        <p style={{ margin: '0 0 16px' }}>
          これは広告を表示するための端末IDを使うかどうかの質問です。
        </p>
        <p style={{ margin: '0 0 16px' }}>
          <span style={{ color: T.primary, fontWeight: 500 }}>
            許可しなくてもBonsaiLogの全機能は使えます。
          </span>
        </p>
        <p
          style={{
            margin: 0,
            color: T.sub,
            fontSize: 15,
            lineHeight: '24px',
          }}
        >
          許可すると、あなたに合った広告が表示されます。 Pro版では広告は一切表示されません。
        </p>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <PrimaryButton onClick={onNext}>次へ（システムダイアログへ）</PrimaryButton>
        <div style={{ height: 12 }} />
        <OutlineButton onClick={onLater}>後で決める</OutlineButton>
        <div style={{ height: 34 + 12 }} />
      </div>
    </Screen>
  );
}

// Screen 5 — UMP Consent
function UMPScreen({ onBack, onAgree, onNonPersonalized, onManage }) {
  const [open, setOpen] = React.useState(false);
  const partners = [
    'Google AdMob',
    'Meta Audience Network',
    'AppLovin',
    'Unity Ads',
    'Pangle',
    'InMobi',
  ];
  return (
    <Screen>
      <BackButton onClick={onBack} />
      <div style={{ height: 59 }} />

      <div
        style={{
          padding: '20px 32px 12px 72px',
          fontFamily: serifJa,
          fontWeight: 500,
          fontSize: 24,
          lineHeight: '32px',
          color: T.text,
          letterSpacing: '0.02em',
        }}
      >
        データ使用の同意
      </div>
      <div
        style={{
          padding: '0 32px 0 72px',
          fontFamily: mono,
          fontSize: 11,
          lineHeight: '16px',
          color: T.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        EU / UK / CH Region
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 32px 0',
        }}
      >
        <p
          style={{
            margin: '0 0 16px',
            fontFamily: sansJa,
            fontSize: 16,
            lineHeight: '26px',
            color: T.text,
          }}
        >
          BonsaiLog
          Free版は広告を表示します。広告表示のため、以下のパートナーがデータを使用することに同意しますか？
        </p>

        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            borderBottom: `1px solid ${T.border}`,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              width: '100%',
              minHeight: 48,
              padding: '12px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: sansJa,
              fontSize: 15,
              fontWeight: 500,
              color: T.sub,
              letterSpacing: '0.02em',
            }}
          >
            <span>パートナー一覧を見る（{partners.length}社）</span>
            <span
              style={{
                display: 'inline-flex',
                transform: open ? 'rotate(90deg)' : 'none',
                transition: 'transform 150ms ease-out',
              }}
            >
              <Icon.Chevron />
            </span>
          </button>
          {open && (
            <div style={{ padding: '0 0 16px' }}>
              {partners.map((p) => (
                <div
                  key={p}
                  style={{
                    fontFamily: mono,
                    fontSize: 13,
                    lineHeight: '22px',
                    color: T.sub,
                    padding: '2px 0',
                  }}
                >
                  — {p}
                </div>
              ))}
            </div>
          )}
        </div>

        <p
          style={{
            margin: '16px 0 0',
            fontFamily: sansJa,
            fontSize: 13,
            lineHeight: '20px',
            color: T.muted,
          }}
        >
          この設定はいつでも「設定 &gt; プライバシー」から変更できます。
        </p>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <PrimaryButton onClick={onAgree}>同意する</PrimaryButton>
        <div style={{ height: 12 }} />
        <OutlineButton onClick={onNonPersonalized}>
          パーソナライズされていない広告を受ける
        </OutlineButton>
        <div style={{ textAlign: 'center' }}>
          <TextLink onClick={onManage}>管理する</TextLink>
        </div>
        <div style={{ height: 34 }} />
      </div>
    </Screen>
  );
}

// Screen 6 — Notification Permission
function NotificationScreen({ onBack, onEnable, onLater }) {
  return (
    <Screen>
      <BackButton onClick={onBack} />
      <div style={{ height: 59 }} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '32px 32px 0',
        }}
      >
        <Icon.Bell />

        <div
          style={{
            marginTop: 32,
            fontFamily: serifJa,
            fontWeight: 500,
            fontSize: 28,
            lineHeight: '40px',
            color: T.text,
            letterSpacing: '0.02em',
            textAlign: 'center',
          }}
        >
          あなたが決めた
          <br />
          予定だけお知らせ
        </div>

        <div
          style={{
            marginTop: 20,
            fontFamily: sansJa,
            fontSize: 16,
            lineHeight: '26px',
            color: T.sub,
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          あなたが決めた予定をお知らせします。通知はオフにもできます。いつでも設定から変更可能です。
        </div>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <PrimaryButton onClick={onEnable}>通知を有効にする</PrimaryButton>
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <TextLink onClick={onLater} muted>
            あとで
          </TextLink>
        </div>
        <div style={{ height: 34 }} />
      </div>
    </Screen>
  );
}

// Screen 7 (placeholder) — Home stub
function HomeStubScreen({ onRestart }) {
  return (
    <Screen>
      <div style={{ height: 59 }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            lineHeight: '16px',
            color: T.muted,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Next project
        </div>
        <div
          style={{
            fontFamily: serifJa,
            fontWeight: 500,
            fontSize: 28,
            lineHeight: '40px',
            color: T.text,
            marginBottom: 12,
          }}
        >
          Home
        </div>
        <div
          style={{
            fontFamily: sansJa,
            fontSize: 14,
            lineHeight: '22px',
            color: T.sub,
            maxWidth: 280,
          }}
        >
          オンボーディングはここまで。 Home画面は次のプロジェクトで作成します。
        </div>
      </div>
      <div style={{ padding: '0 16px 12px' }}>
        <OutlineButton onClick={onRestart}>オンボーディングを最初から</OutlineButton>
        <div style={{ height: 34 }} />
      </div>
    </Screen>
  );
}

Object.assign(window, {
  SplashScreen,
  WelcomeScreen,
  LanguagePickerScreen,
  ATTScreen,
  UMPScreen,
  NotificationScreen,
  HomeStubScreen,
});
