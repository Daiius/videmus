#!/bin/bash
# resource-server / media-server のイメージをビルドして ghcr に push する（Actions が使えないとき・枝のイメージを作るとき）。
# 付けるタグはコミットの SHA（40 桁）だけ。
# ⚠ latest は付けない。latest は本番が追いかけるタグで、追従が有効なら push した瞬間に本番に出る。
#   latest を動かすのは workflow（.github/workflows/build-push-images.yml の job「promote」）だけ（AGENTS.md・prd/02 §3.1）。
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
# ビルドの版（GET /version が返す。prd/05 §4）。日時は UTC。
# 上で未コミットの変更が無いことを確かめているので dirty は常に false
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

services=("$@")
[ ${#services[@]} -eq 0 ] && services=(resource-server media-server)

for s in "${services[@]}"; do
  image=ghcr.io/daiius/videmus-$s
  echo "### $image ($sha)"
  docker build --pull --push \
    -t "$image:$sha" \
    --build-arg GIT_COMMIT="$sha" \
    --build-arg BUILD_TIME="$built_at" \
    --build-arg GIT_DIRTY=false \
    -f "$s/Dockerfile.$s.prod" .
done
