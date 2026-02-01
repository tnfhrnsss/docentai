/**
 * DocentAI 환경 설정
 * 빌드 시 자동으로 생성되는 파일입니다.
 * 직접 수정하지 마세요. extension/lib/config.template.js를 수정하세요.
 */

const DocentAIConfig = {
  // API Base URL (빌드 시 자동 주입)
  API_URL: '{{API_URL}}',

  // 빌드 모드 (dev 또는 prod)
  BUILD_MODE: '{{BUILD_MODE}}'
};

// Content Script에서 사용 가능하도록 export (ES5 호환)
if (typeof window !== 'undefined') {
  window.DocentAIConfig = DocentAIConfig;
}
