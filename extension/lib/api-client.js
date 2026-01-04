/**
 * Backend API 클라이언트 (더미 데이터 버전)
 * UI 기능 검증용
 */
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || 'http://localhost:7777';
    this.USE_DUMMY = true; // 더미 데이터 사용 플래그
  }

  /**
   * 영상 등록
   */
  async registerVideo(metadata) {
    console.log('📤 [API] 영상 등록 요청:', metadata);

    if (this.USE_DUMMY) {
      // 더미 응답 시뮬레이션 (약간의 지연)
      await this._delay(500);

      const response = {
        status: 'ready',
        videoId: metadata.videoId,
        message: '영상이 준비되었습니다'
      };

      console.log('📥 [API] 영상 등록 응답:', response);
      return response;
    }

    // 실제 API 호출 (추후 구현)
    const response = await fetch(`${this.baseURL}/api/video/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 자막 설명 요청
   */
  async explainSubtitle(data) {
    console.log('📤 [API] 자막 설명 요청:', data);

    if (this.USE_DUMMY) {
      // 더미 응답 시뮬레이션 (캐시 여부에 따라 지연 시간 다르게)
      const isCached = Math.random() > 0.5;
      const delay = isCached ? 25 : 2300;

      await this._delay(delay);

      // 더미 설명 데이터
      const dummyExplanations = [
        {
          text: `"${data.selectedText}"는 주인공이 과거 타임슬립을 통해 만난 인물을 언급하는 장면입니다. 이전 에피소드에서 등장한 핵심 복선이 풀리는 순간이에요.`,
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
          text: `이 대사는 주인공의 과거 회상 장면과 연결됩니다. "${data.selectedText}"를 통해 등장인물 간의 숨겨진 관계가 드러나는 중요한 순간입니다.`,
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
          text: `"${data.selectedText}"는 이 작품의 핵심 주제를 상징하는 대사입니다. 등장인물의 내면 갈등과 성장을 보여주는 장면으로, 전체 서사에서 중요한 전환점이 됩니다.`,
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

    // 실제 API 호출 (추후 구현)
    const response = await fetch(`${this.baseURL}/api/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
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

    return await response.json();
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

    // 실제 API 호출 (추후 구현)
    const response = await fetch(`${this.baseURL}/api/video/${videoId}/status`);

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
