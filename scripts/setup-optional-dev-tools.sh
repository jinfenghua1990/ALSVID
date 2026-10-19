#!/usr/bin/env bash
set -euo pipefail

# Run manually inside the shared ALSVID GitHub Codespace.
# Never invoked by production builds, GitHub Actions, or postCreateCommand.
if [[ "${CODESPACES:-false}" != "true" ]]; then
  echo "Run this installer inside the shared ALSVID GitHub Codespace only." >&2
  exit 1
fi

usage() {
  echo "Usage: bash scripts/setup-optional-dev-tools.sh {skills|memory|video|all}"
  echo "Skills=Superpowers for Codex CLI; memory=Claude-Mem local observer; video=HyperFrames CLI."
}
if [[ $# -ne 1 ]]; then usage; exit 2; fi
target="$1"
case "$target" in skills|memory|video|all) ;; *) usage; exit 2 ;; esac

install_skills() {
  local source="$HOME/.codex/superpowers"
  local link="$HOME/.agents/skills/superpowers"
  if [[ -d "$source/.git" ]]; then
    git -C "$source" pull --ff-only
  elif [[ -e "$source" ]]; then
    echo "Existing non-Git directory at $source; not overwriting." >&2
    return 1
  else
    mkdir -p "$(dirname "$source")"
    git clone --depth 1 https://github.com/obra/superpowers.git "$source"
  fi
  mkdir -p "$(dirname "$link")"
  if [[ -L "$link" ]]; then
    [[ "$(readlink "$link")" == "$source/skills" ]] || { echo "Different skills symlink exists; refusing to replace." >&2; return 1; }
  elif [[ -e "$link" ]]; then
    echo "Existing skills path at $link; refusing to replace." >&2
    return 1
  else
    ln -s "$source/skills" "$link"
  fi
  [[ -f "$link/using-superpowers/SKILL.md" ]] || { echo "Superpowers skill discovery failed." >&2; return 1; }
  echo "Superpowers skills installed for agents supporting ~/.agents/skills; restart the agent."
}

install_memory() {
  echo "Claude-Mem stores agent observations in this Codespace. Do not feed credentials or customer records."
  echo "Selecting the local observer avoids opting in to its hosted memory service by default."
  npx --yes claude-mem install --provider host
  npx --yes claude-mem doctor
  echo "Claude-Mem setup ran; restart a supported agent and verify a new-session memory recall."
}

install_video() {
  if ! command -v ffmpeg >/dev/null 2>&1; then
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
  fi
  local prefix="$HOME/.local/share/alsvid-cli"
  local target_bin="$prefix/node_modules/.bin/hyperframes"
  local link="$HOME/.local/bin/hyperframes"
  npm install --prefix "$prefix" hyperframes@0.1.5
  mkdir -p "$(dirname "$link")"
  if [[ -e "$link" && ! -L "$link" ]]; then
    echo "Existing executable at $link; not overwriting." >&2
    return 1
  fi
  ln -sfn "$target_bin" "$link"
  "$link" --help >/dev/null
  echo "HyperFrames installed at $link (CLI only; no rendered video was generated)."
}

if [[ "$target" == skills || "$target" == all ]]; then install_skills; fi
if [[ "$target" == memory || "$target" == all ]]; then install_memory; fi
if [[ "$target" == video || "$target" == all ]]; then install_video; fi

echo "Selected Codespace tooling setup finished; inspect outputs above for any host-specific setup needed."
