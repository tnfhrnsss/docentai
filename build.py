#!/usr/bin/env python3
"""
DocentAI Chrome Extension 빌드 스크립트

Usage:
    python build.py --mode dev   # 개발 빌드 (화면 캡처 기능 포함)
    python build.py --mode prod  # 프로덕션 빌드 (화면 캡처 제외, Chrome Web Store용)
"""

import os
import sys
import shutil
import zipfile
import json
import argparse
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description='DocentAI Extension 빌드')
    parser.add_argument('--mode', choices=['dev', 'prod'], default='prod',
                        help='빌드 모드 (dev: 화면 캡처 포함, prod: 화면 캡처 제외)')
    return parser.parse_args()

def clean_build_dir():
    """빌드 디렉토리 초기화"""
    build_dir = 'build/extension'
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir, exist_ok=True)
    return build_dir

def copy_directory(src, dest, exclude_patterns=None):
    """디렉토리 복사 (제외 패턴 지원)"""
    exclude_patterns = exclude_patterns or []

    if not os.path.exists(src):
        return

    os.makedirs(dest, exist_ok=True)

    for item in os.listdir(src):
        # 제외 패턴 확인
        if any(pattern in item for pattern in exclude_patterns):
            continue

        src_path = os.path.join(src, item)
        dest_path = os.path.join(dest, item)

        if os.path.isdir(src_path):
            copy_directory(src_path, dest_path, exclude_patterns)
        else:
            shutil.copy2(src_path, dest_path)

def copy_file(src, dest):
    """파일 복사"""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(src, dest)

def generate_config(mode, build_dir):
    """빌드 모드에 따라 config.js 생성"""
    template_path = 'extension/lib/config.template.js'

    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    # API URL 설정
    api_url = 'https://docentai-api-1064006289042.asia-northeast3.run.app'

    # 플레이스홀더 치환
    config_content = template.replace('{{API_URL}}', api_url)
    config_content = config_content.replace('{{BUILD_MODE}}', mode)

    # 생성된 config.js 저장
    config_path = os.path.join(build_dir, 'lib/config.js')
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(config_content)

    print(f'✓ Generated lib/config.js (mode: {mode}, API: {api_url})')

