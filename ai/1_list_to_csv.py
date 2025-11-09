import os, csv
import requests
from urllib.parse import quote_plus
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# 1) 환경설정
load_dotenv()
API_KEY = quote_plus(os.getenv("NONGSARO_API_KEY"))
URL = "http://api.nongsaro.go.kr/service/monthFarmTech/monthFarmTechLst"
HEADERS = {"Referer": "https://xn--cp5bxm.site"}  # 승인 도메인 정확히

# 2) 호출 파라미터 (테스트로 2건만)
params = {
    "apiKey": API_KEY,
    "srchStr": "",
    "sEralInfo": "",
    "pageNo": 1,
    "numOfRows": 500
}

# 3) 요청
res = requests.get(URL, params=params, headers=HEADERS, timeout=15)
res.encoding = "utf-8"
xml = res.text

# 4) 파싱
soup = BeautifulSoup(xml, "lxml-xml")
items = soup.select("body > items > item")

rows = []
for it in items:
    rows.append({
        "curationNo": (it.find("curationNo").text if it.find("curationNo") else "").strip(),
        "cntntsSj": (it.find("cntntsSj").text if it.find("cntntsSj") else "").strip(),
        "curationImgUrl": (it.find("curationImgUrl").text if it.find("curationImgUrl") else "").strip(),
        "contentCnt": (it.find("contentCnt").text if it.find("contentCnt") else "").strip(),
        "atchmnflGroupEsntlCode": (it.find("atchmnflGroupEsntlCode").text if it.find("atchmnflGroupEsntlCode") else "").strip(),
        "atchmnflStreNm": (it.find("atchmnflStreNm").text if it.find("atchmnflStreNm") else "").strip()
    })


# 5) CSV 저장
out = "1monthTech_list_sample.csv"
with open(out, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["cntntsSj","curationImgUrl","contentCnt","atchmnflGroupEsntlCode","atchmnflStreNm"])
    w.writeheader()
    w.writerows(rows)

print(f"✅ 저장 완료: {out} (총 {len(rows)}건)")
