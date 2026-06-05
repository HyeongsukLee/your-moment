#!/bin/bash
# 프리뷰 도구가 node 20을 쓰도록 PATH를 강제하는 dev 래퍼
export PATH="/Users/hobylee/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
exec npm run dev
