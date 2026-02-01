/**
 * 넷플릭스 영상 메타데이터 감지
 */
class NetflixDetector {
  constructor() {
    this.currentVideoId = null;
    this.metadata = null;
    this.netflixPlayer = null;
    this.subtitleObserver = null; // 자막 변경 감지용 MutationObserver
    this.onSubtitleChangeCallback = null; // 자막 변경 시 호출될 콜백
    this.lastSubtitle = null; // 마지막 자막 (중복 방지)
  }

  /**
   * 중첩된 객체에서 키 찾기 (깊이 우선 탐색)
   */
  deepFind(obj, key, maxDepth = 5, currentDepth = 0) {
    if (!obj || typeof obj !== 'object' || currentDepth > maxDepth) return null;

    try {
      // 현재 객체에 키가 있으면 반환
      if (obj.hasOwnProperty(key)) return obj[key];

      // 자식 객체 탐색
      for (const k in obj) {
        try {
          const found = this.deepFind(obj[k], key, maxDepth, currentDepth + 1);
          if (found !== null && found !== undefined) return found;
        } catch (e) {
          // 접근 제한된 속성 무시
          continue;
        }
      }
    } catch (error) {
      // 순환 참조 등 예외 처리
      return null;
    }

    return null;
  }

  /**
   * React Fiber를 통해 컴포넌트 props 찾기
   */
  findReactProps() {
    try {
      // React 앱의 루트 요소 찾기
      const rootElement = document.querySelector('#appMountPoint, .watch-video, [data-uia="watch-video"]');
      if (!rootElement) return null;

      // React Fiber 키 찾기
      const fiberKey = Object.keys(rootElement).find(key =>
        key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
      );

      if (fiberKey) {
        const fiber = rootElement[fiberKey];
        return this.deepFind(fiber, 'memoizedProps') || this.deepFind(fiber, 'pendingProps');
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /**
   * Netflix 플레이어 객체 찾기
   */
  findNetflixPlayer() {
    if (this.netflixPlayer) return this.netflixPlayer;

    // 방법 1: window 객체에서 'netflix', 'player', 'cadmium', 'appContext' 키워드 검색
    const netflixKeys = Object.keys(window).filter(k => {
      const lk = k.toLowerCase();
      return lk.includes('netflix') ||
             lk.includes('player') ||
             lk.includes('cadmium') ||
             lk.includes('app') ||
             lk.includes('context');
    });

    // 방법 2: 알려진 패턴으로 플레이어 찾기
    const possiblePlayers = [
      window.netflix,
      window.NetflixPlayer,
      window.videoPlayer,
      window.falcorCache,
      window.playerApp,
      window.appContext,
      window.reactPlayerApp,
      window.cadmium,
      window.nfPlayer
    ];

    for (const player of possiblePlayers) {
      if (player && typeof player === 'object') {
        this.netflixPlayer = player;
        return player;
      }
    }

    // 방법 3: netflixKeys에서 객체 찾기
    for (const key of netflixKeys) {
      try {
        const obj = window[key];
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          this.netflixPlayer = obj;
          return obj;
        }
      } catch (e) {
        continue;
      }
    }

    // 방법 4: React Fiber 탐색
    const reactProps = this.findReactProps();
    if (reactProps) {
      this.netflixPlayer = reactProps;
      return reactProps;
    }
    return null;
  }

  /**
   * DOM에서 구조화된 데이터 추출 (JSON-LD)
   */
  extractFromJsonLd() {
    const enhanced = {};

    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          // 타이틀 정보
          if (data.name && !enhanced.episodeTitle) {
            enhanced.episodeTitle = data.name;
          }

          // 장르
          if (data.genre) {
            enhanced.genre = Array.isArray(data.genre) ? data.genre.join(', ') : data.genre;
          }

          // 시청 등급
          if (data.contentRating) {
            enhanced.maturityRating = data.contentRating;
          }

          // 영상 길이
          if (data.duration) {
            enhanced.duration = data.duration;
          }

          // 시즌 정보
          if (data.partOfSeason) {
            enhanced.seasonNumber = data.partOfSeason.seasonNumber;
          }

          // 에피소드 번호
          if (data.episodeNumber) {
            enhanced.episodeNumber = data.episodeNumber;
          }

          // 설명
          if (data.description && !enhanced.description) {
            enhanced.description = data.description;
          }

          // 출연진
          if (data.actor && Array.isArray(data.actor) && !enhanced.cast) {
            enhanced.cast = data.actor.map(a => a.name).join(', ');
          }

          // 감독
          if (data.director && !enhanced.director) {
            if (Array.isArray(data.director)) {
              enhanced.director = data.director.map(d => d.name).join(', ');
            } else if (data.director.name) {
              enhanced.director = data.director.name;
            }
          }

          // 년도
          if (data.datePublished && !enhanced.year) {
            enhanced.year = new Date(data.datePublished).getFullYear().toString();
          }

          // 썸네일
          if (data.image && !enhanced.thumbnailUrl) {
            enhanced.thumbnailUrl = Array.isArray(data.image) ? data.image[0] : data.image;
          }

        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      // ignore
    }

    return enhanced;
  }

  /**
   * DOM에서 직접 메타데이터 추출
   */
  extractFromDOM() {
    const enhanced = {};

    // 1. 에피소드 제목 추출 (더 많은 선택자 시도)
    const episodeSelectors = [
      '[data-uia="video-title"]',
      '.video-title',
      'h4.ellipsize-text',
      '.watch-video--evidence-title',
      '.title-logo',
      '.previewModal--player-titleTreatmentWrapper',
      '.ltr-1vjbg81',
      'span.ellipsize-text'
    ];

    for (const selector of episodeSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        enhanced.episodeTitle = element.textContent.trim();
        break;
      }
    }

    // 2. 메타 태그에서 정보 추출
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle && metaTitle.content) {
      if (!enhanced.episodeTitle) {
        enhanced.episodeTitle = metaTitle.content;
      }
    }

