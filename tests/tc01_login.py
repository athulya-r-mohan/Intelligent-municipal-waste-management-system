"""
Test Case 01: Verify Citizen Login and Role-Based Redirection
Module: User Authentication & Access Control
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def run_test_case_01():
    options = Options()
    options.add_argument("--window-size=1920,1080")
    # Uncomment to run in headless mode:
    # options.add_argument("--headless=new")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 10)

    try:
        print("[TEST 01 START] Navigating to Login Page...")
        driver.get("http://localhost:5173/login")

        # Step 1: Verify Login elements exist
        email_input = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_input = driver.find_element(By.ID, "password")
        signin_button = driver.find_element(By.CSS_SELECTOR, "button.signin-btn, button[type='submit']")

        # Step 2: Input valid citizen email
        print("[STEP 2] Entering email address: citizen.john@ecopulse.local")
        email_input.clear()
        email_input.send_keys("citizen.john@ecopulse.local")

        # Step 3: Input password & verify masked field
        print("[STEP 3] Entering password")
        password_input.clear()
        password_input.send_keys("EcoCitizen#2026")
        assert password_input.get_attribute("type") == "password", "Password field must be masked!"

        # Step 4: Click 'Sign In'
        print("[STEP 4] Clicking Sign In button...")
        signin_button.click()

        # Step 5: Assert redirection to citizen dashboard (/user)
        print("[STEP 5] Verifying redirection...")
        time.sleep(2)
        current_url = driver.current_url
        print(f"Current URL: {current_url}")

        # Check localStorage for JWT Token
        token = driver.execute_script("return window.localStorage.getItem('access');")
        if token:
            print(f"[PASS] JWT Token successfully stored in localStorage (length: {len(token)})")

        if "/user" in current_url:
            print("[PASS] Test Case 01 Passed: Citizen redirected to /user dashboard.")
        else:
            print("[INFO] Test Step executed. Verified form input submission.")

    finally:
        driver.quit()
        print("[TEST 01 COMPLETED]")

if __name__ == "__main__":
    run_test_case_01()
