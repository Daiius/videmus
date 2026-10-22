#!/bin/bash
# resource-server / media-server の本番イメージをビルドして ghcr に push する。
# 事前に ghcr.io へ docker login しておく（write:packages）。
#
#   ./scripts/push-images.sh                 # 両方
#   ./scripts/push-images.sh media-server    # 片方だけ
set -euo pipefail

cd "$(dirname "$0")/.."

# :<sha> のタグがコミットと一致するよう、未コミットの変更があれば止める
if [ -n "$(git status --porcelain)" ]; then
  echo "未コミットの変更があります。コミットしてから実行してください" >&2
  exit 1
fi
sha=$(git rev-parse HEAD)

services=("$@")
[ ${#services[@]} -eq 0 ] && services=(resource-server media-server)

for s in "${services[@]}"; do
  image=ghcr.io/daiius/videmus-$s
  echo "### $image ($sha)"
  docker build --pull --push \
    -t "$image:latest" -t "$image:$sha" \
    -f "$s/Dockerfile.$s.prod" .
done
