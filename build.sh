#!/bin/bash

# QuadTV - Firefox Extension Build Script
# Creates a distributable .zip package for AMO submission

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  QuadTV - Build Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get version from manifest
VERSION=$(grep -o '"version": "[^"]*' src/manifest.json | cut -d'"' -f4)
echo -e "${GREEN}Version: ${VERSION}${NC}"
echo ""

# Define build directory and output filename
BUILD_DIR="build"
DIST_DIR="dist"
OUTPUT_FILE="quadtv-${VERSION}.zip"
OUTPUT_PATH="${DIST_DIR}/${OUTPUT_FILE}"

# Clean previous builds
echo -e "${YELLOW}→ Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
mkdir -p "${DIST_DIR}"

# Stamp the build with commit info
node scripts/generate-build-info.js

# Copy source files to build directory
echo -e "${YELLOW}→ Copying source files...${NC}"

# Copy src directory structure
cp -r src/background "${BUILD_DIR}/"
cp -r src/content "${BUILD_DIR}/"
cp -r src/popup "${BUILD_DIR}/"
cp -r src/shared "${BUILD_DIR}/"
cp src/manifest.json "${BUILD_DIR}/"

# Copy only required icon files
mkdir -p "${BUILD_DIR}/icons"
cp src/icons/icon-16.png "${BUILD_DIR}/icons/"
cp src/icons/icon-32.png "${BUILD_DIR}/icons/"
cp src/icons/icon-48.png "${BUILD_DIR}/icons/"
cp src/icons/icon-96.png "${BUILD_DIR}/icons/"

echo -e "${GREEN}  ✓ Copied extension files${NC}"

# Verify required files exist
echo -e "${YELLOW}→ Verifying package contents...${NC}"

REQUIRED_FILES=(
  "manifest.json"
  "background/backgroundController.js"
  "content/contentScript.js"
  "content/uiManager.js"
  "content/quadtv.css"
  "popup/popup.html"
  "popup/popup.js"
  "popup/popup.css"
  "shared/messageBus.js"
  "shared/layoutEngine.js"
  "shared/storageManager.js"
  "shared/buildInfo.js"
  "shared/buildLabel.js"
  "icons/icon-16.png"
  "icons/icon-32.png"
  "icons/icon-48.png"
  "icons/icon-96.png"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "${BUILD_DIR}/${file}" ]; then
    echo -e "${RED}  ✗ Missing: ${file}${NC}"
    ALL_PRESENT=false
  fi
done

if [ "$ALL_PRESENT" = true ]; then
  echo -e "${GREEN}  ✓ All required files present${NC}"
else
  echo -e "${RED}Error: Missing required files${NC}"
  exit 1
fi

# Create zip package
echo -e "${YELLOW}→ Creating package...${NC}"
cd "${BUILD_DIR}"
zip -r "../${OUTPUT_PATH}" . -q

cd ..
FILE_SIZE=$(du -h "${OUTPUT_PATH}" | cut -f1)
echo -e "${GREEN}  ✓ Package created: ${OUTPUT_PATH} (${FILE_SIZE})${NC}"

# Verify zip contents
echo -e "${YELLOW}→ Verifying package...${NC}"
MANIFEST_CHECK=$(unzip -l "${OUTPUT_PATH}" | grep -c "manifest.json" || true)
if [ "$MANIFEST_CHECK" -eq 1 ]; then
  echo -e "${GREEN}  ✓ Package verified${NC}"
else
  echo -e "${RED}  ✗ Package verification failed${NC}"
  exit 1
fi

# Clean up build directory
echo -e "${YELLOW}→ Cleaning up...${NC}"
rm -rf "${BUILD_DIR}"
echo -e "${GREEN}  ✓ Cleanup complete${NC}"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Build successful!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Package: ${GREEN}${OUTPUT_PATH}${NC}"
echo -e "Size: ${GREEN}${FILE_SIZE}${NC}"
echo -e "Version: ${GREEN}${VERSION}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the package by loading it in Firefox"
echo "2. Review the contents:"
echo -e "   ${BLUE}unzip -l ${OUTPUT_PATH}${NC}"
echo "3. Submit to addons.mozilla.org"
echo ""
