#!/usr/bin/env bash
set -euo pipefail

# TerminallySKILL Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/cryptopoly/TerminallySkill/staging/install.sh | bash

REPO="cryptopoly/TerminallySkill"
APP_NAME="TerminallySKILL"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}${BOLD}>${NC} $1"; }
ok()    { echo -e "${GREEN}${BOLD}✓${NC} $1"; }
fail()  { echo -e "${RED}${BOLD}✗${NC} $1"; exit 1; }

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Darwin)  echo "mac" ;;
    Linux)   echo "linux" ;;
    *)       fail "Unsupported operating system: $(uname -s). Please download manually from https://github.com/$REPO/releases" ;;
  esac
}

# Detect architecture
detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)    echo "x64" ;;
    aarch64|arm64)   echo "arm64" ;;
    *)               fail "Unsupported architecture: $(uname -m)" ;;
  esac
}

# Get latest release info from GitHub API
get_latest_release() {
  local url="https://api.github.com/repos/$REPO/releases/latest"
  if command -v curl &>/dev/null; then
    curl -fsSL "$url"
  elif command -v wget &>/dev/null; then
    wget -qO- "$url"
  else
    fail "Neither curl nor wget found. Please install one and try again."
  fi
}

# Download a file
download() {
  local url="$1" dest="$2"
  info "Downloading from $url"
  if command -v curl &>/dev/null; then
    curl -fSL --progress-bar -o "$dest" "$url"
  else
    wget --show-progress -qO "$dest" "$url"
  fi
}

# Find the right asset URL from release JSON
find_asset() {
  local json="$1" pattern="$2"
  echo "$json" | grep -o '"browser_download_url":\s*"[^"]*'"$pattern"'[^"]*"' | head -1 | sed 's/"browser_download_url":\s*"//;s/"$//'
}

# Get version from release JSON
get_version() {
  echo "$1" | grep -o '"tag_name":\s*"[^"]*"' | head -1 | sed 's/"tag_name":\s*"//;s/"$//'
}

# Install on macOS
install_mac() {
  local arch="$1" json="$2"
  local url
  url=$(find_asset "$json" "${APP_NAME}-.*-${arch}\\.dmg")

  if [ -z "$url" ]; then
    fail "Could not find macOS ${arch} DMG in the latest release. Check https://github.com/$REPO/releases"
  fi

  local tmpdir
  tmpdir=$(mktemp -d)
  trap "rm -rf '$tmpdir'" EXIT

  local dmg_path="$tmpdir/$APP_NAME.dmg"
  download "$url" "$dmg_path"

  info "Mounting disk image..."
  local mount_point
  mount_point=$(hdiutil attach "$dmg_path" -nobrowse -quiet | grep -o '/Volumes/.*' | head -1)

  if [ -z "$mount_point" ]; then
    fail "Failed to mount DMG"
  fi

  info "Installing to /Applications..."
  local app_path="$mount_point/${APP_NAME}.app"
  if [ ! -d "$app_path" ]; then
    # Try finding any .app in the volume
    app_path=$(find "$mount_point" -maxdepth 1 -name "*.app" -print -quit)
  fi

  if [ -z "$app_path" ] || [ ! -d "$app_path" ]; then
    hdiutil detach "$mount_point" -quiet 2>/dev/null || true
    fail "Could not find .app bundle in DMG"
  fi

  # Remove old version if exists
  rm -rf "/Applications/${APP_NAME}.app" 2>/dev/null || true
  cp -R "$app_path" /Applications/

  hdiutil detach "$mount_point" -quiet 2>/dev/null || true

  ok "Installed ${APP_NAME}.app to /Applications"
  info "You can now launch it from your Applications folder or Spotlight."
}

# Install on Linux
install_linux() {
  local arch="$1" json="$2"

  # Prefer .deb on Debian/Ubuntu, otherwise AppImage
  if command -v dpkg &>/dev/null && command -v apt-get &>/dev/null; then
    install_linux_deb "$arch" "$json"
  else
    install_linux_appimage "$arch" "$json"
  fi
}

install_linux_deb() {
  local arch="$1" json="$2"
  local deb_arch="$arch"
  # .deb files may use amd64 instead of x64
  local url
  url=$(find_asset "$json" "${APP_NAME}-.*-${arch}\\.deb")
  if [ -z "$url" ]; then
    url=$(find_asset "$json" "${APP_NAME}-.*amd64\\.deb")
  fi

  if [ -z "$url" ]; then
    info "No .deb package found, falling back to AppImage..."
    install_linux_appimage "$arch" "$json"
    return
  fi

  local tmpdir
  tmpdir=$(mktemp -d)
  trap "rm -rf '$tmpdir'" EXIT

  local deb_path="$tmpdir/$APP_NAME.deb"
  download "$url" "$deb_path"

  info "Installing .deb package (may require sudo)..."
  if [ "$(id -u)" -eq 0 ]; then
    dpkg -i "$deb_path" || apt-get install -f -y
  else
    sudo dpkg -i "$deb_path" || sudo apt-get install -f -y
  fi

  ok "Installed $APP_NAME via .deb package"
  info "You can now launch it from your application menu or run: terminallyskill"
}

install_linux_appimage() {
  local arch="$1" json="$2"
  local url
  url=$(find_asset "$json" "${APP_NAME}-.*-${arch}\\.AppImage")
  # The x64 AppImage is named x86_64
  if [ -z "$url" ] && [ "$arch" = "x64" ]; then
    url=$(find_asset "$json" "${APP_NAME}-.*-x86_64\\.AppImage")
  fi

  if [ -z "$url" ]; then
    fail "Could not find a Linux ${arch} AppImage in the latest release (arm64 is released as a .deb only). Check https://github.com/$REPO/releases"
  fi

  local install_dir="$HOME/.local/bin"
  mkdir -p "$install_dir"

  local appimage_path="$install_dir/$APP_NAME.AppImage"
  download "$url" "$appimage_path"
  chmod +x "$appimage_path"

  ok "Installed to $appimage_path"

  # Check if ~/.local/bin is in PATH
  if ! echo "$PATH" | grep -q "$install_dir"; then
    info "Add ~/.local/bin to your PATH to run from anywhere:"
    echo -e "  ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
  fi

  info "Run with: $appimage_path"
}

# Main
main() {
  echo ""
  echo -e "${CYAN}${BOLD}  >_ ${APP_NAME} Installer${NC}"
  echo ""

  local os arch
  os=$(detect_os)
  arch=$(detect_arch)
  info "Detected: ${os} ${arch}"

  info "Fetching latest release..."
  local release_json
  release_json=$(get_latest_release)

  local version
  version=$(get_version "$release_json")
  info "Latest version: ${version}"

  case "$os" in
    mac)   install_mac "$arch" "$release_json" ;;
    linux) install_linux "$arch" "$release_json" ;;
  esac

  echo ""
  ok "Done! Thanks for installing ${APP_NAME}."
  echo ""
}

main "$@"
