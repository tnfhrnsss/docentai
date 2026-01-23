/**
 * 화면 캡처 기능 - UI Components Extension
 *
 * 이 파일은 개발(dev) 빌드에서만 포함됩니다.
 * UIComponents 클래스에 captureScreen 메서드와 캡처 버튼을 추가합니다.
 */

console.log('📸 화면 캡처 UI 기능이 활성화되었습니다 (DEV MODE)');

// UIComponents 클래스가 이미 로드되었는지 확인
if (typeof UIComponents === 'undefined') {
  console.error('❌ UIComponents 클래스를 찾을 수 없습니다. capture-feature.js는 ui-components.js 이후에 로드되어야 합니다.');
} else {
  /**
   * 화면 캡처 기능 활성화 플래그
   */
  UIComponents.CAPTURE_ENABLED = true;

  /**
   * createActionPanel 메서드를 확장하여 캡처 버튼 추가
   */
  const originalCreateActionPanel = UIComponents.prototype.createActionPanel;
  UIComponents.prototype.createActionPanel = function(selectedText, onExplain) {
    // 원래 메서드 호출
    originalCreateActionPanel.call(this, selectedText, onExplain);

    // 캡처 버튼 추가
    if (this.actionPanel) {
      // 이미지 미리보기 컨테이너를 찾고, 그 부모 요소에 버튼 추가
      const imagePreviewContainer = this.actionPanel.querySelector('#image-preview-container');
      if (imagePreviewContainer && imagePreviewContainer.parentElement) {
        const buttonContainer = imagePreviewContainer.parentElement;

        const captureBtn = document.createElement('button');
        captureBtn.id = 'capture-screen-btn';
        captureBtn.innerHTML = '📸 화면 캡처';
        captureBtn.style.cssText = `
          width: 100%;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 12px;
        `;

        // 호버 효과
        captureBtn.addEventListener('mouseenter', () => {
          captureBtn.style.background = 'rgba(255, 255, 255, 0.15)';
          captureBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        captureBtn.addEventListener('mouseleave', () => {
          captureBtn.style.background = 'rgba(255, 255, 255, 0.1)';
          captureBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });

        // 클릭 이벤트
        captureBtn.addEventListener('click', () => this.captureScreen());

        // 이미지 미리보기 컨테이너 앞에 삽입
        buttonContainer.insertBefore(captureBtn, imagePreviewContainer);

        console.log('✅ 캡처 버튼이 추가되었습니다.');
      } else {
        console.error('❌ 이미지 미리보기 컨테이너를 찾을 수 없습니다.');
      }
    }
  };

  /**
   * 화면 캡처 메서드를 UIComponents 프로토타입에 추가
   */
  UIComponents.prototype.captureScreen = async function() {
    if (!this.actionPanel) {
      this.showToast('액션 패널을 찾을 수 없습니다.');
      return;
    }

    // Extension context 유효성 체크
    if (!chrome.runtime || !chrome.runtime.id) {
      console.error('❌ Extension context invalidated');
      this.showToast('확장 프로그램이 업데이트되었습니다. 페이지를 새로고침해주세요. (F5)');
      return;
    }

    console.log('📸 화면 캡처 준비: UI 요소 숨김');

    // 1. 액션 패널과 플로팅 버튼을 잠시 숨김 (캡처 이미지에 포함되지 않도록)
    const originalPanelDisplay = this.actionPanel.style.display;
    this.actionPanel.style.display = 'none';

    const originalButtonDisplay = this.floatingButton?.style.display;
    if (this.floatingButton) {
      this.floatingButton.style.display = 'none';
    }

    // UI 복구 함수 (무조건 복구되도록 보장)
    const restoreUI = () => {
      console.log('🔄 UI 복구 중...');
      if (this.actionPanel) {
        this.actionPanel.style.display = originalPanelDisplay;
      }
      if (this.floatingButton) {
        this.floatingButton.style.display = originalButtonDisplay || '';
      }
    };

    // 타임아웃 설정 (5초 후 무조건 UI 복구)
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ 화면 캡처 타임아웃 - UI 강제 복구');
      restoreUI();
      this.showToast('화면 캡처 시간이 초과되었습니다. 다시 시도해주세요.');
    }, 5000);

    try {
      // 2. 화면이 완전히 렌더링되도록 약간 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. 화면 캡처 요청
      chrome.runtime.sendMessage(
        { type: 'CAPTURE_SCREEN' },
        (response) => {
          // 타임아웃 취소
          clearTimeout(timeoutId);

          // 4. 캡처 완료 후 UI 요소 다시 표시
          restoreUI();

          if (chrome.runtime.lastError) {
            console.error('❌ 메시지 전송 실패:', chrome.runtime.lastError);

            // Extension context invalidated 에러 특별 처리
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              this.showToast('확장 프로그램이 업데이트되었습니다. 페이지를 새로고침해주세요. (F5)');
            } else {
              this.showToast(`화면 캡처에 실패했습니다: ${chrome.runtime.lastError.message}`);
            }
            return;
          }

          if (response && response.error) {
            console.error('❌ 화면 캡처 실패:', response.error);
            this.showToast(`화면 캡처에 실패했습니다: ${response.error}`);
            return;
          }

          if (response && response.dataUrl) {
            console.log('✅ 화면 캡처 성공');
            this.selectedImage = response.dataUrl;
            this.showImagePreview(response.dataUrl);
          } else {
            console.error('❌ 응답 데이터 없음:', response);
            this.showToast('화면 캡처에 실패했습니다: 응답 데이터 없음');
          }
        }
      );
    } catch (error) {
      console.error('❌ 화면 캡처 예외:', error);

      // 타임아웃 취소
      clearTimeout(timeoutId);

      // 에러 발생 시에도 UI 요소 복구
      restoreUI();

      // Extension context invalidated 에러 특별 처리
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.showToast('확장 프로그램이 업데이트되었습니다. 페이지를 새로고침해주세요. (F5)');
      } else {
        this.showToast(`화면 캡처에 실패했습니다: ${error.message}`);
      }
    }
  };

  console.log('✅ UIComponents에 captureScreen 메서드 및 버튼이 추가되었습니다.');
}