def generate_manifest(mode, build_dir):
    """빌드 모드에 따라 manifest.json 생성"""
    template_path = 'extension/manifest.template.json'

    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    if mode == 'dev':
        # 개발 모드: 화면 캡처 기능 포함
        template = template.replace('{{CAPTURE_PERMISSIONS}}', '')
        template = template.replace('{{CAPTURE_HOST_PERMISSIONS}}', ',\n    "<all_urls>"')
        template = template.replace('{{CAPTURE_UTILS}}', ',\n        "features/capture/imageIO-utils.js"')
        template = template.replace('{{CAPTURE_FEATURE}}', ',\n        "features/capture/capture-feature.js"')
    else:
        # 프로덕션 모드: 화면 캡처 제외
        template = template.replace('{{CAPTURE_PERMISSIONS}}', '')
        template = template.replace('{{CAPTURE_HOST_PERMISSIONS}}', '')
        template = template.replace('{{CAPTURE_UTILS}}', '')
        template = template.replace('{{CAPTURE_FEATURE}}', '')

    # 생성된 manifest.json 저장
    manifest_path = os.path.join(build_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        f.write(template)

    print(f'✓ Generated manifest.json (mode: {mode})')

def merge_service_worker(mode, build_dir):
    """Service Worker 파일 병합 (dev 모드일 때만 캡처 로직 추가)"""
    base_sw = 'extension/background/service-worker.js'
    capture_sw = 'extension/features/capture/service-worker-capture.js'
    output_sw = os.path.join(build_dir, 'background/service-worker.js')

    os.makedirs(os.path.dirname(output_sw), exist_ok=True)

    with open(base_sw, 'r', encoding='utf-8') as f:
        content = f.read()

    if mode == 'dev' and os.path.exists(capture_sw):
        # dev 모드: 캡처 로직 추가
        with open(capture_sw, 'r', encoding='utf-8') as f:
            capture_content = f.read()
        content += '\n\n' + capture_content
        print('✓ Merged service-worker-capture.js (DEV MODE)')

    with open(output_sw, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'✓ Generated background/service-worker.js')

def build(mode):
    """메인 빌드 함수"""
    print(f'\n🚀 Building DocentAI Chrome Extension (mode: {mode})...\n')

    # 1. 빌드 디렉토리 초기화
    build_dir = clean_build_dir()

    # 2. Config 생성 (환경 설정)
    generate_config(mode, build_dir)

    # 3. manifest.json 생성
    generate_manifest(mode, build_dir)

    # 4. Service Worker 병합
    merge_service_worker(mode, build_dir)

    # 5. 공통 파일 복사
    files_to_copy = [
        # Popup
        ('extension/popup', f'{build_dir}/popup'),
        # Options
        ('extension/options', f'{build_dir}/options'),
        # Assets
        ('extension/assets', f'{build_dir}/assets'),
        # Language files
        ('extension/lang', f'{build_dir}/lang'),
        # Content Scripts
        ('extension/content/netflix-detector.js', f'{build_dir}/content/netflix-detector.js'),
        ('extension/content/subtitle-cache.js', f'{build_dir}/content/subtitle-cache.js'),
        ('extension/content/ui-components.js', f'{build_dir}/content/ui-components.js'),
        ('extension/content/content.js', f'{build_dir}/content/content.js'),
        ('extension/content/styles.css', f'{build_dir}/content/styles.css'),
    ]

    for src, dest in files_to_copy:
        if os.path.isdir(src):
            copy_directory(src, dest)
            print(f'✓ Copied directory: {src}')
        elif os.path.exists(src):
            copy_file(src, dest)
            print(f'✓ Copied file: {src}')
        else:
            print(f'✗ Missing: {src}')

    # Library 파일 복사 (config.template.js 제외)
    copy_directory('extension/lib', f'{build_dir}/lib', exclude_patterns=['config.template.js'])
    print(f'✓ Copied directory: extension/lib (excluded: config.template.js)')

    # 6. 빌드 모드별 추가 파일
    if mode == 'dev':
        # 개발 모드: 캡처 기능 파일 포함
        capture_files = [
            ('extension/features/capture/imageIO-utils.js',
             f'{build_dir}/features/capture/imageIO-utils.js'),
            ('extension/features/capture/capture-feature.js',
             f'{build_dir}/features/capture/capture-feature.js'),
        ]

        for src, dest in capture_files:
            if os.path.exists(src):
                copy_file(src, dest)
                print(f'✓ Copied (DEV): {src}')

        print('\n📸 Screen capture feature enabled (DEV MODE)')
    else:
        print('\n🚫 Screen capture feature disabled (PROD MODE)')

    # 7. ZIP 파일 생성
    create_zip(mode, build_dir)

    print(f'\n✅ Build completed successfully!')
    print(f'📦 Build output: {build_dir}/')
    print(f'   You can now load this directory in Chrome (chrome://extensions/)')

def create_zip(mode, build_dir):
    """배포용 ZIP 파일 생성"""
    version = '1.0.0'
    zip_filename = f'build/docentai-ui-{mode}-v{version}.zip'

    print(f'\n📦 Creating ZIP file: {zip_filename}')

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, build_dir)
                zipf.write(file_path, arcname)
                print(f'  ✓ Added: {arcname}')

    print(f'\n✅ ZIP file created: {zip_filename}')

    if mode == 'prod':
        print('   This ZIP can be uploaded to Chrome Web Store')
    else:
        print('   This ZIP is for manual installation (DEV MODE)')

if __name__ == '__main__':
    args = parse_args()
    build(args.mode)
