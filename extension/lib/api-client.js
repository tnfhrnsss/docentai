
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || 'http://localhost:8081';
    this.USE_DUMMY = true; // 더미 데이터 사용 플래그
    this._tokenCache = null; // 토큰 캐시 (메모리)
  }

  /**
   * 인증 토큰 확인 및 갱신
   * @returns {Promise<string|null>} 유효한 토큰 또는 null (더미 모드)
   */
  async _ensureAuthenticated() {
    // 더미 모드에서는 인증 불필요
    if (this.USE_DUMMY) {
      return null;
    }

    // 1. 메모리 캐시 확인
    if (this._tokenCache && this._tokenCache.expiresAt > Date.now()) {
      return this._tokenCache.token;
    }

    // 2. Chrome Storage에서 토큰 가져오기
    const storedToken = await this._getStoredToken();
    if (storedToken && storedToken.expiresAt > Date.now()) {
      this._tokenCache = storedToken;
      return storedToken.token;
    }

    // 3. 토큰 만료 또는 없음 → 새로 발급
    console.log('🔐 토큰 발급 중...');
    const newToken = await this._fetchToken();

    // 4. Storage와 메모리에 저장
    await this._saveToken(newToken);
    this._tokenCache = newToken;

    console.log('✅ 토큰 발급 완료:', newToken.expiresAt ? new Date(newToken.expiresAt).toLocaleString() : 'N/A');
    return newToken.token;
  }

  /**
   * Netflix localStorage에서 Profile ID 가져오기
   */
  _getProfileId() {
    try {
      const profileId = localStorage.getItem('MDX_PROFILEID');
      if (!profileId) {
        throw new Error('Netflix Profile ID를 찾을 수 없습니다. Netflix에 로그인되어 있는지 확인하세요.');
      }
      return profileId;
    } catch (error) {
      console.error('❌ Profile ID 가져오기 실패:', error);
      throw error;
    }
  }

  /**
   * 토큰 발급 API 호출
   * @returns {Promise<{token: string, expiresAt: number}>}
   */
  async _fetchToken() {
    const profileId = this._getProfileId();

    const response = await fetch(`${this.baseURL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'X-Profile-ID': profileId
      }
    });

    if (!response.ok) {
      throw new Error(`토큰 발급 실패: ${response.status}`);
    }

    const { token, expiresAt } = await response.json();
    return { token, expiresAt };
  }

  /**
   * Chrome Storage에서 저장된 토큰 가져오기
   */
  async _getStoredToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken', 'tokenExpiry'], (result) => {
        if (result.authToken && result.tokenExpiry) {
          resolve({
            token: result.authToken,
            expiresAt: result.tokenExpiry
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Chrome Storage에 토큰 저장
   */
  async _saveToken({ token, expiresAt }) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          authToken: token,
          tokenExpiry: expiresAt
        },
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * 영상 등록
   */
  async registerVideo(metadata) {
    console.log('📤 [API] 영상 등록 요청:', metadata);

    if (this.USE_DUMMY) {
      await this._delay(500);

      const response = {
        status: 'ready',
        videoId: metadata.videoId,
        message: '영상이 준비되었습니다'
      };

      console.log('📥 [API] 영상 등록 응답:', response);
      return response;
    }

    // 인증 토큰 확인
    const token = await this._ensureAuthenticated();

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/api/videos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 이미지 업로드
   */
  async uploadImage(videoId, imageData) {
    const startTime = performance.now();
    const originalSize = imageData ? imageData.length : 0;
    console.log('📤 [API] 이미지 업로드 요청:', imageData ? `${imageData.substring(0, 50)}...` : '없음');

    if (this.USE_DUMMY) {
      // 더미 응답 시뮬레이션 (업로드 시간)
      await this._delay(800);

      const response = {
        imageId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: 'https://example.com/uploads/screenshot.png',
        size: imageData ? Math.floor(imageData.length * 0.75) : 0,
        uploadedAt: new Date().toISOString()
      };

      console.log('📥 [API] 이미지 업로드 응답:', response);
      return response;
    }

    // 실제 API 호출 시 이미지 압축
    const compressStart = performance.now();
    console.log('🔄 이미지 압축 중... (원본 크기:', Math.floor(originalSize / 1024), 'KB)');

    imageData = await ImageIOUtils._compressImage(imageData, 640, 360, 0.8);

    const compressTime = performance.now() - compressStart;
    const compressedSize = imageData.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ 압축 완료: ${Math.floor(compressedSize / 1024)}KB (${compressionRatio}% 감소, ${compressTime.toFixed(0)}ms)`);

    // Base64를 Blob으로 변환
    const base64Data = imageData.split(',')[1];
    const blob = ImageIOUtils._base64ToBlob(base64Data, 'image/jpeg');

    const formData = new FormData();
    formData.append('image', blob, 'screenshot.jpg');

    // 인증 토큰 확인
    const token = await this._ensureAuthenticated();

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uploadStart = performance.now();
    const response = await fetch(`${this.baseURL}/api/upload/${videoId}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`이미지 업로드 오류: ${response.status}`);
    }

    const uploadTime = performance.now() - uploadStart;
    const totalTime = performance.now() - startTime;
    console.log(`⏱️ 업로드 시간: ${uploadTime.toFixed(0)}ms, 총 시간: ${totalTime.toFixed(0)}ms`);

    return await response.json();
  }

  /**
   * 자막 설명 요청
   */
  async explainSubtitle(data) {
    console.log('📤 [API] 자막 설명 요청:', {
      ...data,
      imageId: data.imageId || '없음'
    });

    if (this.USE_DUMMY) {
      // 더미 응답 시뮬레이션 (캐시 여부에 따라 지연 시간 다르게)
      const isCached = Math.random() > 0.5;
      const delay = isCached ? 25 : 2300;

      await this._delay(delay);

      // 더미 설명 데이터
      const dummyExplanations = [
        {
          text: `"${data.selectedText}"는 주인공이 과거 타임슬립을 통해 만난 인물을 언급하는 장면입니다. 이전 에피소드에서 등장한 핵심 복선이 풀리는 순간이에요.${data.imageId ? ' (이미지 분석: 주인공의 표정이 놀라움과 슬픔을 동시에 나타내고 있습니다.)' : ''}`,
          sources: [
            {
              type: 'namuwiki',
              title: '나무위키 - 작품 분석'
            },
            {
              type: 'video_analysis',
              title: '영상 자막 분석'
            }
          ],
          references: [
            {
              timestamp: data.timestamp - 300,
              description: '5분 전 - 관련 복선 장면'
            }
          ],
          cached: isCached,
          responseTime: delay
        },
        {
          text: `이 대사는 주인공의 과거 회상 장면과 연결됩니다. "${data.selectedText}"를 통해 등장인물 간의 숨겨진 관계가 드러나는 중요한 순간입니다.${data.imageId ? ' (이미지 분석: 배경에서 의미심장한 소품들이 보입니다.)' : ''}`,
          sources: [
            {
              type: 'wikipedia',
              title: '위키백과 - 줄거리'
            }
          ],
          references: [],
          cached: isCached,
          responseTime: delay
        },
        {
          text: `"${data.selectedText}"는 이 작품의 핵심 주제를 상징하는 대사입니다. 등장인물의 내면 갈등과 성장을 보여주는 장면으로, 전체 서사에서 중요한 전환점이 됩니다.${data.imageId ? ' (이미지 분석: 화면의 조명과 색감이 극적인 분위기를 연출하고 있습니다.)' : ''}`,
          sources: [
            {
              type: 'fandom',
              title: '팬덤 위키 - 캐릭터 분석'
            },
            {
              type: 'video_analysis',
              title: '대사 맥락 분석'
            }
          ],
          references: [
            {
              timestamp: data.timestamp - 600,
              description: '10분 전 - 복선 등장'
            },
            {
              timestamp: data.timestamp + 120,
              description: '2분 후 - 결과 확인'
            }
          ],
          cached: isCached,
          responseTime: delay
        }
      ];

      // 랜덤하게 하나 선택
      const response = dummyExplanations[Math.floor(Math.random() * dummyExplanations.length)];

      console.log(`📥 [API] 자막 설명 응답 (${isCached ? '캐시 HIT' : '캐시 MISS'}, ${delay}ms):`, response);
      return response;
    }

    // 실제 API 호출
    const requestBody = {
      platform: data.platform || 'netflix',
      videoId: data.videoId,
      title: data.metadata?.title,
      episode: data.metadata?.episode,
      season: data.metadata?.season,
      lang: navigator.language || navigator.languages?.[0] || 'en',
      currentSubtitle: {
        text: data.selectedText,
        timestamp: data.timestamp
      }
    };

    // 이미지 ID가 있으면 추가
    if (data.imageId) {
      requestBody.imageId = data.imageId;
    }

    // 인증 토큰 확인
    const token = await this._ensureAuthenticated();

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/api/explanations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (response.status === 202) {
      // 처리 중
      const result = await response.json();
      const error = new Error(result.message);
      error.retryAfter = result.retryAfter;
      throw error;
    }

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();

    // 응답 형식 변환 (백엔드 응답 형식에 맞춤)
    if (result.error === "0" && result.data) {
      return {
        text: result.data.msg,
        cached: false,
        responseTime: 0
      };
    }

    throw new Error(result.message || '알 수 없는 오류');
  }

  /**
   * 영상 상태 확인
   */
  async getVideoStatus(videoId) {
    console.log('📤 [API] 영상 상태 확인:', videoId);

    if (this.USE_DUMMY) {
      await this._delay(200);

      const response = {
        videoId: videoId,
        status: 'ready',
        progress: 100,
        estimatedTimeRemaining: 0
      };

      console.log('📥 [API] 영상 상태 응답:', response);
      return response;
    }

    // 인증 토큰 확인
    const token = await this._ensureAuthenticated();

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 실제 API 호출
    const response = await fetch(`${this.baseURL}/api/video/${videoId}/status`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 지연 함수 (더미 데이터용)
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 더미 모드 토글
   */
  setDummyMode(enabled) {
    this.USE_DUMMY = enabled;
    console.log(`🔧 더미 모드: ${enabled ? 'ON' : 'OFF'}`);
  }
}
