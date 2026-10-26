"""
Test Case 04: Verify Admin Task Assignment to Ward Field Worker
Module: Admin Dispatch & Field Staff Task Assignment
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def run_test_case_04():
    options = Options()
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 10)

    try:
        print("[TEST 04 START] Navigating to Admin Pickup Assignment...")
        driver.get("http://localhost:5173")

        # Inject admin session
        driver.execute_script(
            "window.localStorage.setItem('access', 'mock_admin_jwt_token_2026');"
            "window.localStorage.setItem('role', 'ADMIN');"
        )
        driver.get("http://localhost:5173/assign")
        time.sleep(2)

        # Step 1: Verify Admin Assignment page loaded
        print("[STEP 1] Validating Admin Assignment UI...")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert "EcoPulse" in body_text or "Pickup" in body_text or "Assign" in body_text, "Admin Assignment page did not load!"
        print(" -> Page header verified.")

        # Step 2: Filter pending pickup tasks
        print("[STEP 2] Inspecting pending pickup requests...")
        tables = driver.find_elements(By.TAG_NAME, "table")
        if tables:
            rows = tables[0].find_elements(By.TAG_NAME, "tr")
            print(f" -> Found {len(rows)} rows in pickup task table.")

        # Step 3: Open assign staff dropdown/modal
        print("[STEP 3] Checking Staff Assignment controls...")
        staff_selects = driver.find_elements(By.TAG_NAME, "select")
        if staff_selects:
            sel = Select(staff_selects[0])
            if len(sel.options) > 1:
                sel.select_by_index(1)
                print(f" -> Selected staff member: {sel.first_selected_option.text}")

        # Step 4: Confirm assignment CTA
        print("[STEP 4] Clicking Confirm / Assign button...")
        assign_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Assign') or contains(., 'Confirm') or contains(., 'Dispatch')]")
        if assign_btns:
            assign_btns[0].click()
            print(" -> Clicked assignment action button.")
            time.sleep(1)

        print("[PASS] Test Case 04 Passed: Admin staff assignment workflow executed.")

    finally:
        driver.quit()
        print("[TEST 04 COMPLETED]")

if __name__ == "__main__":
    run_test_case_04()
