/**
 * 자막 컨텍스트 캐싱 관리
 * - 현재 영상의 이전 자막들을 메모리에 저장
 * - AI가 문맥을 이해하기 위해 앞 대사도 함께 전송
 */
class SubtitleCacheManager {
  constructor(maxCacheSize = 5) {
    this.maxCacheSize = maxCacheSize; // 최대 캐시 크기 (기본 5개)
    this.cache = []; // 메모리 캐시 (배열)
    this.currentVideoId = null; // 현재 영상 ID
    this.lastSubtitleText = null; // 중복 방지용
  }

  /**
   * 자막에서 비언어적 표현 추출 (대괄호 안의 내용)
   * @param {string} text - 자막 텍스트
   * @returns {Array<string>} - 추출된 비언어적 표현들 (예: ["박수 소리", "긴장감 넘치는 음악"])
   */
  extractNonVerbalCues(text) {
    if (!text) return [];

    const matches = text.match(/\[([^\]]+)\]/g);
    if (!matches) return [];

    // 대괄호 제거하고 내용만 반환
    return matches.map(match => match.replace(/[\[\]]/g, '').trim());
  }

  /**
   * 새로운 자막을 캐시에 추가
   * @param {string} text - 자막 텍스트
   * @param {number} timestamp - 타임스탬프 (초)
   */
  addSubtitle(text, timestamp) {
    // 빈 자막이거나 이전 자막과 동일하면 무시
    if (!text || text.trim() === '' || text === this.lastSubtitleText) {
      return;
    }

    // 비언어적 표현 추출
    const nonVerbalCues = this.extractNonVerbalCues(text);

    console.log(`📝 자막 캐시에 추가: "${text}" (${timestamp.toFixed(1)}s)`);
    if (nonVerbalCues.length > 0) {
      console.log(`🎵 비언어적 표현 감지: [${nonVerbalCues.join('], [')}]`);
    }

    // 캐시에 추가
    this.cache.push({
      text: text.trim(),
      timestamp: timestamp,
      nonVerbalCues: nonVerbalCues // 비언어적 표현 추가
    });

    // 최대 크기 초과 시 오래된 항목 제거 (FIFO)
    if (this.cache.length > this.maxCacheSize) {
      const removed = this.cache.shift();
      console.log(`🗑️ 오래된 자막 제거: "${removed.text}"`);
    }

    // 마지막 자막 저장
    this.lastSubtitleText = text;

    console.log(`📦 현재 캐시 크기: ${this.cache.length}/${this.maxCacheSize}`);
  }

  /**
   * 최근 N개의 자막 반환 (현재 자막 제외)
   * @param {number} count - 가져올 자막 개수
   * @returns {Array<{text: string, timestamp: number}>}
   */
  getRecentSubtitles(count = 3) {
    // 캐시가 비어있으면 빈 배열 반환
    if (this.cache.length === 0) {
      return [];
    }

    // 최근 count개 자막 반환 (현재 자막 제외하고 이전 자막들만)
    // 예: 캐시에 [A, B, C, D, E]가 있고 count=3이면 [C, D, E]가 아닌 [B, C, D] 반환
    const endIndex = this.cache.length - 1; // 마지막 자막 제외
    const startIndex = Math.max(0, endIndex - count);

    const recent = this.cache.slice(startIndex, endIndex);
    console.log(`📋 최근 ${count}개 자막 (총 ${recent.length}개):`, recent);

    return recent;
  }

  /**
   * API 호출용 컨텍스트 데이터 반환
   * @param {string} currentText - 현재 자막 텍스트
   * @param {number} currentTimestamp - 현재 타임스탬프
   * @param {number} contextCount - 포함할 이전 자막 개수 (기본 3개)
   * @returns {Object} { context: [...], currentSubtitle: {...} }
   */
  getContextForAPI(currentText, currentTimestamp, contextCount = 3) {
    const context = this.getRecentSubtitles(contextCount);

    // 현재 자막의 비언어적 표현 추출
    const currentNonVerbalCues = this.extractNonVerbalCues(currentText);

    return {
      // 이전 자막들 (문맥)
      context: context,

      // 현재 설명을 요청하는 자막
      currentSubtitle: {
        text: currentText,
        timestamp: currentTimestamp,
        nonVerbalCues: currentNonVerbalCues // 비언어적 표현 추가
      }
    };
  }

  /**
   * 캐시 초기화 (영상 변경 시 호출)
   * @param {string} videoId - 새로운 영상 ID
   */
  clear(videoId = null) {
    console.log(`🧹 자막 캐시 초기화 (이전: ${this.currentVideoId}, 새로운: ${videoId})`);

    this.cache = [];
    this.lastSubtitleText = null;
    this.currentVideoId = videoId;
  }

  /**
   * 캐시 최대 크기 설정
   * @param {number} size - 새로운 최대 크기
   */
  setMaxCacheSize(size) {
    this.maxCacheSize = size;
    console.log(`⚙️ 캐시 최대 크기 설정: ${size}`);

    // 현재 캐시가 새로운 크기를 초과하면 오래된 항목 제거
    while (this.cache.length > this.maxCacheSize) {
      this.cache.shift();
    }
  }

  /**
   * 현재 캐시 상태 확인 (디버깅용)
   */
  getStatus() {
    return {
      currentVideoId: this.currentVideoId,
      cacheSize: this.cache.length,
      maxCacheSize: this.maxCacheSize,
      lastSubtitle: this.lastSubtitleText,
      cache: this.cache
    };
  }
}
