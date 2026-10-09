# -*- coding: utf-8 -*-
"""把 gen_pages.py 的字段规格导成 JSON，供 e2e 通用填表使用。"""
import io, json, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_pages as G

out = {}
for (side, mod), fs in G.FIELDS.items():
    out.setdefault(side, {})[mod] = [
        # 键名照抄 gen_pages.f()：标签叫 label 不叫 title。
        # （早先这里写 f.get('title')，导出来全是 null，e2e 按标签找字段永远找不着，
        #   表现成「条件必填弹窗列出的字段一个都没认出来」。）
        {'name': f['name'], 'label': f.get('label'), 'kind': f.get('kind'),
         'required': bool(f.get('required')), 'cond': f.get('cond'),
         'default': f.get('default')}
        for f in fs
    ]
json.dump(out, open('fields.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

for side in out:
    for mod, fs in sorted(out[side].items()):
        req = [f['name'] for f in fs if f['required']]
        print('%-7s %-22s 共 %2d 字段，必填 %2d: %s' % (side, mod, len(fs), len(req), ','.join(req)))

# 删除方式不是「按侧」而是「按 (侧,模块)」定的 —— 与 gen_pages_run.build_list 里
# 那三行同源：gated 才给「勾选框 + 批量删除」，否则走行内删除弹窗。
# e2e 要是自己按「普惠=批量、零售=行内」猜，就会在 puhui/non_profit_conversion
# 上等一个根本不存在的行内勾选框（等 30s 超时）。所以这里把判定结果导出去。
# （非两增转回没有禁业开关 → gated=False → 普惠的它也是行内删除。）
modes = {}
for side in out:
    cfg = G.SIDES[side]
    modes[side] = {}
    for mod in out[side]:
        gated = bool(cfg['forbidden'] and G.MODULE_META[mod]['gated'])
        modes[side][mod] = {
            'gated': gated,
            'batch': gated,
            'row': (not gated) and (mod == 'non_profit_conversion' or side == '零售信贷'),
        }
out['_modes'] = modes
json.dump(out, open('fields.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for side in modes:
    for mod, m in sorted(modes[side].items()):
        print('  删除方式 %-7s %-22s %s' % (side, mod, '勾选+批量删除' if m['batch'] else '行内删除'))
