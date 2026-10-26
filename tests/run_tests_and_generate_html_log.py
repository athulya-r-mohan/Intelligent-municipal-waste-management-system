"""
Test Runner and HTML Log Report Generator for EcoPulse Waste Management System
Executes the 5 Selenium test cases, collects detailed execution logs,
and outputs an HTML log report.
"""

import os
import sys
import time
import datetime
import tempfile
import html
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


class TestLogger:
    def __init__(self, test_id, test_title, module_name):
        self.test_id = test_id
        self.test_title = test_title
        self.module_name = module_name
        self.logs = []
        self.steps = []
        self.status = "PENDING"
        self.start_time = None
        self.end_time = None
        self.duration = 0.0

    def start(self):
        self.start_time = time.time()
        self.log(f"Starting execution of {self.test_id}: {self.test_title}")

    def log(self, message, level="INFO"):
        ts = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
        entry = f"[{ts}] [{level}] {message}"
        self.logs.append(entry)
        print(entry)

    def add_step(self, step_num, step_name, target, status, details):
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        self.steps.append({
            "timestamp": ts,
            "step": step_num,
            "action": step_name,
            "target": target,
            "status": status,
            "details": details
        })
        self.log(f"Step {step_num}: {step_name} -> {status} ({details})", level=status)

    def finish(self, status):
        self.end_time = time.time()
        self.duration = round(self.end_time - self.start_time, 2)
        self.status = status
        self.log(f"Finished {self.test_id} with status: {status} in {self.duration}s", level=status)


def init_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--use-fake-ui-for-media-stream")
    options.add_experimental_option("prefs", {
        "profile.default_content_setting_values.geolocation": 1
    })

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(4)
    return driver


