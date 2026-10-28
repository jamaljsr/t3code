#!/usr/bin/env bash
# Builds this fork's t3 CLI on a Linux x64 server and installs it over the
# runtime that server's background service runs. Run it on the server from a
# clean checkout of the personal branch. See docs/operations/personal-server.md.
set -euo pipefail

die() {
  echo "error: $*" >&2
  exit 1
}

repo=$(cd "$(dirname "$0")/.." && pwd)
t3_home=${T3CODE_HOME:-$HOME/.t3}
launcher="$HOME/.local/bin/t3"
port=${T3_SERVER_PORT:-3773}
export PATH="$HOME/.vite-plus/bin:$PATH"
cd "$repo"

[ "$(uname -sm)" = "Linux x86_64" ] || die "this script builds linux-x64 only"
command -v vp >/dev/null || die "vp is missing; install it with: curl -fsSL https://vite.plus | bash"
[ -x "$launcher" ] || die "$launcher is missing; install t3 with the official installer first"
[ "$(git branch --show-current)" = personal ] || die "check out the personal branch"
[ -z "$(git status --porcelain)" ] || die "the checkout has local changes"

git pull --ff-only origin personal
version=$(sed -n 's/^  "version": "\(.*\)",$/\1/p' apps/server/package.json)
[ -n "$version" ] || die "could not read the version from apps/server/package.json"
name="t3-$version-linux-x64"
echo "Building $name from $(git rev-parse --short HEAD)"

# Staging lives under T3 home so the final move stays on one filesystem.
work=$(mktemp -d "$t3_home/update-staging.XXXXXX")
trap 'rm -rf "$work"' EXIT

vp i --frozen-lockfile
vp run --filter t3 build
# The release job brands the bundled web client the same way.
vp exec node scripts/apply-web-brand-assets.ts production apps/server/dist/client
# From the repo root, vp runs the Node the root package.json pins, which the
# single executable requires. apps/server alone would select a different Node.
vp exec node apps/server/scripts/cli.ts build-exe

# The resource monitor is a Rust binary. Upstream's archive of the same version
# ships a prebuilt one, so the server needs no Rust toolchain.
curl -fsSL -o "$work/upstream.tar.gz" \
  "https://github.com/pingdotgg/t3code/releases/download/v$version/$name.tar.gz"
tar xzf "$work/upstream.tar.gz" -C "$work" "$name/resource-monitor"
vp exec node scripts/build-cli-archive.ts --platform linux --arch x64 --version "$version" \
  --resource-monitor-dir "$work/$name/resource-monitor" --output-dir "$work/release"
vp exec node scripts/smoke-cli-archive.ts --archive "$work/release/$name.tar.gz" \
  --expect-version "$version"

mkdir -p "$work/stage"
tar xzf "$work/release/$name.tar.gz" -C "$work/stage"
# The service launcher only starts a runtime whose sentinel names its version.
printf '%s\n' "$version" > "$work/stage/$name/.install-complete"
chmod 700 "$work/stage/$name"

active_version() {
  sed -n 's/.*"activeVersion": *"\([^"]*\)".*/\1/p' "$t3_home/runtime/service-state.json"
}

wait_healthy() {
  for _ in $(seq 1 60); do
    [ "$(systemctl --user is-active t3code.service)" = active ] && break
    sleep 1
  done
  # Stay up long enough to rule out a crash loop, then answer HTTP.
  sleep 10
  [ "$(systemctl --user is-active t3code.service)" = active ] &&
    [ "$(systemctl --user show t3code.service -p NRestarts --value)" = 0 ] &&
    curl -fs -o /dev/null "http://127.0.0.1:$port/"
}

previous=$(active_version)
[ -n "$previous" ] || die "could not read the active version from $t3_home/runtime/service-state.json"
target="$t3_home/runtime/versions/$version"
backup=""
if [ -e "$target" ]; then
  backup="$t3_home/runtime-backups/$version-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$t3_home/runtime-backups"
  mv "$target" "$backup"
  echo "Previous $version runtime moved to $backup"
fi
mv "$work/stage/$name" "$target"

# Point the service and the t3 launcher at a runtime and start it. Restart and
# install exit non-zero when the runtime fails to start, so the health check
# decides whether to roll back.
activate() {
  local runtime_version=$1
  shift
  if [ "$(active_version)" = "$runtime_version" ]; then
    "$launcher" service restart || true
  else
    # Install rewrites the unit and the service state to this runtime's version.
    "$t3_home/runtime/versions/$runtime_version/t3" service install --base-dir "$t3_home" "$@" || true
    ln -sfn "$t3_home/runtime/versions/$runtime_version/t3" "$launcher"
  fi
}

[ "$previous" = "$version" ] || echo "Moving the service from $previous to $version"
activate "$version"
if wait_healthy; then
  echo "t3 $version from $(git rev-parse --short HEAD) is running"
  exit 0
fi

echo "The new runtime did not come up; returning to the previous runtime" >&2
rm -rf "$target"
[ -z "$backup" ] || mv "$backup" "$target"
systemctl --user reset-failed t3code.service || true
activate "$previous" --allow-downgrade
wait_healthy || die "the previous runtime is not healthy either; check ~/.t3/userdata/logs/boot-service.log"
die "rolled back to t3 $previous"
