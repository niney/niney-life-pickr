// ============================================
// TEXT CONSTANTS (공통 문구)
// ============================================

// Form field labels and placeholders
export const formFields = {
  email: {
    name: 'email',
    type: 'email',
    label: '이메일 주소',
    placeholder: '이메일 주소',
    autoComplete: 'email',
  },
  username: {
    name: 'username',
    type: 'text',
    label: '사용자 이름',
    placeholder: '사용자 이름',
    autoComplete: 'username',
  },
  password: {
    name: 'password',
    type: 'password',
    label: '비밀번호',
    placeholder: '비밀번호',
    autoComplete: 'current-password',
  },
  newPassword: {
    name: 'password',
    type: 'password',
    label: '비밀번호',
    placeholder: '비밀번호 (최소 6자)',
    autoComplete: 'new-password',
  },
  confirmPassword: {
    name: 'confirmPassword',
    type: 'password',
    label: '비밀번호 확인',
    placeholder: '비밀번호 확인',
    autoComplete: 'new-password',
  },
}

// Authentication text
export const authText = {
  login: {
    title: 'Niney Life Pickr',
    subtitle: '인생의 선택을 도와드립니다',
    noAccount: '계정이 없으신가요?',
    registerLink: '회원가입',
    submitButton: '로그인',
    loadingButton: '로그인 중...',
  },
  register: {
    title: '회원가입',
    subtitle: '새로운 계정을 만들어보세요',
    hasAccount: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    submitButton: '가입하기',
    loadingButton: '가입 중...',
    successMessage: (username: string) => `환영합니다 ${username}님! 이제 로그인하실 수 있습니다.`,
  },
  error: {
    loginFailed: '로그인에 실패했습니다',
    registerFailed: '회원가입에 실패했습니다',
    generic: '오류가 발생했습니다',
  },
}