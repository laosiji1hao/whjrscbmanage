# 构建：pages/*.jsx → pages/*.mjs + pages/*.cpt（部署到挂载目录 reportlets/busi_center/Finance_market_dept/whjrscbmange/）
# 用法：bash tools/build_pages.sh [page...]     （不给参数则全部；参数为页面名子串）
set -e
cd "$(dirname "$0")/.."
WS="${FR_WORKSPACE:-C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3}"
WRITER="$WS/scripts/display/display_writer.py"
REPORTLETS="${FR_REPORTLETS:-D:/software/FineReport/FineReport_11.0/webapps/webroot/WEB-INF/reportlets}"
MOUNT="busi_center/Finance_market_dept/whjrscbmange"
DEPLOY="$REPORTLETS/$MOUNT/pages"
DATA_DEPLOY="$REPORTLETS/$MOUNT/data"
PY="${FR_PY:-/c/Users/asus/AppData/Local/Programs/Python/Python312/python.exe}"
mkdir -p "$DEPLOY" "$DATA_DEPLOY"

# 1. 合并 prelude -> page.jsx
node tools/gen_pages.js "$@"

# 2. 逐个编译 + 部署
for jsx in pages/*.jsx; do
  name="$(basename "$jsx" .jsx)"
  if [ -n "$1" ]; then
    hit=0
    for a in "$@"; do if echo "$name" | grep -q "$a"; then hit=1; break; fi; done
    if [ "$hit" = "0" ]; then continue; fi
  fi
  echo "=== $name ==="
  # mjs（esbuild 产物，随交付物保存）
  npx esbuild "$jsx" --bundle --format=iife --charset=utf8 --outfile="pages/$name.mjs" >/dev/null 2>&1
  # cpt（display_writer：esbuild 编译 + 去注释 + Hook 解构 + 注入底座 + 质量门）
  PYTHONIOENCODING=utf-8 PYTHONUTF8=1 "$PY" "$WRITER" --jsx "$jsx" --output "$DEPLOY/$name.cpt"
  cp "$DEPLOY/$name.cpt" "pages/$name.cpt"
done

# 3. 注入云平台模板参数（cloudUrl/prjId/fine_username）
node tools/inject_params.js "$DEPLOY"

# 4. 数据层 cpt 同步到挂载目录（/api/data report_path 由页面 reportName 推导，必须同目录树）
cp data/whjrscbmanage_data.cpt "$DATA_DEPLOY/whjrscbmanage_data.cpt"

echo "构建完成 → $DEPLOY"