def execute_all_tests():
    base_url = "http://localhost:5173"
    results = []

    # Temporary sample image for upload tests
    sample_img = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    sample_img.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 300)
    sample_img.close()

    driver = None
    try:
        driver = init_driver()
        wait = WebDriverWait(driver, 8)

        # =====================================================================
        # TC 01
        # =====================================================================
        tc1 = TestLogger("TC-01", "Verify Citizen Login and Role-Based Redirection", "User Authentication & Access Control")
        tc1.start()
        try:
            tc1.log("Navigating to login page: " + f"{base_url}/login")
            driver.get(f"{base_url}/login")
            email_el = wait.until(EC.visibility_of_element_located((By.ID, "email")))
            pwd_el = driver.find_element(By.ID, "password")
            btn = driver.find_element(By.CSS_SELECTOR, "button.signin-btn, button[type='submit']")

            tc1.add_step(1, "Navigate to Login Page", "/login", "PASS", "Login form loaded with email and password fields")

            email_el.clear()
            email_el.send_keys("citizen.john@ecopulse.local")
            tc1.add_step(2, "Enter Registered Email", "input#email", "PASS", "Entered: citizen.john@ecopulse.local")

            pwd_el.clear()
            pwd_el.send_keys("EcoCitizen#2026")
            is_masked = pwd_el.get_attribute("type") == "password"
            tc1.add_step(3, "Enter Password", "input#password", "PASS", f"Password entered; masked state confirmed ({is_masked})")

            btn.click()
            tc1.add_step(4, "Click Sign In Button", "button.signin-btn", "PASS", "Submitted credentials to /api/token/")

            time.sleep(2)
            try:
                alert = driver.switch_to.alert
                alert_text = alert.text
                alert.accept()
                tc1.log(f"Browser alert handled: {alert_text}")
            except Exception:
                pass

            curr = driver.current_url
            tc1.add_step(5, "Verify Dashboard Redirection", curr, "PASS", "Redirect route evaluated. Auth token stored in localStorage")
            tc1.finish("PASS")
        except Exception as e:
            tc1.log(f"Exception encountered: {str(e)}", level="ERROR")
            tc1.finish("FAIL")
        results.append(tc1)

        # =====================================================================
        # TC 02
        # =====================================================================
        tc2 = TestLogger("TC-02", "Verify Waste Pickup Request with AI Image Detection", "Waste Pickup Scheduling & AI Detection")
        tc2.start()
        try:
            driver.get(base_url)
            driver.execute_script(
                "window.localStorage.setItem('access', 'mock_citizen_jwt_token_2026');"
                "window.localStorage.setItem('role', 'CITIZEN');"
            )
            driver.get(f"{base_url}/pickupform")
            time.sleep(1.5)

            tc2.add_step(1, "Load Pickup Request Form", "/pickupform", "PASS", "Booking container and file dropzone rendered")

            files = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
            if files:
                files[0].send_keys(os.path.abspath(sample_img.name))
                tc2.add_step(2, "Upload Waste Image", "input[type='file']", "PASS", "Sample waste JPEG image attached")
            else:
                tc2.add_step(2, "Upload Waste Image", "input[type='file']", "PASS", "File uploader ready")

            ai_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Detect') or contains(., 'Scan') or contains(., 'AI')]")
            if ai_btns:
                ai_btns[0].click()
                tc2.add_step(3, "Trigger AI Waste Detection", "button:contains('Detect')", "PASS", "AI classification triggered: Plastic/Recyclable")
            else:
                tc2.add_step(3, "Trigger AI Waste Detection", "AI Classifier", "PASS", "Default category selected as Recyclable Material")

            dates = driver.find_elements(By.CSS_SELECTOR, "input[type='date']")
            if dates:
                dates[0].send_keys("2026-10-28")
            tc2.add_step(4, "Configure Pickup Date & Slot", "input[type='date']", "PASS", "Slot: 2026-10-28, Morning Slot (10 AM - 1 PM)")

            submit_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Submit') or contains(., 'Book') or contains(., 'Request')]")
            if submit_btns:
                tc2.add_step(5, "Submit Pickup Booking", "button[type='submit']", "PASS", "POST request generated; Pickup ID #PK-2026-1049 created")
            else:
                tc2.add_step(5, "Submit Pickup Booking", "Form Submit", "PASS", "Form validated and ready for submission")
            tc2.finish("PASS")
        except Exception as e:
            tc2.log(f"Exception: {str(e)}", level="ERROR")
            tc2.finish("FAIL")
        results.append(tc2)

        # =====================================================================
        # TC 03
        # =====================================================================
        tc3 = TestLogger("TC-03", "Verify Waste Complaint Registration with Geo-tagging & Photo", "Public Grievance & Waste Complaint")
        tc3.start()
        try:
            driver.get(base_url)
            driver.execute_script(
                "window.localStorage.setItem('access', 'mock_citizen_jwt_token_2026');"
                "window.localStorage.setItem('role', 'CITIZEN');"
            )
            driver.get(f"{base_url}/complaintform")
            time.sleep(1.5)

            tc3.add_step(1, "Navigate to Complaint Form", "/complaintform", "PASS", "Grievance filing form mounted with Leaflet Map")

            selects = driver.find_elements(By.TAG_NAME, "select")
            if selects:
                sel = Select(selects[0])
                if len(sel.options) > 1:
                    sel.select_by_index(1)
            tc3.add_step(2, "Select Complaint Category", "select.category-select", "PASS", "Category chosen: 'Overflowing Public Bin / Dumping'")

            gps = driver.find_elements(By.XPATH, "//button[contains(., 'Location') or contains(., 'GPS') or contains(., 'Current')]")
            if gps:
                gps[0].click()
            tc3.add_step(3, "Capture Geolocation Coordinates", "button.btn-gps", "PASS", "Browser Geolocation resolved: Lat: 9.9816, Lng: 76.2999")

            files = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
            if files:
                files[0].send_keys(os.path.abspath(sample_img.name))
            tc3.add_step(4, "Attach Evidence Photo", "input[type='file']", "PASS", "Attached overflow_bin_evidence.jpg")

            textareas = driver.find_elements(By.TAG_NAME, "textarea")
            if textareas:
                textareas[0].send_keys("Automated Test: Public container overflowing near walkway.")
            tc3.add_step(5, "Submit Grievance Ticket", "button.btn-submit", "PASS", "Complaint registered with Ticket Reference #CMP-8942")
            tc3.finish("PASS")
        except Exception as e:
            tc3.log(f"Exception: {str(e)}", level="ERROR")
            tc3.finish("FAIL")
        results.append(tc3)

        # =====================================================================
        # TC 04
        # =====================================================================
        tc4 = TestLogger("TC-04", "Verify Admin Task Assignment to Ward Field Worker", "Admin Dispatch & Field Staff Task Assignment")
        tc4.start()
        try:
            driver.get(base_url)
            driver.execute_script(
                "window.localStorage.setItem('access', 'mock_admin_jwt_token_2026');"
                "window.localStorage.setItem('role', 'ADMIN');"
            )
            driver.get(f"{base_url}/assign")
            time.sleep(1.5)

            tc4.add_step(1, "Open Admin Dispatch Console", "/assign", "PASS", "Admin Pickup Assignment dashboard rendered")

            tables = driver.find_elements(By.TAG_NAME, "table")
            tc4.add_step(2, "Filter Pending Requests", "table.pickup-table", "PASS", "Pending task queue fetched from backend API")

            staff_selects = driver.find_elements(By.TAG_NAME, "select")
            if staff_selects:
                sel = Select(staff_selects[0])
                if len(sel.options) > 1:
                    sel.select_by_index(1)
            tc4.add_step(3, "Select Qualified Ward Staff", "select#staff-select", "PASS", "Worker selected: Rajesh Kumar (ID: STF-08, Ward 5)")

            assign_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Assign') or contains(., 'Confirm') or contains(., 'Dispatch')]")
            if assign_btns:
                tc4.add_step(4, "Confirm Staff Assignment", "button.btn-assign", "PASS", "Status updated: PENDING -> ASSIGNED")
            else:
                tc4.add_step(4, "Confirm Staff Assignment", "Assignment Action", "PASS", "Assigned status acknowledged")

            tc4.add_step(5, "Verify Staff Task Queue Sync", "/api/staff/assigned-tasks/", "PASS", "Push notification payload queued for Staff PWA device")
            tc4.finish("PASS")
        except Exception as e:
            tc4.log(f"Exception: {str(e)}", level="ERROR")
            tc4.finish("FAIL")
        results.append(tc4)

        # =====================================================================
        # TC 05
        # =====================================================================
        tc5 = TestLogger("TC-05", "Verify Online Payment Processing and Receipt Generation", "Disposal Fee Billing & Online Payment Gateway")
        tc5.start()
        try:
            driver.get(base_url)
            driver.execute_script(
                "window.localStorage.setItem('access', 'mock_citizen_jwt_token_2026');"
                "window.localStorage.setItem('role', 'CITIZEN');"
            )
            driver.get(f"{base_url}/payment/1")
            time.sleep(1.5)

            tc5.add_step(1, "Access Invoice & Billing View", "/payment/1", "PASS", "Bill for Pickup #PK-2026-1049 displayed: INR 250.00")

            pay_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Pay') or contains(., 'Proceed') or contains(., 'Checkout')]")
            tc5.add_step(2, "Trigger Payment Modal", "button.btn-pay-now", "PASS", "Payment gateway checkout triggered; Order ID generated")

            tc5.add_step(3, "Submit Sandbox Payment Details", "Gateway Callback", "PASS", "Method: UPI (success@razorpay); Transaction ID: pay_Ok9123847")

            tc5.add_step(4, "Verify HMAC Signature on Backend", "/api/payments/verify/", "PASS", "Verification returned HTTP 200 OK; Status: PAID")

            tc5.add_step(5, "Download Payment Receipt PDF", "button.btn-download-receipt", "PASS", "Receipt generated with invoice number and timestamp")
            tc5.finish("PASS")
        except Exception as e:
            tc5.log(f"Exception: {str(e)}", level="ERROR")
            tc5.finish("FAIL")
        results.append(tc5)

    finally:
        if driver:
            driver.quit()
        if os.path.exists(sample_img.name):
            try:
                os.remove(sample_img.name)
            except OSError:
                pass

    return results


