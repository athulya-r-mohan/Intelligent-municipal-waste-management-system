import os
import zlib
import requests
from PIL import Image

DIAGRAMS_DIR = os.path.dirname(os.path.abspath(__file__))

def encode_6bit(b):
    if b < 10: return chr(48 + b)
    b -= 10
    if b < 26: return chr(65 + b)
    b -= 26
    if b < 26: return chr(97 + b)
    b -= 26
    if b == 0: return '-'
    if b == 1: return '_'
    return '?'

def append3bytes(b1, b2, b3):
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F
    return encode_6bit(c1 & 0x3F) + encode_6bit(c2 & 0x3F) + encode_6bit(c3 & 0x3F) + encode_6bit(c4 & 0x3F)

def encode_plantuml(text):
    z = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=-15)
    compressed = z.compress(text.encode('utf-8')) + z.flush()
    res = []
    for i in range(0, len(compressed), 3):
        b1 = compressed[i]
        b2 = compressed[i+1] if i+1 < len(compressed) else 0
        b3 = compressed[i+2] if i+2 < len(compressed) else 0
        res.append(append3bytes(b1, b2, b3))
    return ''.join(res)

def render(name, puml_content):
    puml_path = os.path.join(DIAGRAMS_DIR, f"{name}.puml")
    with open(puml_path, "w", encoding="utf-8") as f:
        f.write(puml_content)
        
    encoded = encode_plantuml(puml_content)
    
    # SVG
    svg_url = f"https://www.plantuml.com/plantuml/svg/{encoded}"
    r_svg = requests.get(svg_url, timeout=30)
    svg_path = os.path.join(DIAGRAMS_DIR, f"{name}.svg")
    with open(svg_path, "wb") as f:
        f.write(r_svg.content)
        
    # PNG
    png_url = f"https://www.plantuml.com/plantuml/png/{encoded}"
    r_png = requests.get(png_url, timeout=30)
    png_path = os.path.join(DIAGRAMS_DIR, f"{name}.png")
    with open(png_path, "wb") as f:
        f.write(r_png.content)
        
    img = Image.open(png_path)
    print(f"[{name}] PNG Dimensions: {img.size} (Width x Height), Aspect Ratio: {img.size[1]/img.size[0]:.2f}")
    return img.size

# 1. System Overview Use Case Diagram (Fits Portrait A4 perfectly, large 15-16pt font, no clutter)
PUML_OVERVIEW = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nUse Case Diagram (System Overview)

skinparam dpi 160
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam roundCorner 8

