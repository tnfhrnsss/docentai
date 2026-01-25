
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || 'http://localhost:8001';
    this.USE_DUMMY = false; // 더미 데이터 사용 플래그
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
        throw new Error(i18n.t('errors.profileIdNotFound'));
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

    try {
      const response = await fetch(`${this.baseURL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'X-Profile-ID': profileId
        }
      });

      if (!response.ok) {
        console.error(`❌ 토큰 발급 실패: ${response.status}`);
        throw new Error(i18n.t('errors.retryLater'));
      }

      const { token, expiresAt } = await response.json();

      // ISO 8601 문자열을 밀리초 timestamp로 변환
      const expiresAtMs = typeof expiresAt === 'string'
        ? new Date(expiresAt).getTime()
        : expiresAt;

      return { token, expiresAt: expiresAtMs };
    } catch (error) {
      // 네트워크 오류 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ 네트워크 오류:', error);
        throw new Error(i18n.t('errors.networkError'));
      }
      throw error;
    }
  }

  /**
   * Chrome Storage에서 저장된 토큰 가져오기
   */
  async _getStoredToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken', 'tokenExpiry'], (result) => {
        if (result.authToken && result.tokenExpiry) {
          // ISO 8601 문자열을 밀리초 timestamp로 변환
          const expiresAtMs = typeof result.tokenExpiry === 'string'
            ? new Date(result.tokenExpiry).getTime()
            : result.tokenExpiry;

          resolve({
            token: result.authToken,
            expiresAt: expiresAtMs
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

    try {
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
        console.error(`❌ 영상 등록 실패: ${response.status}`);
        throw new Error(i18n.t('errors.retryLater'));
      }

      return await response.json();
    } catch (error) {
      // 네트워크 오류 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ 네트워크 오류:', error);
        throw new Error(i18n.t('errors.networkError'));
      }
      throw error;
    }
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

    try {
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
        console.error(`❌ 이미지 업로드 실패: ${response.status}`);
        throw new Error(i18n.t('errors.retryLater'));
      }

      const uploadTime = performance.now() - uploadStart;
      const totalTime = performance.now() - startTime;
      console.log(`⏱️ 업로드 시간: ${uploadTime.toFixed(0)}ms, 총 시간: ${totalTime.toFixed(0)}ms`);

      return await response.json();
    } catch (error) {
      // 네트워크 오류 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ 네트워크 오류:', error);
        throw new Error(i18n.t('errors.networkError'));
      }
      throw error;
    }
  }

  /**
   * 자막 설명 요청
   */
  async explainSubtitle(data) {
    console.log('📤 [API] 자막 설명 요청:', {
      ...data,
      imageId: data.imageId || '없음',
      contextCount: data.context?.length || 0,
      currentNonVerbalCues: data.currentSubtitle?.nonVerbalCues || []
    });

    try {
      // 실제 API 호출
      const requestBody = {
        language: navigator.language || navigator.languages?.[0] || 'en',
        selectedText: data.selectedText,
        timestamp: data.timestamp,
        title: data.metadata?.title || '',
        platform: data.metadata?.platform || ''
      };

      // 이미지 ID가 있으면 추가
      if (data.imageId) {
        requestBody.imageId = data.imageId;
      }

      // 컨텍스트 데이터가 있으면 추가 (이전 자막들)
      if (data.context && Array.isArray(data.context)) {
        requestBody.context = data.context;
      }

      // 현재 자막 정보가 있으면 추가
      if (data.currentSubtitle) {
        requestBody.currentSubtitle = data.currentSubtitle;
      }

      // 인증 토큰 확인
      const token = await this._ensureAuthenticated();

      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}/api/explanations/videos/${data.videoId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status === 202) {
        const result = await response.json();
        const error = new Error(result.message);
        error.retryAfter = result.retryAfter;
        throw error;
      }

      if (!response.ok) {
        console.error(`❌ 자막 설명 요청 실패: ${response.status}`);
        throw new Error(i18n.t('errors.retryLater'));
      }

      const result = await response.json();

      // 응답 형식 변환 (백엔드 응답 형식에 맞춰 파싱)
      if (result.success && result.data && result.data.explanation) {
        return {
          text: result.data.explanation.text,
          sources: result.data.explanation.sources || [],
          references: result.data.explanation.references || [],
          cached: result.data.cached || false,
          responseTime: result.data.responseTime || 0
        };
      }

      // 에러 응답 처리
      console.error('❌ 응답 파싱 실패:', result);
      throw new Error(i18n.t('errors.retryLater'));
    } catch (error) {
      // 네트워크 오류 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ 네트워크 오류:', error);
        throw new Error(i18n.t('errors.networkError'));
      }
      throw error;
    }
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

    try {
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
        console.error(`❌ 영상 상태 확인 실패: ${response.status}`);
        throw new Error(i18n.t('errors.retryLater'));
      }

      return await response.json();
    } catch (error) {
      // 네트워크 오류 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ 네트워크 오류:', error);
        throw new Error(i18n.t('errors.networkError'));
      }
      throw error;
    }
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
