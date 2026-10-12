#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""业务唯一键改造：把数据层按 id 解析改为按 biz_uuid 解析，列表取数补 biz_uuid 列。
作用于 docs/dev_task.json 与 data/whjrscbmanage_data.cpt（SQL 文本一致，做同样的替换）。
用法：python apply_bizuid.py   （随后 build_pages.sh 会同步 data cpt；本脚本直接同步挂载目录 data cpt）
"""
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DT = os.path.join(ROOT, 'docs', 'dev_task.json')
DC = os.path.join(ROOT, 'data', 'whjrscbmanage_data.cpt')
MOUNT = r"D:\software\FineReport\FineReport_11.0\webapps\webroot\WEB-INF\reportlets\busi_center\Finance_market_dept\whjrscbmange\data\whjrscbmanage_data.cpt"

# (旧, 新) —— SQL 内的条件/列名替换（两个文件相同的 SQL 文本都命中）
REPL = [
    ("id = '${p_id}'", "biz_uuid = '${p_biz_uuid}'"),          # get_business
    ("bbb.id = '${p_id}'", "bbb.biz_uuid = '${p_biz_uuid}'"),  # schedule_of_business
    ('name="p_id"', 'name="p_biz_uuid"'),                       # cpt 的 dataset 参数名
    ('"name": "p_id"', '"name": "p_biz_uuid"'),                 # dev_task.json 参数名
    ("'${p_id}'", "'${p_biz_uuid}'"),                           # 条件值
    ("SELECT b.id, b.bond_code,", "SELECT b.id, b.biz_uuid, b.bond_code,"),  # 列表补 biz_uuid 列(declare/pool)
]

def apply(path, label):
    with open(path, encoding='utf-8') as f:
        s = f.read()
    hit = 0
    for old, new in REPL:
        if old in s:
            hit += 1
            s = s.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    print(label, '已替换', hit, '组模式')

apply(DT, 'dev_task.json')
apply(DC, 'data cpt')
try:
    shutil.copy(DC, MOUNT)
    print('已同步挂载目录 data cpt')
except Exception as e:
    print('同步挂载目录失败:', e)

# 校验
s = open(DC, encoding='utf-8').read()
print('biz_uuid 相关命中数:', s.count('biz_uuid'), '| 残留 p_id?', 'p_id' in s)
print('残留 id = ?', ("id = '${p_id}'" in s) or ("id = '${p_biz_uuid}'" in s))