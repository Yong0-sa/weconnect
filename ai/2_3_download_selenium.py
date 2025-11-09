import os, time, csv
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

CSV = "22monthTech_attach_info.csv"
SAVE_DIR = Path("./pdfs")
SAVE_DIR.mkdir(exist_ok=True)

# 1️⃣ 크롬 다운로드 옵션 설정
options = Options()
options.add_argument("--headless=new")  # 창 안 띄움
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
prefs = {
    "download.default_directory": str(SAVE_DIR.resolve()),
    "download.prompt_for_download": False,
    "download.directory_upgrade": True,
    "plugins.always_open_pdf_externally": True  # 뷰어 대신 바로 저장
}
options.add_experimental_option("prefs", prefs)

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# 2️⃣ CSV 읽고 URL 순회
with open(CSV, newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        url = (row.get("atchmnflUrl") or "").strip()
        cur = (row.get("curationNo") or "").strip()
        if not url:
            print(f"⚠️ 없음: {cur}")
            continue
        try:
            print(f"📥 다운로드 중: {cur}")
            driver.get(url)
            time.sleep(3)  # 파일 저장 대기
        except Exception as e:
            print(f"❌ 실패: {cur} ({e})")

driver.quit()
print("✅ 모든 다운로드 완료")
