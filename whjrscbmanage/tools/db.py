# -*- coding: utf-8 -*-
"""本机开发库的连接参数 —— 口令不进代码库。

口令走环境变量：

    export MYSQL_PWD=<本机 MySQL 口令>

这里连的是本机 localhost:3306 的开发库，只给「建表 / 造数 / 冒烟 / 清测试行」
这几个命令行脚本用；页面本身取数走的是帆软里的 JDBC 数据连接，与本文件无关。
"""
import os
import sys

import pymysql


def connect(**kw):
    pwd = os.environ.get('MYSQL_PWD')
    if not pwd:
        sys.exit('未设置 MYSQL_PWD —— 先 export MYSQL_PWD=<本机 MySQL 口令> 再运行')
    kw.setdefault('host', 'localhost')
    kw.setdefault('port', 3306)
    kw.setdefault('user', 'root')
    kw.setdefault('charset', 'utf8mb4')
    return pymysql.connect(password=pwd, **kw)
