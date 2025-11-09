import csv
import os
import pandas as pd

IN_FILE  = "21monthTech_detail_sample.csv"   # curationNo,title,text
OUT_FILE = "3monthTech_chunks_sample.csv"

CHUNK_SIZE = 200     # 목표 청크 길이(문자 기준)
OVERLAP    = 40      # 청크 간 겹침
MIN_CHUNK  = 100     # 마지막 조각이 너무 짧으면 이전에 합치기

def chunk_text(t: str, size=CHUNK_SIZE, overlap=OVERLAP, min_chunk=MIN_CHUNK):
    if not isinstance(t, str):
        t = "" if t is None else str(t)
    t = t.strip()
    if not t:
        return []

    chunks = []
    i, n = 0, len(t)
    step = max(1, size - overlap)

    while i < n:
        j = min(n, i + size)

        # 문단 경계 우선: 뒤쪽으로 \n\n 찾기
        k = t.rfind("\n\n", i + int(size*0.6), j)
        if k != -1 and k > i:
            j = k

        # 너무 짧은 마지막 조각이면 앞에 붙이기
        if n - j < min_chunk and j != n and len(chunks) > 0:
            # 앞 청크 늘리고 종료
            prev_start, prev_text = chunks[-1]
            chunks[-1] = (prev_start, prev_text + t[i:n])
            break

        chunks.append((i, t[i:j]))
        if j == n:
            break
        i = max(j - overlap, i + step)

    # (start, text) -> dicts with indices
    out = []
    for idx, (s, c) in enumerate(chunks, start=1):
        out.append({"chunk_no": idx, "start": s, "end": s + len(c), "chunk": c.strip()})
    return out

def main():
    if not os.path.exists(IN_FILE):
        raise FileNotFoundError(f"{IN_FILE} not found")

    df = pd.read_csv(IN_FILE)
    rows = []

    for _, r in df.iterrows():
        cur = str(r.get("curationNo", "")).strip()
        title = str(r.get("title", "")).strip()
        text = r.get("text", "")

        for ch in chunk_text(text):
            chunk_no = ch["chunk_no"]
            rows.append({
                "curationNo": cur,
                "title": title,
                "chunk_no": chunk_no,
                "start": ch["start"],
                "end": ch["end"],
                "chunk": ch["chunk"],
                "chunk_id": f"{cur}_{chunk_no:03d}"   # ✅ 추가
            })

    pd.DataFrame(rows).to_csv(OUT_FILE, index=False, encoding="utf-8-sig")
    print(f"✅ 저장 완료: {OUT_FILE} (총 {len(rows)}개 청크)")

if __name__ == "__main__":
    main()
