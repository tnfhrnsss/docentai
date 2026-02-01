# DocentAI - Subtitle Context Explainer

A Chrome Extension that uses AI to explain Netflix subtitles with contextual understanding.

## Overview

When you encounter difficult dialogues or scenes while watching movies or dramas — especially those in another language — DocentAI provides contextually-aware explanations.



## Key Features

- **Keyboard Shortcut**: Quick explanation request with `Ctrl+E` (Mac: `⌘+E`)
- **Floating Button**: Explain current subtitle anytime with the 💡 button in the bottom right
- **Enhanced Metadata**: Automatically extract episode title and video duration from Netflix player object
- **Multimodal Analysis**: Video screen capture, extraction of non-verbal expressions (sounds, expressions)


## Build and Installation

### 🛠️ Build Methods

DocentAI supports two build modes.

#### 1. **Production Build** (For Chrome Web Store)
```bash
python build.py --mode prod
```
- Screen capture feature excluded
- Complies with Chrome Web Store policies
- Output: `build/docentai-ui-prod-v1.0.0.zip`

#### 2. **Development Build** (For Hackathon/Manual Installation)
```bash
python build.py --mode dev
```
- 📸 Screen capture feature included
- Additional features: `features/capture/` module
- Output: `build/docentai-ui-dev-v1.0.0.zip`

### 📦 Manual Installation (For Hackathon Review)
You can demonstrate all features using the development build for hackathon submissions.

#### 1. Create Development Build
```bash
python build.py --mode dev
```

#### 2. Load Chrome Extension
1. Navigate to `chrome://extensions/` in Chrome browser
2. Enable **"Developer mode"** in the top right
3. Click **"Load unpacked"**
4. Select the `build/extension/` folder

Or install directly from ZIP file:
1. Extract `build/docentai-ui-dev-v1.0.0.zip`
2. Load the extracted folder using the same method above


### 🎬 Test on Netflix

1. Visit https://www.netflix.com
2. Play a video
3. Click the 💡 button or press `Ctrl+E` shortcut
4. In the action panel:
   - **📸 Screen Capture**: Auto-capture current screen (DEV MODE only)
   - **💡 Request Explanation**: Execute AI analysis


## How to Use

### Request Subtitle Explanation
1. **Keyboard Shortcut**: Press `Ctrl+E` (Mac: `⌘+E`)
2. **Floating Button**: Click the 💡 button in the top right corner

### Settings

Click the Extension icon to open the popup, then click the "⚙️ Settings" button:

- Enable/disable the floating button (keyboard shortcut always available)

## Tech Stack

- **Manifest V3**: Latest Chrome Extension API
- **Vanilla JavaScript**: Pure JavaScript without frameworks
- **CSS**: Inline styles + separate CSS files
- **Chrome Storage API**: Settings storage

## Core Components

### NetflixDetector

Detects Netflix video metadata and extracts subtitles.

**Key Methods:**
- `detectVideo()`: Detect video playback and extract metadata
- `extractVideoIdFromURL()`: Extract videoId from URL
- `getCurrentSubtitle()`: Get currently displayed subtitle text
- `getCurrentTime()`: Get current playback time
- `onSubtitleChange(callback)`: Execute callback when subtitle changes

```javascript
const detector = new NetflixDetector();
const metadata = await detector.detectVideo();
const subtitle = detector.getCurrentSubtitle();
```

### SubtitleCacheManager

Manages subtitle context caching for AI to understand dialogue flow.

**Key Methods:**
- `addSubtitle(text, timestamp)`: Add new subtitle to cache
- `getRecentSubtitles(count)`: Get recent N subtitles
- `clear()`: Clear cache
- `getContextForAPI()`: Get context data for API calls (current + previous subtitles)

```javascript
const cacheManager = new SubtitleCacheManager();
cacheManager.addSubtitle("Previous dialogue", 120.5);
const context = cacheManager.getRecentSubtitles(10);
```

### UIComponents

Creates and manages UI elements.

**Key Methods:**
- `createFloatingButton()`: Create 💡 floating button
- `createActionPanel(selectedText, onExplain)`: Create action panel with image attachment UI
- `createExplanationPanel(text, x, y)`: Create explanation panel
- `updateExplanationPanel(explanation)`: Update panel content
- `captureScreen()`: Capture screen via Background Script (DEV mode only)
- `handleImageFile(file)`: Handle image file upload
- `showImagePreview(dataUrl)`: Show image preview

