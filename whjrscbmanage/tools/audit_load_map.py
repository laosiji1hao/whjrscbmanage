# -*- coding: utf-8 -*-
"""审计：各表单页的**字段名** vs 详情数据集 *_get 返回的**列名**。

load_map_js 是按 `v[字段名] = d[字段名]` 回填的，所以两者不一致的字段
在「详情/修改」弹窗里永远是空的 —— 若它同时还必填，用户点「修改」就
毫无反应（antd validateFields 拒了，而 handleSubmit 的 .catch 静默吞掉）。
这里把全部不一致列出来，别只修看见的那一个。
"""
import io, json, re, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_pages as G

TASK = {'普惠': '../docs/dev_task_普惠.json', '零售信贷': '../docs/dev_task_零售信贷.json'}

# 详情页由 JS 手工补映射的字段（见 gen_pages_run.load_map_js）——不算问题，但要看见
JS_MAPPED = {('零售信贷', 'cust_chinese_name'): 'customer_name'}

bad = 0
for side, path in TASK.items():
    d = json.load(open(path, encoding='utf-8'))
    for p in d['pages']:
        if p.get('type') != 'form':
            continue
        mod = p['name'][:-len('_form')]
        ds = next((x for x in p['datasets_all'] if x['name'] == mod + '_get'), None) \
            if 'datasets_all' in p else None
        if ds is None:  # 数据集定义在别处，退化成全文件搜
            t = open(path, encoding='utf-8').read()
            m = re.search(r'"name": "%s_get",.*?"sql": "(.*?)",\n' % mod, t, re.S)
            # 直接抠出来的是 JSON 里的**转义**文本：SQL 的换行是字面的 `\n` 两个字符，
            # 不还原的话 `\s+FROM\s` 匹配不上（\s 匹配不了反斜杠），列清单会解析成空。
            sql = (m.group(1).replace('\\n', '\n').replace('\\"', '"')) if m else ''
        else:
            sql = ds.get('sql', '')
        # SELECT 与 FROM 之间的列清单
        m = re.search(r'SELECT\s+(.*?)\s+FROM\s', sql, re.S | re.I)
        cols = set()
        for part in (m.group(1).split(',') if m else []):
            part = part.strip()
            alias = re.search(r'\s+AS\s+(\w+)\s*$', part, re.I)
            if alias:
                cols.add(alias.group(1))
            elif '.' in part:
                cols.add(part.split('.')[-1].strip('`'))
            elif part:
                cols.add(part.strip('`'))

        fields = [f['name'] for f in G.FIELDS[(side, mod)]]
        miss = [n for n in fields if n not in cols]
        print('\n── %s / %s：表单 %d 字段，_get 返回 %d 列' % (side, mod, len(fields), len(cols)))
        if not miss:
            print('     ✔ 字段名与列名完全对齐')
            continue
        for n in miss:
            fld = next(f for f in G.FIELDS[(side, mod)] if f['name'] == n)
            hit = JS_MAPPED.get((side, n))
            if hit and hit in cols:
                print('     ⚠ %-24s 靠 JS 手工映射 ← %s（已处理，但属于隐式契约）' % (n, hit))
            else:
                bad += 1
                print('     ✘ %-24s 必填=%s —— _get 里没有同名列，详情回填必然为空'
                      % (n, '是' if fld.get('required') else '否'))
print('\n不一致且未处理的字段数：%d' % bad)
