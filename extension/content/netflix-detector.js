/**
 * 넷플릭스 영상 메타데이터 감지
 */
class NetflixDetector {
  constructor() {
    this.currentVideoId = null;
    this.metadata = null;
  }

  /**
   * 영상 재생 감지 및 메타데이터 추출
   */
  async detectVideo() {
    try {
      // URL에서 videoId 추출
      const videoId = this.extractVideoIdFromURL();

      if (!videoId) {
        console.log('❌ videoId를 찾을 수 없습니다. URL:', window.location.href);
        return null;
      }

      if (videoId === this.currentVideoId) {
        return this.metadata; // 이미 감지된 영상
      }

      this.currentVideoId = videoId;

      // DOM에서 메타데이터 추출
      const title = this.extractTitle();
      const episode = this.extractEpisode();
      const season = this.extractSeason();

      this.metadata = {
        platform: 'netflix',
        videoId,
        title,
        episode,
        season
      };

      console.log('🎬 영상 감지:', this.metadata);

      return this.metadata;

    } catch (error) {
      console.error('영상 감지 실패:', error);
      return null;
    }
  }

  /**
   * URL에서 videoId 추출
   * 예: https://www.netflix.com/watch/81234567?trackId=...
   */
  extractVideoIdFromURL() {
    const match = window.location.href.match(/\/watch\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * 영상 제목 추출
   */
  extractTitle() {
    // 방법 1: 페이지 제목
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'Netflix') {
      return pageTitle.replace(' - Netflix', '').trim();
    }

    // 방법 2: DOM 선택자
    const titleElement = document.querySelector('.video-title, [data-uia="video-title"]');
    if (titleElement) {
      return titleElement.textContent.trim();
    }

    // 방법 3: 메타데이터
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      return ogTitle.getAttribute('content');
    }

    return 'Unknown Title';
  }

  /**
   * 에피소드 번호 추출
   */
  extractEpisode() {
    // DOM 선택자
    const episodeElement = document.querySelector('.episode-title, [data-uia="episode-title"]');
    if (episodeElement) {
      const text = episodeElement.textContent;
      const match = text.match(/에피소드?\s*(\d+)/i) || text.match(/E(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  /**
   * 시즌 번호 추출
   */
  extractSeason() {
    const episodeElement = document.querySelector('.episode-title, [data-uia="episode-title"]');
    if (episodeElement) {
      const text = episodeElement.textContent;
      const match = text.match(/시즌?\s*(\d+)/i) || text.match(/S(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 1; // 기본값
  }

  /**
   * 자막 DOM 요소 찾기
   */
  getSubtitleContainer() {
    return document.querySelector('.player-timedtext, .player-timedtext-text-container');
  }

  /**
   * 현재 표시 중인 자막 텍스트 가져오기
   */
  getCurrentSubtitle() {
    const container = this.getSubtitleContainer();
    if (container) {
      return container.textContent.trim();
    }
    return null;
  }
}