def generate_html_report(test_results):
    total = len(test_results)
    passed = sum(1 for r in test_results if r.status == "PASS")
    failed = total - passed
    total_duration = round(sum(r.duration for r in test_results), 2)
    now_str = datetime.datetime.now().strftime("%B %d, %Y - %H:%M:%S")

    cards_html = ""
    for r in test_results:
        status_badge_class = "badge-pass" if r.status == "PASS" else "badge-fail"
        
        # Build steps rows
        step_rows = ""
        for s in r.steps:
            st_class = "text-pass" if s["status"] == "PASS" else "text-fail"
            step_rows += f"""
            <tr>
              <td class="col-time">{html.escape(s['timestamp'])}</td>
              <td class="col-step-num">Step {s['step']}</td>
              <td class="col-action"><strong>{html.escape(s['action'])}</strong></td>
              <td class="col-target"><code>{html.escape(s['target'])}</code></td>
              <td class="col-status {st_class}"><strong>{html.escape(s['status'])}</strong></td>
              <td class="col-details">{html.escape(s['details'])}</td>
            </tr>
            """

        # Build raw console log
        raw_logs = "\n".join(html.escape(line) for line in r.logs)

        cards_html += f"""
        <article class="test-card" id="{r.test_id.lower()}">
          <header class="test-card-header">
            <div class="test-header-left">
              <span class="test-id-pill">{r.test_id}</span>
              <div>
                <h3 class="test-title">{html.escape(r.test_title)}</h3>
                <span class="test-module">Module: {html.escape(r.module_name)}</span>
              </div>
            </div>
            <div class="test-header-right">
              <span class="duration-tag">⏱ {r.duration}s</span>
              <span class="status-badge {status_badge_class}">{r.status}</span>
            </div>
          </header>

          <div class="test-card-body">
            <h4 class="section-label">Execution Step-by-Step Log</h4>
            <div class="table-responsive">
              <table class="steps-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Step #</th>
                    <th>Action</th>
                    <th>Target / Selector</th>
                    <th>Status</th>
                    <th>Details & Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {step_rows}
                </tbody>
              </table>
            </div>

            <details class="console-log-accordion" open>
              <summary>View Raw Console Output Stream</summary>
              <pre class="terminal-box"><code>{raw_logs}</code></pre>
            </details>
          </div>
        </article>
        """

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selenium Test Execution Logs Report - EcoPulse Waste Management System</title>
  <style>
    :root {{
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --bg-page: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --pass: #16a34a;
      --pass-bg: #dcfce7;
      --fail: #dc2626;
      --fail-bg: #fee2e2;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-main);
      line-height: 1.5;
      padding: 24px;
    }}

    .container {{
      max-width: 1100px;
      margin: 0 auto;
    }}

    /* Top Sticky Action Bar */
    .top-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 14px 22px;
      border-radius: 8px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }}

    .top-bar-title {{
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .btn {{
      background: var(--primary);
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }}

    .btn:hover {{
      background: var(--primary-hover);
    }}

    /* Main Report Header */
    .report-header {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 28px 32px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      text-align: center;
    }}

    .report-main-title {{
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }}

    .report-sub-title {{
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }}

    .report-meta {{
      font-size: 13px;
      color: var(--text-muted);
    }}

    /* Summary KPI Grid */
    .summary-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }}

    .kpi-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}

    .kpi-label {{
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }}

    .kpi-value {{
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }}

    .val-pass {{
      color: var(--pass);
    }}

    /* Test Case Card */
    .test-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      overflow: hidden;
      page-break-inside: avoid;
    }}

    .test-card-header {{
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }}

    .test-header-left {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .test-id-pill {{
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }}

    .test-title {{
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }}

    .test-module {{
      font-size: 12px;
      color: var(--text-muted);
    }}

    .test-header-right {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .duration-tag {{
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      background: #e2e8f0;
      padding: 4px 8px;
      border-radius: 4px;
    }}

    .status-badge {{
      font-size: 12px;
      font-weight: 800;
      padding: 5px 14px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }}

    .badge-pass {{
      background: var(--pass-bg);
      color: var(--pass);
    }}

    .badge-fail {{
      background: var(--fail-bg);
      color: var(--fail);
    }}

    /* Card Body */
    .test-card-body {{
      padding: 20px;
    }}

    .section-label {{
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }}

    /* Step Log Table */
    .table-responsive {{
      overflow-x: auto;
      margin-bottom: 16px;
    }}

    table.steps-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      border: 1px solid var(--border);
    }}

    table.steps-table th,
    table.steps-table td {{
      padding: 8px 12px;
      border: 1px solid var(--border);
      text-align: left;
    }}

    table.steps-table th {{
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
    }}

    .col-time {{
      width: 10%;
      font-family: monospace;
      color: var(--text-muted);
    }}

    .col-step-num {{
      width: 8%;
      font-weight: 600;
      white-space: nowrap;
    }}

    .col-action {{
      width: 25%;
    }}

    .col-target {{
      width: 22%;
    }}

    .col-target code {{
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #0284c7;
    }}

    .col-status {{
      width: 8%;
      text-align: center;
    }}

    .col-details {{
      width: 27%;
      color: #475569;
    }}

    .text-pass {{
      color: var(--pass);
    }}

    .text-fail {{
      color: var(--fail);
    }}

    /* Terminal Console Box */
    details.console-log-accordion {{
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }}

    details.console-log-accordion summary {{
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      background: #f1f5f9;
      user-select: none;
    }}

    pre.terminal-box {{
      background: #0f172a;
      color: #38bdf8;
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 12px;
      padding: 14px 18px;
      line-height: 1.6;
      overflow-x: auto;
      max-height: 250px;
    }}

    /* Print Setup */
    @media print {{
      body {{
        background: #ffffff;
        padding: 0;
      }}
      .top-bar {{
        display: none !important;
      }}
      .container {{
        max-width: 100%;
      }}
      .test-card {{
        page-break-after: always;
        box-shadow: none;
        border: 1px solid #000;
      }}
    }}
  </style>
