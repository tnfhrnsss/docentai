class ImageIOUtils {
    /**
     * 이미지를 저화질로 압축 (해상도 축소 + JPEG 변환)
     * @param {string} dataUrl - Base64 data URL
     * @param {number} maxWidth - 최대 너비
     * @param {number} maxHeight - 최대 높이
     * @param {number} quality - JPEG 품질 (0.0 ~ 1.0)
     * @returns {Promise<string>} 압축된 Base64 data URL
     */
    static async _compressImage(dataUrl, maxWidth = 640, maxHeight = 360, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // 비율 유지하며 리사이징
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }

                // Canvas로 리사이징 + JPEG 변환
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG로 변환 (quality: 0.0 ~ 1.0)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.src = dataUrl;
        });
    }

    static _base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }
}