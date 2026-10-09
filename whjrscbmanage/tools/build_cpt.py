# -*- coding: utf-8 -*-
"""把 16 个 jsx 逐个过 display_writer 编译成 cpt，直接落到部署目录。

落点（与页面里 PATH.currentDir 的兜底值必须一致）：
  普惠     busi_center/inclusive_finance_dept/inclusive_mgmt/pages/
  零售信贷 busi_center/Retail_credit_dept/inclusive_mgmt/pages/
"""
import io
import os
import subprocess
import sys

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)

PY = sys.executable
WORKSPACE = os.environ.get('FR_WORKSPACE') or r'C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3'
WRITER = os.path.join(WORKSPACE, 'scripts', 'display', 'display_writer.py')
SRC = r'E:\projects\FineFile\inclusive_mgmt\pages'
REPORTLETS = os.environ.get('FR_REPORTLETS') or \
    r'D:\software\FineReport\FineReport_11.0\webapps\webroot\WEB-INF\reportlets'

SIDES = {
    'puhui': 'busi_center/inclusive_finance_dept/inclusive_mgmt/pages',
    'retail': 'busi_center/Retail_credit_dept/inclusive_mgmt/pages',
}

only = sys.argv[1:]
fails = []
for folder, rel in SIDES.items():
    out_dir = os.path.join(REPORTLETS, rel.replace('/', os.sep))
    os.makedirs(out_dir, exist_ok=True)
    for name in sorted(os.listdir(os.path.join(SRC, folder))):
        if not name.endswith('.jsx'):
            continue
        if only and not any(o in name for o in only):
            continue
        jsx = os.path.join(SRC, folder, name)
        out = os.path.join(out_dir, name[:-4] + '.cpt')
        # 子进程默认继承 GBK 控制台，writer 打印 "▶" 会 UnicodeEncodeError，
        # 强制子进程用 UTF-8（不能改技能包，只能从调用侧给环境变量）
        env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')
        p = subprocess.run([PY, WRITER, '--jsx', jsx, '--output', out],
                           capture_output=True, text=True, encoding='utf-8',
                           errors='replace', env=env)
        tag = 'OK  ' if p.returncode == 0 else 'FAIL'
        print('%s %-14s %-34s %s' % (tag, folder, name[:-4],
                                     os.path.getsize(out) if os.path.exists(out) else '-'))
        body = (p.stdout or '') + (p.stderr or '')
        for line in body.strip().splitlines():
            print('       | ' + line)
        if p.returncode != 0:
            fails.append(jsx)

print()
print('失败 %d 个' % len(fails))
sys.exit(1 if fails else 0)
