import os, requests, csv
import pandas as pd
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# 1️⃣ 환경 설정
load_dotenv()
API_KEY = quote_plus(os.getenv("NONGSARO_API_KEY"))
DETAIL_URL = "http://api.nongsaro.go.kr/service/monthFarmTech/monthFarmTechDtlDefaultInfo"
HEADERS = {"Referer": "https://xn--cp5bxm.site"}

# 2️⃣ 목록 CSV에서 curationNo 읽기
list_csv = "1monthTech_list_sample.csv"  # list_to_csv로 만든 파일
df = pd.read_csv(list_csv)
curation_list = df["curationNo"].astype(str).tolist()

# 3️⃣ API 요청 반복
rows = []
for cur in curation_list:
    params = {"apiKey": API_KEY, "srchCurationNo": cur}
    res = requests.get(DETAIL_URL, params=params, headers=HEADERS, timeout=15)
    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "lxml-xml")

    info = soup.find("item") or soup.find("DtlDefaultInfo")
    if not info:
        print(f"⚠️ 없음: {cur}")
        continue

    code = info.find("atchmnflGroupEsntlCodeOrtx")
    url  = info.find("atchmnflUrl")
    link = info.find("linkUrl")

    rows.append({
        "curationNo": cur,
        "atchmnflGroupEsntlCodeOrtx": code.text.strip() if code else "",
        "atchmnflUrl": url.text.strip() if url else "",
        "linkUrl": link.text.strip() if link else ""
    })
    print(f"✅ {cur}")

# 4️⃣ CSV 저장
out = "22monthTech_attach_info.csv"
pd.DataFrame(rows).to_csv(out, index=False, encoding="utf-8-sig")
print(f"📄 저장 완료: {out} ({len(rows)}건)")
