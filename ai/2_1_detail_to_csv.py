import time
import requests
from urllib.parse import quote_plus
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import pandas as pd
import re

# 1️⃣ 환경설정
load_dotenv()
API_KEY = quote_plus(os.getenv("NONGSARO_API_KEY"))
URL = "http://api.nongsaro.go.kr/service/monthFarmTech/monthFarmTechDtl"
HEADERS = {"Referer": "https://xn--cp5bxm.site"}  # 승인된 도메인

# 2️⃣ CSV 읽기 (앞에서 만든 파일)
df = pd.read_csv("1monthTech_list_sample.csv")

# 3️⃣ 
rows = df.to_dict(orient="records")
details = []

# “본문만” 뽑게 바꿀 수 있는 함수
def extract_main_text(html: str) -> str:
    if not html:
        return ""
    doc = BeautifulSoup(html, "lxml")

    # 노이즈 제거
    for t in doc(["script","style","header","footer","nav","aside","form","button",
                  "figure","img","svg","iframe","caption","colgroup","col"]):
        t.decompose()

    # 표 전부 제거
    for t in doc.find_all(["table","thead","tbody","tr","th","td"]):
        t.decompose()

    # 줄바꿈 처리
    for br in doc.find_all(["br","hr"]):
        br.replace_with("\n")

    # 허용 태그 외 언랩
    allow = {"h1","h2","h3","p","li","ul","ol"}
    for tag in doc.find_all(True):
        if tag.name not in allow:
            tag.unwrap()

    text = doc.get_text("\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

for idx, r in enumerate(rows, 1):
    curation_no = str(r.get("curationNo", "")).strip()
    cntnts_snn = 1  # 보통 1번부터 시작 (필요시 반복문으로 2~5까지 시도 가능)

    print(f"📘 {idx}. {curation_no} 상세 요청 중...")

    params = {
        "apiKey": API_KEY,
        "srchCurationNo": curation_no,
        "srchCntntsSnn": cntnts_snn
    }

    res = requests.get(URL, params=params, headers=HEADERS, timeout=15)
    res.encoding = "utf-8"
    xml = res.text

    soup = BeautifulSoup(xml, "lxml-xml")
    item = soup.find("item")
    if not item:
        print(f"❌ {curation_no} 데이터 없음")
        continue

    html = (item.find("cntntsInfoHtml").text if item.find("cntntsInfoHtml") else "").strip()
    text = extract_main_text(html)


    details.append({
        "curationNo": curation_no,
        "title": r.get("cntntsSj", ""),
        "html": html,
        "text": text
    })
    time.sleep(0.5)  # API 과부하 방지

# 4️⃣ 저장
out_path = "21monthTech_detail_sample.csv"
# ✅ 수정 버전 — html 제거하고 text만 저장
pd.DataFrame(details)[["curationNo", "title", "text"]].to_csv(
    out_path, index=False, encoding="utf-8-sig"
)

print(f"\n✅ 저장 완료: {out_path} ({len(details)}건)")
