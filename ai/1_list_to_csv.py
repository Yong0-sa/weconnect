import os, csv
import requests
from urllib.parse import quote_plus
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# 1) 환경설정
load_dotenv()

# 특수문자(+, / 등)가 있을 수 있어서 quote_plus로 URL 인코딩
API_KEY = quote_plus(os.getenv("NONGSARO_API_KEY"))
URL = "http://api.nongsaro.go.kr/service/monthFarmTech/monthFarmTechLst"

# 사전에 승인받은 도메인 주소
HEADERS = {"Referer": "https://xn--cp5bxm.site"}  # 승인 도메인 정확히

# 2) 호API에 전달할 쿼리 파라미터들
params = {
    "apiKey": API_KEY,
    "srchStr": "",
    "sEralInfo": "",
    "pageNo": 1,
    "numOfRows": 500
}

# 3) HTTP 요청
res = requests.get(URL, params=params, headers=HEADERS, timeout=15)
res.encoding = "utf-8"  # 한글 깨짐 방지용
xml = res.text  # 응답 본문(XML 문자열)

# 4) XML 파싱 (BeautifulSoup 사용)
# - "lxml-xml" 파서: XML 구조를 잘 인식할 수 있는 파서 타입
soup = BeautifulSoup(xml, "lxml-xml")

# <body><items><item> ... </item></items></body> 구조에서 item 태그들만
items = soup.select("body > items > item")

# CSV로 만들 레코드(행)들을 담을 리스트
rows = []

# 각 <item> 요소를 순회하면서 필요한 필드들을 추출
for it in items:
    rows.append({
        "curationNo": (it.find("curationNo").text if it.find("curationNo") else "").strip(),
        "cntntsSj": (it.find("cntntsSj").text if it.find("cntntsSj") else "").strip(),
        "curationImgUrl": (it.find("curationImgUrl").text if it.find("curationImgUrl") else "").strip(),
        "contentCnt": (it.find("contentCnt").text if it.find("contentCnt") else "").strip(),
        "atchmnflGroupEsntlCode": (it.find("atchmnflGroupEsntlCode").text if it.find("atchmnflGroupEsntlCode") else "").strip(),
        "atchmnflStreNm": (it.find("atchmnflStreNm").text if it.find("atchmnflStreNm") else "").strip()
    })


# 5) 결과를 CSV 파일로 저장

# 출력할 CSV 파일 이름
out = "1monthTech_list_sample.csv"

# newline="" : 윈도우에서 줄바꿈이 두 번 들어가는 문제 방지
# encoding="utf-8-sig" : 엑셀에서 한글이 깨지지 않도록 BOM 포함 UTF-8로 저장
with open(out, "w", newline="", encoding="utf-8-sig") as f:
    # DictWriter는 딕셔너리의 key를 컬럼 이름으로 사용하는 CSV writer
    # rows가 비어있지 않으면 첫 번째 row의 key들을 필드명으로 사용
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["cntntsSj","curationImgUrl","contentCnt","atchmnflGroupEsntlCode","atchmnflStreNm"])
    # 헤더(컬럼 이름) 한 줄 쓰기
    w.writeheader()
    # rows에 담긴 각 딕셔너리를 한 줄씩 CSV로 기록
    w.writerows(rows)

print(f"✅ 저장 완료: {out} (총 {len(rows)}건)")
