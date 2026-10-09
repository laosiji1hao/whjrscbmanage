import base64, zlib, sys

data = "1Z3X=B@YIR4\qu`E#E[[S$q;?U3TPd/UY!7a-.NZ\Vs?QShA^k@`qY%A'X79k!,?h!E*=Bq/\nlM2(]A2sZc']A(B~"
print("raw repr:", repr(data[:20]))
body = data[2:]  # strip 1Z
print("body head:", repr(body[:30]))
try:
    dec = base64.b64decode(body)
    print("b64 ok, len", len(dec), "head", dec[:10].hex())
    try:
        out = zlib.decompress(dec)
        print("zlib:", out[:500])
    except Exception as e:
        print("zlib fails:", e)
        for key in range(-15, -8):
            try:
                out = zlib.decompress(dec, key)
                print("zlib wbits", key, ":", out[:500])
                break
            except Exception as e2:
                pass
except Exception as e:
    print("b64 fails:", e)
    # maybe url-safe or with padding
    try:
        dec = base64.b64decode(body + "==")
        print("b64 pad ok", len(dec))
    except Exception as e:
        print("still fails", e)
