# EcoPulse Automated Selenium Test Suite

Automated end-to-end tests corresponding to the **5 QA Test Cases** in the [Test Execution Report](../test_report.html).

---

## 📋 Test Case Coverage

| Test Case ID | Module | Feature Tested |
| :--- | :--- | :--- |
| **TC #01** | Authentication | Citizen Login, JWT Token Verification & Role-based Navigation (`/login` -> `/user`) |
| **TC #02** | Waste Pickup | Image Upload, AI Material Detection, Slot Selection & Pickup Form (`/pickupform`) |
| **TC #03** | Waste Complaint | Grievance Category, Geolocation Tagging, Photo Proof & Complaint Submission (`/complaintform`) |
| **TC #04** | Admin Dispatch | Pending Pickup Inspection, Ward Staff Filtering & Task Assignment (`/assign`) |
| **TC #05** | Payments & Billing | Invoice Detail Inspection, Disposal Charge Checkout & Verification (`/payment/:id`) |

---

## 🚀 Setup & Execution

### 1. Install Dependencies
```bash
pip install -r tests/requirements.txt
```
*(Packages: `selenium`, `webdriver-manager`, `pytest`)*

### 2. Run All Tests (with Chrome UI)
```bash
python tests/test_waste_management.py
```

### 3. Run in Headless Mode (CI / Background)
```bash
# Windows PowerShell:
$env:HEADLESS="true"; python tests/test_waste_management.py

# Linux / macOS:
HEADLESS=true python tests/test_waste_management.py
```

### 4. Run with Pytest
```bash
pytest tests/test_waste_management.py -v
```

### 5. Configurable Environment Variables
You can pass custom URLs and credentials without altering the code:
- `APP_URL`: Base URL of the frontend (Default: `http://localhost:5173`)
- `API_URL`: Base URL of the backend (Default: `http://127.0.0.1:8000`)
- `HEADLESS`: `true` or `false` (Default: `false`)
- `CITIZEN_EMAIL`: Test citizen email
- `CITIZEN_PASS`: Test citizen password
- `ADMIN_EMAIL`: Test administrator email
- `ADMIN_PASS`: Test administrator password
