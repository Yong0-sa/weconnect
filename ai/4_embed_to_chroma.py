import os, pandas as pd
from chromadb import PersistentClient
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

chroma = PersistentClient(path="./chroma_db_v1")  # ← 새 폴더
col = chroma.get_or_create_collection("monthfarmtech_v1", embedding_function=None)


df = pd.read_csv("3monthTech_chunks_sample.csv")

# 📎 PDF 경로 병합
attach = pd.read_csv("22monthTech_attach_info.csv")
df = pd.merge(df, attach[["curationNo", "atchmnflUrl"]], on="curationNo", how="left")


if "chunk_id" not in df.columns:
    df["chunk_id"] = df.apply(lambda r: f"{r['curationNo']}_{int(r['chunk_no']):03d}", axis=1)

texts = df["chunk"].astype(str).tolist()
ids   = df["chunk_id"].astype(str).tolist()
metas = df[["curationNo", "title", "chunk_no", "atchmnflUrl"]].rename(columns={"atchmnflUrl": "pdf_path"}).fillna("").astype(str).to_dict("records")

vecs = []
for i in range(0, len(texts), 50):  # 50개씩 배치
    batch = texts[i:i+50]
    resp = client.embeddings.create(model="text-embedding-3-small", input=batch)
    vecs.extend([d.embedding for d in resp.data])  # 🔹 extend로 전체 누적

# 🔁 작은 배치로 add (윈도우 멈춤 회피)
B = 8
for i in range(0, len(ids), B):
    col.add(
        ids=ids[i:i+B],
        documents=texts[i:i+B],
        embeddings=vecs[i:i+B],
        metadatas=metas[i:i+B],
    )

print("✅ count:", col.count())
# chroma.persist()  # ← 추가