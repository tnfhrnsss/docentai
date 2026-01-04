#!/usr/bin/env python3
import os
import shutil
import zipfile
from pathlib import Path

print('Building DocentAi Chrome Extension...')

build_dir = 'build'
if os.path.exists(build_dir):
    shutil.rmtree(build_dir)
os.makedirs(build_dir)

files_to_copy = [
    'extension/manifest.json',
    'extension/popup/popup.html',
    'extension/popup/popup.js',
    'extension/popup/popup.css'
]

for file in files_to_copy:
    source_path = file
    dest_path = os.path.join(build_dir, file)
    
    if os.path.exists(source_path):
        dest_dir = os.path.dirname(dest_path)
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir, exist_ok=True)

        shutil.copy2(source_path, dest_path)
        print(f"✓ Copied: {file}")
    else:
        print(f"✗ Missing: {file}")

print('\nBuild completed successfully!')
print('Extension files are ready in the "build" directory.')
print('You can now load the extension in Chrome from the build directory.')

# Create ZIP file automatically
print('\nCreating ZIP file for distribution...')
zip_filename = 'docentai-ui-v1.0.0.zip'

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(build_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, build_dir)
            zipf.write(file_path, arcname)
            print(f"✓ Added to ZIP: {arcname}")

print(f'\n✓ ZIP file created: {zip_filename}')
print('This ZIP file can be uploaded to the Chrome Web Store or distributed manually.')