    const metaDescription = document.querySelector('meta[property="og:description"]');
    if (metaDescription && metaDescription.content) {
      enhanced.description = metaDescription.content;
    }

    const metaImage = document.querySelector('meta[property="og:image"]');
    if (metaImage && metaImage.content) {
      enhanced.thumbnailUrl = metaImage.content;
    }

    // 3. 영상 길이 (비디오 요소에서)
    const video = document.querySelector('video');
    if (video && video.duration && video.duration !== Infinity) {
      enhanced.duration = Math.floor(video.duration);
    }

    // 4. 출연진/제작진 정보
    const castSelectors = [
      '[data-uia="info-row-cast"]',
      '.cast',
      '.about-item'
    ];

    for (const selector of castSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        enhanced.cast = element.textContent.trim();
        break;
      }
    }

    // 5. 년도 정보
    const yearElement = document.querySelector('.year, [data-uia="info-row-year"]');
    if (yearElement && yearElement.textContent.trim()) {
      enhanced.year = yearElement.textContent.trim();
    }

    return enhanced;
  }

  /**
   * 향상된 메타데이터 추출 (Netflix 플레이어 객체 기반)
   */
  extractEnhancedMetadata() {
    let enhanced = {
      episodeTitle: null,
      genre: null,
      maturityRating: null,
      duration: null
    };

    // 방법 1: JSON-LD에서 추출
    const jsonLdData = this.extractFromJsonLd();
    enhanced = { ...enhanced, ...jsonLdData };

    // 방법 2: DOM에서 직접 추출
    const domData = this.extractFromDOM();
    enhanced = { ...enhanced, ...domData };

    // 방법 3: Netflix 플레이어 객체에서 추출
    const player = this.findNetflixPlayer();
    if (player) {
      // 에피소드 제목 / 비디오 제목
      if (!enhanced.episodeTitle) {
        const episodeTitle = this.deepFind(player, 'episodeTitle') ||
                             this.deepFind(player, 'episode') ||
                             this.deepFind(player, 'currentEpisode') ||
                             this.deepFind(player, 'videoTitle') ||
                             this.deepFind(player, 'title') ||
                             this.deepFind(player, 'showTitle');
        if (episodeTitle && typeof episodeTitle === 'string') {
          enhanced.episodeTitle = episodeTitle;
        }
      }

      // 장르
      if (!enhanced.genre) {
        const genre = this.deepFind(player, 'genre') ||
                      this.deepFind(player, 'genres') ||
                      this.deepFind(player, 'category');
        if (genre) {
          enhanced.genre = Array.isArray(genre) ? genre.join(', ') : genre;
        }
      }

      // 시청 등급
      if (!enhanced.maturityRating) {
        const maturityRating = this.deepFind(player, 'maturityRating') ||
                               this.deepFind(player, 'rating') ||
                               this.deepFind(player, 'maturityLevel');
        if (maturityRating) {
          enhanced.maturityRating = maturityRating;
        }
      }

      // 영상 길이
      if (!enhanced.duration) {
        const duration = this.deepFind(player, 'duration') ||
                         this.deepFind(player, 'runtime');
        if (duration && typeof duration === 'number') {
          enhanced.duration = duration;
        }
      }

      // 설명
      if (!enhanced.description) {
        const description = this.deepFind(player, 'description') ||
                            this.deepFind(player, 'synopsis') ||
                            this.deepFind(player, 'summary');
        if (description && typeof description === 'string') {
          enhanced.description = description;
        }
      }

      // 출연진
      if (!enhanced.cast) {
        const cast = this.deepFind(player, 'cast') ||
                     this.deepFind(player, 'actors');
        if (cast) {
          if (Array.isArray(cast)) {
            enhanced.cast = cast.map(c => typeof c === 'string' ? c : c.name).join(', ');
          } else if (typeof cast === 'string') {
            enhanced.cast = cast;
          }
        }
      }

      // 감독
      if (!enhanced.director) {
        const director = this.deepFind(player, 'director') ||
                         this.deepFind(player, 'directors');
        if (director) {
          if (Array.isArray(director)) {
            enhanced.director = director.map(d => typeof d === 'string' ? d : d.name).join(', ');
          } else if (typeof director === 'string') {
            enhanced.director = director;
          }
        }
      }

      // 년도
      if (!enhanced.year) {
        const year = this.deepFind(player, 'year') ||
                     this.deepFind(player, 'releaseYear');
        if (year) {
          enhanced.year = year.toString();
        }
      }

      // 썸네일
      if (!enhanced.thumbnailUrl) {
        const thumbnail = this.deepFind(player, 'thumbnail') ||
                          this.deepFind(player, 'image') ||
                          this.deepFind(player, 'poster');
        if (thumbnail && typeof thumbnail === 'string') {
          enhanced.thumbnailUrl = thumbnail;
        }
      }
    }
    return enhanced;
  }

  /**
   * 영상 재생 감지 및 메타데이터 추출
   */
  async detectVideo() {
    try {
      // URL에서 videoId 추출
      const videoId = this.extractVideoIdFromURL();

      if (!videoId)  {
        return null;
      }

      if (videoId === this.currentVideoId) {
        return this.metadata; // 이미 감지된 영상
      }

      this.currentVideoId = videoId;

      // 향상된 메타데이터 추출 (Netflix 플레이어 객체 기반)
      const enhanced = this.extractEnhancedMetadata();

      // title 결정 우선순위: episodeTitle > extractTitle()
      const title = enhanced.episodeTitle || this.extractTitle();

      this.metadata = {
        platform: 'netflix',
        videoId,
        title, // episodeTitle이 있으면 그것을 title로 사용
        duration: enhanced.duration,
        thumbnailUrl: enhanced.thumbnailUrl
      };
      return this.metadata;

    } catch (error) {
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
   * 영상 제목 추출 (fallback용)
   */
  extractTitle() {
    // 방법 1: DOM 선택자 (더 많은 선택자 시도)
    const titleSelectors = [
      '[data-uia="video-title"]',
      '.video-title',
      'h4.ellipsize-text',
      '.watch-video--evidence-title',
      '.title-logo',
      'span.ellipsize-text'
    ];

    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }

    // 방법 2: 메타데이터
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) {
      return ogTitle.content;
    }

    // 방법 3: 페이지 제목
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'Netflix') {
      return pageTitle.replace(' - Netflix', '').trim();
    }

    return 'Unknown Title';
  }

  /**
   * 에피소드 번호 추출
   */
  extractEpisode() {
    // to-do

    return null;
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

  /**
   * 현재 재생 시간 가져오기 (초 단위)
   */
  getCurrentTime() {
    const video = document.querySelector('video');
    if (video) {
      return video.currentTime;
    }
    return 0;
  }

  /**
   * 자막 변경 감지 시작
   * @param {Function} callback - 자막 변경 시 호출될 콜백 (text, timestamp)
   */
  startSubtitleObserver(callback) {
    this.onSubtitleChangeCallback = callback;

    // 기존 옵저버가 있으면 정리
    if (this.subtitleObserver) {
      this.subtitleObserver.disconnect();
    }

    // 자막 컨테이너 찾기
    const container = this.getSubtitleContainer();
    if (!container) {
      setTimeout(() => this.startSubtitleObserver(callback), 3000);
      return;
    }

    // MutationObserver 생성
    this.subtitleObserver = new MutationObserver((mutations) => {
      const currentSubtitle = this.getCurrentSubtitle();
      const currentTime = this.getCurrentTime();

      // 자막이 변경되었고, 이전 자막과 다른 경우에만 콜백 호출
      if (currentSubtitle && currentSubtitle !== this.lastSubtitle) {
        this.lastSubtitle = currentSubtitle;

        // 콜백 호출
        if (this.onSubtitleChangeCallback) {
          this.onSubtitleChangeCallback(currentSubtitle, currentTime);
        }
      }
    });

    // 자막 컨테이너 감시 시작
    this.subtitleObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * 자막 변경 감지 중지
   */
  stopSubtitleObserver() {
    if (this.subtitleObserver) {
      this.subtitleObserver.disconnect();
      this.subtitleObserver = null;
    }
  }
}
