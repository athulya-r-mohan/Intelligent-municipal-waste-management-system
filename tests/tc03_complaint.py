
"""
Test Case 03: Verify Waste Complaint Registration
Module: Public Grievance & Waste Complaint
"""

import os
import time
import tempfile

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from webdriver_manager.chrome import ChromeDriverManager


def run_test_case_03():

    options = Options()
    options.add_argument("--window-size=1920,1080")

    # Allow geolocation
    options.add_experimental_option("prefs", {
        "profile.default_content_setting_values.geolocation": 1
    })

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )

    wait = WebDriverWait(driver, 15)

    # Create temporary test image
    evidence_img = tempfile.NamedTemporaryFile(
        suffix=".jpg",
        delete=False
    )

    evidence_img.write(
        b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 300
    )
    evidence_img.close()

    try:

        print("\n[TEST 03 START]")

        # STEP 1: Open website
        print("[STEP 1] Opening EcoPulse...")

        driver.get("http://localhost:5173")

        # Mock authentication for navigation debugging only.
        # This is not a valid backend JWT.
        driver.execute_script("""
            localStorage.setItem(
                'access',
                'mock_citizen_jwt_token_2026'
            );
            localStorage.setItem('role', 'CITIZEN');
        """)

        # STEP 2: Navigate to complaint page
        print("[STEP 2] Opening complaint registration...")

        driver.get("http://localhost:5173/complaintform")

        time.sleep(3)

        # DEBUG INFORMATION
        print("\n----- DEBUG INFORMATION -----")

        print("Current URL:", driver.current_url)
        print("Page Title:", driver.title)

        forms = driver.find_elements(By.TAG_NAME, "form")

        print("Number of forms:", len(forms))

        print("-----------------------------\n")

        # STEP 3: Verify complaint form
        print("[STEP 3] Checking complaint form...")

        try:

            form = wait.until(
                EC.presence_of_element_located(
                    (By.TAG_NAME, "form")
                )
            )

            print("[PASS] Complaint form loaded.")

        except TimeoutException:

            print("[FAIL] Complaint form not found!")

            print("Current URL:", driver.current_url)

            driver.save_screenshot(
                "tc03_error.png"
            )

            print("Screenshot saved: tc03_error.png")

            raise AssertionError(
                "Complaint form is not available. "
                "Check authentication, route and HTML structure."
            )

        # STEP 4: Select category
        print("[STEP 4] Selecting complaint category...")

        selects = driver.find_elements(
            By.TAG_NAME,
            "select"
        )

        if selects:

            sel = Select(selects[0])

            if len(sel.options) > 1:

                sel.select_by_index(1)

                print(
                    "Selected:",
                    sel.first_selected_option.text
                )

        # STEP 5: GPS
        print("[STEP 5] Checking GPS location...")

        gps_buttons = driver.find_elements(
            By.XPATH,
            "//button[contains(., 'Location') or "
            "contains(., 'GPS') or contains(., 'Current')]"
        )

        if gps_buttons:

            gps_buttons[0].click()

            print("[PASS] GPS button clicked.")

            time.sleep(2)

        else:

            print("[INFO] GPS button not found.")

        # STEP 6: Upload photo
        print("[STEP 6] Uploading evidence photo...")

        file_inputs = driver.find_elements(
            By.CSS_SELECTOR,
            "input[type='file']"
        )

        if file_inputs:

            file_inputs[0].send_keys(
                os.path.abspath(evidence_img.name)
            )

            print("[PASS] Photo attached.")

        else:

            print("[INFO] File upload input not found.")

        # STEP 7: Description
        print("[STEP 7] Entering complaint description...")

        textareas = driver.find_elements(
            By.TAG_NAME,
            "textarea"
        )

        if textareas:

            textareas[0].send_keys(
                "Automated Test: Public waste container "
                "overflowing near bus stand."
            )

            print("[PASS] Description entered.")

        else:

            print("[INFO] Description field not found.")

        # STEP 8: Submit
        print("[STEP 8] Checking submit button...")

        submit_buttons = driver.find_elements(
            By.XPATH,
            "//button[contains(., 'Submit') or "
            "contains(., 'File') or contains(., 'Report')]"
        )

        if submit_buttons:

            submit_buttons[0].click()

            print("[INFO] Submit button clicked.")

            print(
                "[INFO] Verify the success message or backend "
                "response before marking complaint registration PASS."
            )

        else:

            print("[FAIL] Submit button not found.")

        print("\n[TEST 03 EXECUTION COMPLETED]")

    except Exception as e:

        print("\n[TEST 03 FAILED]")

        print("Error:", str(e))

        raise

    finally:

        driver.quit()

        if os.path.exists(evidence_img.name):

            try:
                os.remove(evidence_img.name)

            except OSError:
                pass

        print("[TEST 03 COMPLETED]")


if __name__ == "__main__":

    run_test_case_03()