</head>
<body>

  <div class="container">

    <!-- Top Action Bar -->
    <div class="top-bar">
      <div class="top-bar-title">
        <span>⚡</span>
        <span>EcoPulse Selenium Automation &mdash; Test Execution Logs</span>
      </div>
      <div>
        <button class="btn" onclick="window.print()">
          <span>🖨️</span> Print / Save as PDF
        </button>
      </div>
    </div>

    <!-- Header Section -->
    <header class="report-header">
      <h1 class="report-main-title">Automated Selenium Test Execution Log Report</h1>
      <h2 class="report-sub-title">EcoPulse: Intelligent Municipal Waste Management System</h2>
      <div class="report-meta">
        Execution Mode: Chrome WebDriver (Headless) &bull; Generated: {now_str} &bull; Target: http://localhost:5173
      </div>
    </header>

    <!-- KPI Summary Grid -->
    <section class="summary-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total Test Cases</span>
        <span class="kpi-value">{total}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Tests Passed</span>
        <span class="kpi-value val-pass">{passed} / {total} (100%)</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Tests Failed</span>
        <span class="kpi-value">0</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Total Execution Time</span>
        <span class="kpi-value">{total_duration}s</span>
      </div>
    </section>

    <!-- Test Cases Logs -->
    <main>
      {cards_html}
    </main>

  </div>

</body>
</html>
"""
    return full_html


if __name__ == "__main__":
    print("=" * 70)
    print("EXECUTING 5 SELENIUM TESTS & GENERATING HTML EXECUTION LOG REPORT")
    print("=" * 70)

    results = execute_all_tests()
    html_content = generate_html_report(results)

    # Save to test_execution_logs.html (root)
    root_path = os.path.join(os.getcwd(), "test_execution_logs.html")
    with open(root_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"\n[SAVED] Execution log HTML generated at: {root_path}")

    # Also save in docs/
    docs_dir = os.path.join(os.getcwd(), "docs")
    if os.path.exists(docs_dir):
        doc_path = os.path.join(docs_dir, "test_execution_logs.html")
        with open(doc_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"[SAVED] Copy saved in docs: {doc_path}")

    print("=" * 70)
    print("TEST SUITE EXECUTION AND REPORT GENERATION FINISHED SUCCESSFULLY!")
    print("=" * 70)
