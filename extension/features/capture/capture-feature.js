/**
 * 화면 캡처 기능 - UI Components Extension
 *
 * 이 파일은 개발(dev) 빌드에서만 포함됩니다.
 * UIComponents 클래스에 captureScreen 메서드와 캡처 버튼을 추가합니다.
 */

// UIComponents 클래스가 이미 로드되었는지 확인
if (typeof UIComponents === 'undefined') {
  // cannot find..
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
        captureBtn.innerHTML = i18n.t('ui.actionPanel.captureScreen');
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
      }
    }
  };

  /**
   * 화면 캡처 메서드를 UIComponents 프로토타입에 추가
   */
  UIComponents.prototype.captureScreen = async function() {
    if (!this.actionPanel) {
      this.showToast(i18n.t('ui.capture.panelNotFound'));
      return;
    }

    // Extension context 유효성 체크
    if (!chrome.runtime || !chrome.runtime.id) {
      this.showToast(i18n.t('ui.capture.extensionUpdated'));
      return;
    }

    // 1. 액션 패널과 플로팅 버튼을 잠시 숨김 (캡처 이미지에 포함되지 않도록)
    const originalPanelDisplay = this.actionPanel.style.display;
    this.actionPanel.style.display = 'none';

    const originalButtonDisplay = this.floatingButton?.style.display;
    if (this.floatingButton) {
      this.floatingButton.style.display = 'none';
    }

    // UI 복구 함수 (무조건 복구되도록 보장)
    const restoreUI = () => {
      if (this.actionPanel) {
        this.actionPanel.style.display = originalPanelDisplay;
      }
      if (this.floatingButton) {
        this.floatingButton.style.display = originalButtonDisplay || '';
      }
    };

    // 타임아웃 설정 (5초 후 무조건 UI 복구)
    const timeoutId = setTimeout(() => {
      restoreUI();
      this.showToast(i18n.t('ui.capture.timeout'));
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
            // Extension context invalidated 에러 특별 처리
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              this.showToast(i18n.t('ui.capture.extensionUpdated'));
            } else {
              this.showToast(`${i18n.t('ui.capture.failed')}: ${chrome.runtime.lastError.message}`);
            }
            return;
          }

          if (response && response.errorCode) {
            // 에러 코드를 번역
            const errorMessage = i18n.t(`ui.capture.errors.${response.errorCode}`);
            this.showToast(errorMessage);
            return;
          }

          if (response && response.dataUrl) {
            this.selectedImage = response.dataUrl;
            this.showImagePreview(response.dataUrl);
          } else {
            this.showToast(i18n.t('ui.capture.noResponse'));
          }
        }
      );
    } catch (error) {
      // 타임아웃 취소
      clearTimeout(timeoutId);

      // 에러 발생 시에도 UI 요소 복구
      restoreUI();

      // Extension context invalidated 에러 특별 처리
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.showToast(i18n.t('ui.capture.extensionUpdated'));
      } else {
        this.showToast(`${i18n.t('ui.capture.failed')}: ${error.message}`);
      }
    }
  };
}
