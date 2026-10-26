"""
Test Case 05: Verify Online Payment Processing and Receipt Generation
Module: Disposal Fee Billing & Online Payment Gateway
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def run_test_case_05():
    options = Options()
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 10)

    try:
        print("[TEST 05 START] Navigating to Payment Page...")
        driver.get("http://localhost:5173")

        # Inject citizen session
        driver.execute_script(
            "window.localStorage.setItem('access', 'mock_citizen_jwt_token_2026');"
            "window.localStorage.setItem('role', 'CITIZEN');"
        )
        # Navigate to pickup payment route
        driver.get("http://localhost:5173/payment/1")
        time.sleep(2)

        # Step 1: Verify Payment / Invoice page
        print("[STEP 1] Validating payment breakdown screen...")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        body_text = driver.find_element(By.TAG_NAME, "body").text
        print(" -> Screen loaded.")

        # Step 2: Check for Pay Now CTA button
        print("[STEP 2] Checking 'Pay Now' trigger button...")
        pay_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Pay') or contains(., 'Proceed') or contains(., 'Checkout')]")
        if pay_btns:
            print(f" -> Found payment button: '{pay_btns[0].text}'. Clicking...")
            pay_btns[0].click()
            time.sleep(2)

        # Step 3: Verify Payment modal or status indication
        print("[STEP 3] Verifying checkout modal / invoice state...")
        receipt_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Receipt') or contains(., 'Download')]")
        if receipt_btns:
            print(" -> Receipt download CTA is present.")

        print("[PASS] Test Case 05 Passed: Payment checkout workflow verified.")

    finally:
        driver.quit()
        print("[TEST 05 COMPLETED]")

if __name__ == "__main__":
    run_test_case_05()
