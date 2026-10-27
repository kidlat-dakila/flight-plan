#!/usr/bin/env bash
set -euo pipefail

readonly PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.64.1-noble"
readonly IMAGE_PLATFORM="linux/amd64"
readonly PNPM_VERSION="12.9.1"
readonly PNPM_STORE_VOLUME="flightplan-e2e-pnpm-store"
readonly PROJECT="tools/trace-diagram-lab-e2e"

workspace="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
screenshots="$workspace/$PROJECT/src/__screenshots__"
test_output="$workspace/$PROJECT/test-output"
mkdir -p "$screenshots" "$test_output"

if ! docker info > /dev/null 2>&1; then
  echo "The Trace Diagram screenshots run in Docker. Start Docker Desktop and run the command again." >&2
  exit 1
fi

read -r -d '' run_inside << 'INSIDE' || true
set -euo pipefail
mkdir -p /work
tar -C /source \
  --exclude=./.git --exclude='*/node_modules' --exclude=./node_modules --exclude=./dist --exclude=./.nx \
  --exclude="./$PROJECT/test-output" --exclude="./$PROJECT/src/__screenshots__" \
  -cf - . | tar -C /work -xf -
ln -s /screenshots "/work/$PROJECT/src/__screenshots__"
ln -s /test-output "/work/$PROJECT/test-output"
cd /work
npm install --global --silent "pnpm@$PNPM_VERSION"
pnpm config set store-dir /pnpm-store > /dev/null
HUSKY=0 pnpm install --frozen-lockfile --reporter=silent
NX_DAEMON=false NX_NO_CLOUD=true pnpm exec nx run trace-diagram-lab-e2e:e2e-native --skip-nx-cache "$@"
INSIDE

docker run --rm --init --ipc=host --platform "$IMAGE_PLATFORM" \
  --volume "$workspace:/source:ro" \
  --volume "$screenshots:/screenshots" \
  --volume "$test_output:/test-output" \
  --volume "$PNPM_STORE_VOLUME:/pnpm-store" \
  --env PROJECT="$PROJECT" \
  --env PNPM_VERSION="$PNPM_VERSION" \
  "$PLAYWRIGHT_IMAGE" \
  bash -c "$run_inside" e2e-in-docker "$@"