skinparam actor {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

skinparam usecase {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  FontStyle bold
  ArrowColor #000000
}

skinparam rectangle {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

left to right direction

actor "Citizen" as citizen
actor "Collection Staff" as staff
actor "Municipal Administrator" as admin
actor "Recycling Partner" as recycler

rectangle "EcoPulse Intelligent Municipal Waste Management System" {
  
  ' Citizen Core
  usecase "Register & Authenticate (JWT)" as UC_AUTH
  usecase "Submit Waste Pickup Request\\n(with YOLO AI & Payment)" as UC_PICKUP
  usecase "Track & Manage Pickup Requests" as UC_TRACK
  usecase "Register & Track Waste Grievance" as UC_COMPLAINT
  usecase "Submit Recyclables for Rewards" as UC_REWARD

  ' Staff Core
  usecase "View Assigned Tasks & Schedule" as UC_STAFF_TASKS
  usecase "Execute Route & Record Collection Weight" as UC_STAFF_COLLECT
  usecase "Resolve Grievance with Proof Photo" as UC_STAFF_RESOLVE
  usecase "Log Daily Segregated MCF Waste" as UC_STAFF_MCF

  ' Admin Core
  usecase "Assign Pickup to Staff & Set Date" as UC_ADMIN_ASSIGN
  usecase "Assign Grievance to Ward Staff" as UC_ADMIN_COMPLAINT
  usecase "Manage MCF Inventory & Allocate Recycler" as UC_ADMIN_MCF
  usecase "Review & Allocate Reward Points" as UC_ADMIN_REWARD
  usecase "Monitor Analytics & Municipal Reports" as UC_ADMIN_ANALYTICS

  ' Recycler Core
  usecase "View Assigned Recyclable Batches" as UC_REC_VIEW
  usecase "Complete Recycling & Submit Verification" as UC_REC_COMPLETE
}

' Positioning: arrange vertically in natural groups
citizen --> UC_AUTH
citizen --> UC_PICKUP
citizen --> UC_TRACK
citizen --> UC_COMPLAINT
citizen --> UC_REWARD

staff --> UC_AUTH
staff --> UC_STAFF_TASKS
staff --> UC_STAFF_COLLECT
staff --> UC_STAFF_RESOLVE
staff --> UC_STAFF_MCF

UC_AUTH <-- admin
UC_ADMIN_ASSIGN <-- admin
UC_ADMIN_COMPLAINT <-- admin
UC_ADMIN_MCF <-- admin
UC_ADMIN_REWARD <-- admin
UC_ADMIN_ANALYTICS <-- admin

UC_AUTH <-- recycler
UC_REC_VIEW <-- recycler
UC_REC_COMPLETE <-- recycler

@enduml
"""

# 2. Detailed Subdiagram 1: Citizen Services & AI Subsystem
PUML_SUB_CITIZEN = """@startuml
title EcoPulse - Use Case Subdiagram\\nCitizen Services & AI Subsystem

skinparam dpi 160
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam roundCorner 8

skinparam actor {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

skinparam usecase {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  FontStyle bold
  ArrowColor #000000
  ArrowFontSize 11
}

skinparam rectangle {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

left to right direction

actor "Citizen" as citizen
actor "AI & Payment Gateway\\n(External Service)" as ext_gateway

rectangle "Citizen Services & AI Subsystem" {
  usecase "Register & Login (JWT)" as UC1
  usecase "Submit Waste Pickup Request" as UC2
  usecase "Detect Waste via YOLO AI" as UC3
  usecase "Pay Pickup Fee (Rs. 50 via Razorpay)" as UC4
  usecase "Track Pickup Request Status" as UC5
  usecase "Cancel Active Pickup Request" as UC6
  usecase "Register Waste Complaint" as UC7
  usecase "Track Waste Complaint Status" as UC8
  usecase "Submit Item for Reward Points" as UC9
  usecase "Claim Reward Coupon" as UC10
}

citizen --> UC1
citizen --> UC2
citizen --> UC5
citizen --> UC7
citizen --> UC8
citizen --> UC9
citizen --> UC10

UC2 ..> UC3 : <<include>>
UC2 ..> UC4 : <<include>>
UC6 ..> UC5 : <<extend>>

UC3 --> ext_gateway : YOLOv8 Inference
UC4 --> ext_gateway : Razorpay API

@enduml
"""

# 3. Detailed Subdiagram 2: Operations, Administration & Recycling Subsystem
PUML_SUB_OPS = """@startuml
title EcoPulse - Use Case Subdiagram\\nField Operations, Municipal Administration & Recycling Subsystem

skinparam dpi 160
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam roundCorner 8

skinparam actor {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

skinparam usecase {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  FontStyle bold
  ArrowColor #000000
  ArrowFontSize 11
}

skinparam rectangle {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

left to right direction

actor "Collection Staff" as staff
actor "Municipal Administrator" as admin
actor "Recycling Partner" as recycler

rectangle "Operations, Administration & Recycling Subsystem" {
  
  ' Staff Operations
  usecase "Staff Login (JWT)" as US1
  usecase "View Assigned Tasks & Schedule" as US2
  usecase "Start Scheduled Collection Route" as US3
  usecase "View Optimized Route Preview" as US4
  usecase "Update Status & Record Waste Weight" as US5
  usecase "Resolve Complaint with Proof Photo" as US6
  usecase "Log Daily Segregated MCF Waste" as US7

  ' Admin Management
  usecase "Admin Login (JWT)" as UA1
  usecase "Assign Pickup to Staff & Set Date" as UA2
  usecase "Assign Complaint to Staff" as UA3
  usecase "Manage MCF Totals & Assign Recycler" as UA4
  usecase "Review & Allocate Reward Points" as UA5
  usecase "View System Analytics & Reports" as UA6

  ' Recycling Partner Operations
  usecase "Recycler Login (JWT)" as UR1
  usecase "View Assigned Recycling Batches" as UR2
  usecase "Complete Recycling & Upload Proof" as UR3
}

' Staff
staff --> US1
staff --> US2
staff --> US3
staff --> US5
staff --> US6
staff --> US7

US3 ..> US4 : <<include>>

' Admin
UA1 <-- admin
UA2 <-- admin
UA3 <-- admin
UA4 <-- admin
UA5 <-- admin
UA6 <-- admin

' Recycler
UR1 <-- recycler
UR2 <-- recycler
UR3 <-- recycler

' Shared workflows between actors
UA2 ..> US2 : triggers assignment
UA4 ..> UR2 : allocates batch

@enduml
"""

if __name__ == "__main__":
    render("01_Use_Case_Overview", PUML_OVERVIEW)
    render("01a_Use_Case_Citizen_Subsystem", PUML_SUB_CITIZEN)
    render("01b_Use_Case_Operations_Subsystem", PUML_SUB_OPS)
