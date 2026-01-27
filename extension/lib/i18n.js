/**
 * i18n (Internationalization) Utility
 * 다국어 지원을 위한 유틸리티
 */

class I18n {
  constructor() {
    this.currentLang = 'en'; // 기본 언어
    this.messages = {};
    this.supportedLangs = ['ko', 'en'];
  }

  /**
   * 초기화 및 언어 파일 로드
   */
  async init() {
    // 브라우저 언어 감지
    const browserLang = this.detectLanguage();
    this.currentLang = this.supportedLangs.includes(browserLang) ? browserLang : 'en';

    // 언어 파일 로드
    await this.loadLanguage(this.currentLang);
  }

  /**
   * 브라우저 언어 감지
   */
  detectLanguage() {
    // Chrome Extension API 사용 (우선순위)
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      const uiLang = chrome.i18n.getUILanguage();
      return this.normalizeLanguage(uiLang);
    }

    // Navigator API 사용 (폴백)
    if (navigator.language) {
      return this.normalizeLanguage(navigator.language);
    }

    return 'en'; // 기본값
  }

  /**
   * 언어 코드 정규화 (예: 'ko-KR' -> 'ko', 'en-US' -> 'en')
   */
  normalizeLanguage(lang) {
    if (!lang) return 'en';
    const normalized = lang.toLowerCase().split('-')[0];
    return normalized;
  }

  /**
   * 언어 파일 로드
   */
  async loadLanguage(lang) {
    try {
      const response = await fetch(chrome.runtime.getURL(`lang/${lang}.json`));
      if (!response.ok) {
        throw new Error(`Failed to load language file: ${lang}.json`);
      }
      this.messages = await response.json();
    } catch (error) {
      console.error('Error loading language file:', error);
      // 폴백: 영어 로드
      if (lang !== 'en') {
        await this.loadLanguage('en');
      }
    }
  }

  /**
   * 메시지 가져오기
   * @param {string} key - 메시지 키 (예: 'popup.howToUse')
   * @param {object} params - 플레이스홀더 치환을 위한 파라미터
   * @returns {string} 번역된 메시지
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let message = this.messages;

    // 중첩된 객체에서 값 찾기
    for (const k of keys) {
      if (message && typeof message === 'object') {
        message = message[k];
      } else {
        return key; // 키를 찾지 못하면 키 자체를 반환
      }
    }

    if (typeof message !== 'string') {
      return key;
    }

    // 플레이스홀더 치환
    return this.replacePlaceholders(message, params);
  }

  /**
   * 플레이스홀더 치환
   * @param {string} message - 원본 메시지
   * @param {object} params - 치환할 값들
   * @returns {string} 치환된 메시지
   */
  replacePlaceholders(message, params) {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params.hasOwnProperty(key) ? params[key] : match;
    });
  }

  /**
   * 현재 언어 가져오기
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * 언어 변경
   */
  async setLanguage(lang) {
    if (!this.supportedLangs.includes(lang)) {
      return;
    }

    this.currentLang = lang;
    await this.loadLanguage(lang);

    // 언어 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  /**
   * 지원 언어 목록 가져오기
   */
  getSupportedLanguages() {
    return this.supportedLangs;
  }

  /**
   * HTML 엘리먼트에 번역 적용
   * data-i18n 속성을 가진 엘리먼트를 자동으로 번역
   */
  translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const params = element.getAttribute('data-i18n-params');

      let translatedText = this.t(key);

      if (params) {
        try {
          const parsedParams = JSON.parse(params);
          translatedText = this.t(key, parsedParams);
        } catch (e) {
          console.error('Error parsing i18n params:', e);
        }
      }

      // textContent 또는 innerHTML 업데이트
      if (element.hasAttribute('data-i18n-html')) {
        element.innerHTML = translatedText;
      } else {
        element.textContent = translatedText;
      }
    });

    // placeholder 속성 번역
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });

    // title 속성 번역
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
  }
}

// 전역 인스턴스 생성
const i18n = new I18n();

// 자동 초기화 (HTML 페이지에서 사용 시)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    await i18n.init();
    i18n.translatePage();
  });
}
