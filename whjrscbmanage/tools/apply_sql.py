# -*- coding: utf-8 -*-
"""Apply the deliverable SQL scripts through PyMySQL.

Handles the `DELIMITER $$` convention used by the SP script (PyMySQL has no
DELIMITER support, so we track the delimiter ourselves).
"""
import io
import re
import sys

from db import connect

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)

DELIM_RE = re.compile(r'^\s*DELIMITER\s+(\S+)\s*$', re.I | re.M)


def strip_leading_comments(body):
    """Drop leading `--` / blank lines so a comment banner never hides a statement.

    Without this, `body.startswith('--')` silently discards the statement that
    follows a comment block.
    """
    out, started = [], False
    for ln in body.splitlines():
        if not started and (not ln.strip() or ln.strip().startswith('--')):
            continue
        started = True
        out.append(ln)
    return '\n'.join(out).strip()


def split_statements(text):
    """Split on the active delimiter, honouring `DELIMITER x` directives."""
    stmts, buf, delim = [], [], ';'
    for line in text.splitlines():
        m = DELIM_RE.match(line)
        if m:
            body = strip_leading_comments(''.join(buf))
            if body:
                stmts.append(body)
            buf = []
            delim = m.group(1)
            continue
        buf.append(line + '\n')
        chunk = ''.join(buf)
        if chunk.rstrip().endswith(delim):
            body = strip_leading_comments(chunk.rstrip()[: -len(delim)])
            buf = []
            if body:
                stmts.append(body)
    tail = strip_leading_comments(''.join(buf))
    if tail:
        stmts.append(tail)
    return stmts


def apply(path, conn):
    text = open(path, encoding='utf-8').read()
    stmts = split_statements(text)
    ok = err = 0
    print('== %s (%d statements) ==' % (path.split('\\')[-1], len(stmts)))
    cur = conn.cursor()
    for i, s in enumerate(stmts, 1):
        head = ' '.join(s.split())[:70]
        try:
            cur.execute(s)
            try:
                rows = cur.fetchall()
                for r in rows[:3]:
                    print('   [%02d] %-70s -> %s' % (i, head, r[0]))
                if not rows:
                    print('   [%02d] %-70s -> ok' % (i, head))
            except Exception:
                print('   [%02d] %-70s -> ok' % (i, head))
            ok += 1
        except Exception as e:
            print('   [%02d] %-70s -> ERR %s' % (i, head, e))
            err += 1
    print('   => ok=%d err=%d\n' % (ok, err))
    return err


conn = connect(autocommit=True)
total_err = 0
for p in sys.argv[1:]:
    total_err += apply(p, conn)
conn.close()
print('TOTAL ERRORS =', total_err)
sys.exit(1 if total_err else 0)