```javascript
const ui = new UIComponents();
ui.createFloatingButton();
ui.createActionPanel("Current subtitle", async (imageId) => {
  // Request explanation with optional imageId
});
```

### APIClient

Handles backend API communication.

**Key Methods:**
- `registerVideo(metadata)`: Register video for analysis
- `uploadImage(imageData)`: Upload image for multimodal analysis
- `explainSubtitle(data)`: Request subtitle explanation (with optional imageId)
- `getVideoStatus(videoId)`: Check video processing status

```javascript
const apiClient = new APIClient('http://localhost:8001');
const { imageId } = await apiClient.uploadImage(imageBlob);
const explanation = await apiClient.explainSubtitle({
  videoId, currentSubtitle, context, imageId
});
```

## Screenshots

<!-- TODO: Add screenshots here -->

**Action Panel with Image Attachment:**
<!-- Screenshot placeholder -->

**Explanation Panel:**
<!-- Screenshot placeholder -->

**Settings Page:**
<!-- Screenshot placeholder -->

## Platform Support

**Currently Supported:**
- ✅ Netflix

**Planned Support:**
- 🔜 YouTube
- 🔜 Disney+
- 🔜 Wavve

## Language Support

DocentAI currently supports the following languages:
- 🇰🇷 Korean (한국어)
- 🇺🇸 English

The extension automatically detects your browser language and displays UI accordingly.

## Build Mode Comparison

| Feature | Production Build (prod) | Development Build (dev) |
|---------|------------------------|-------------------------|
| Screen Capture | ❌ Disabled | ✅ Enabled |
| Use Case | Chrome Web Store | Hackathon, Demo, Development |
| Output | `build/docentai-ui-prod-v1.0.0.zip` | `build/docentai-ui-dev-v1.0.0.zip` |

### Why Two Build Modes?

Chrome Web Store does not allow screen capture on DRM-protected content (Netflix). Therefore:

- **Production Build (prod)**: Screen capture feature removed for official Chrome Web Store deployment
- **Development Build (dev)**: All features included for hackathon demos and manual installation

### Build Architecture

```
extension/
├── features/
│   └── capture/              # 📸 Capture feature (DEV only)
│       ├── capture-feature.js       # UI extension
│       ├── service-worker-capture.js # Background extension
│       └── imageIO-utils.js         # Image utilities
├── manifest.template.json    # Template (generated during build)
└── ...
```

Build Process:
- `manifest.template.json` → `manifest.json` (flag substitution)
- DEV mode: Includes `features/capture/`
- PROD mode: Excludes `features/capture/`

## Known Issues

### Netflix DRM Protection
- Netflix uses DRM (Digital Rights Management) to block screen capture
- Chrome Extension's `captureVisibleTab` API is blocked in most environments
- **Workaround**: Use 📁 file selection feature to upload separately captured screenshots (Win+Shift+S on Windows, Cmd+Shift+4 on Mac)

### Other Issues
- Subtitle detection may fail if Netflix changes its DOM structure
- Netflix player object may not be immediately available on page load

## Technical Notes

### Boot Pattern for SPA Navigation
DocentAI implements a boot pattern to handle Netflix's Single Page Application (SPA) routing:

- **Global Initialization** (`initGlobal`): Runs once - i18n, instance creation, keyboard shortcuts
- **Video Page Initialization** (`initVideoPage`): Runs on each video page - metadata extraction, subtitle detection, floating button creation
- **SPA Navigation Detection**: History API patching + periodic URL checks (500ms)
- **Duplicate Prevention**: Skips re-initialization for the same videoId

### API Endpoints

**Backend Base URL:** `http://localhost:7777` (configurable in `lib/config.js`)

- `POST /api/video/register`: Register video metadata
- `POST /api/image/upload`: Upload image for multimodal analysis
- `POST /api/explain`: Request subtitle explanation

## For Hackathon Reviewers

This project provides two build modes to comply with Chrome Web Store policies:

1. **For Review**: Use `python build.py --mode dev` to demonstrate full functionality including screen capture
2. **For Production**: Use `python build.py --mode prod` for Chrome Web Store submission

The screen capture feature is fully modularized and isolated in the `features/capture/` folder.
This folder is completely excluded from production builds.

