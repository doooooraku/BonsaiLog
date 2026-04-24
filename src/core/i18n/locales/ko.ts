import type { TranslationKey } from './en';

const ko: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: '확인',
  cancel: '취소',
  save: '저장',
  delete: '삭제',
  create: '만들기',
  close: '닫기',
  done: '완료',
  loading: '로딩 중...',
  retry: '재시도',
  error: '오류',

  // --- Settings ---
  settings: '설정',
  language: '언어',
  theme: '테마',
  version: '앱 버전',
  haptics: '진동',
  sound: '사운드',

  // --- Language selector ---
  languageChange: '언어 변경',
  currentLanguage: '현재',
  languageNameEn: '영어',
  languageNameJa: '일본어',
  languageNameFr: '프랑스어',
  languageNameEs: '스페인어',
  languageNameDe: '독일어',
  languageNameIt: '이탈리아어',
  languageNamePt: '포르투갈어',
  languageNameRu: '러시아어',
  languageNameZhHans: '중국어 (간체)',
  languageNameZhHant: '중국어 (번체)',
  languageNameKo: '한국어',
  languageNameHi: '힌디어',
  languageNameId: '인도네시아어',
  languageNameTh: '태국어',
  languageNameVi: '베트남어',
  languageNameTr: '튀르키예어',
  languageNameNl: '네덜란드어',
  languageNamePl: '폴란드어',
  languageNameSv: '스웨덴어',

  // --- Purchase / Restore ---
  restore: '구매 복원',
  purchaseSuccess: 'Pro 플랜이 활성화되었습니다.',
  purchaseFailed: '결제에 실패했습니다. 나중에 다시 시도해 주세요.',
  restoreSuccess: '구매 기록이 복원되었습니다.',
  restoreNotFound: '복원할 구매 기록이 없습니다.',
  restoreFailed: '구매 복원에 실패했습니다.',
  restoreDesc: '이 계정으로 구매한 항목을 복원합니다.',

  // --- Pro / Paywall ---
  proTitle: 'Pro로 업그레이드',
  proPlanFreeTitle: '무료',
  proPlanMonthlyTitle: '월간',
  proPlanYearlyTitle: '연간',
  proPlanYearlyBadge: '최고의 선택',
  proBadgeShort: 'PRO',
  priceFree: '₩0 / 평생',
  priceLoading: '로딩 중...',
  priceUnavailable: '이용 불가',
  proCtaYearly: '연간 플랜 시작',
  proCtaMonthly: '월간 플랜 시작',
  proCtaStayFree: '무료로 계속 사용',
  proFinePrint: '구독은 자동으로 갱신됩니다. 계정 설정에서 언제든지 해지할 수 있습니다.',

  proPlanLifetimeTitle: '평생',
  proPlanLifetimeBadge: '일회성 결제',
  proCtaLifetime: '평생 구매',
  proLifetimeFinePrint: '일회성 구매입니다. 자동 갱신이 없습니다.',

  // --- Legal ---
  legalSectionTitle: '법적 정보',
  legalPrivacyPolicyLabel: '개인정보 처리방침',
  legalTermsOfUseLabel: '이용약관 (EULA)',

  // --- Errors ---
  errorLoadFailed: '데이터를 불러오지 못했습니다.',
  errorSaveFailed: '저장에 실패했습니다.',
  errorDeleteFailed: '삭제에 실패했습니다.',
};

export default ko;
