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
    png_url = f"https://www.plantuml.com/plantuml/png/{encoded}"
    r_png = requests.get(png_url, timeout=30)
    png_path = os.path.join(DIAGRAMS_DIR, f"{name}.png")
    with open(png_path, "wb") as f:
        f.write(r_png.content)
        
    svg_url = f"https://www.plantuml.com/plantuml/svg/{encoded}"
    r_svg = requests.get(svg_url, timeout=30)
    svg_path = os.path.join(DIAGRAMS_DIR, f"{name}.svg")
    with open(svg_path, "wb") as f:
        f.write(r_svg.content)
        
    img = Image.open(png_path)
    print(f"[{name}] PNG Dimensions: {img.size} (Width x Height), Aspect Ratio: {img.size[1]/img.size[0]:.2f}")
    return img.size

# 1. Citizen Services & AI Subsystem
PUML_CITIZEN = """@startuml
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
actor "External AI &\\nPayment Gateway" as ext_gateway

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

# 2. Field Collection & Operations Subsystem
PUML_STAFF = """@startuml
title EcoPulse - Use Case Subdiagram\\nField Collection & Operations Subsystem

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
actor "Municipal Ward MCF\\n(Facility Node)" as mcf_facility

rectangle "Field Collection & Operations Subsystem" {
  usecase "Staff Login (JWT Authentication)" as US1
  usecase "View Assigned Tasks & Date Schedule" as US2
  usecase "Start Scheduled Collection Route" as US3
  usecase "View Optimized Route Preview" as US4
  usecase "Update Status & Record Waste Weight" as US5
  usecase "Resolve Complaint with Proof Photo" as US6
  usecase "Log Daily Segregated MCF Waste" as US7
}

staff --> US1
staff --> US2
staff --> US3
staff --> US5
staff --> US6
staff --> US7

US3 ..> US4 : <<include>>
US7 --> mcf_facility : Deposit Daily Segregated Waste

@enduml
"""

# 3. Municipal Administration & Recycling Partner Subsystem
PUML_ADMIN_REC = """@startuml
title EcoPulse - Use Case Subdiagram\\nMunicipal Administration & Recycling Partner Subsystem

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

actor "Municipal Administrator" as admin
actor "Recycling Partner" as recycler

rectangle "Municipal Administration & Recycling Subsystem" {
  
  ' Admin Use Cases (Top Group)
  usecase "Admin Login (JWT Authentication)" as UA1
  usecase "Assign Pickup to Staff & Set Date" as UA2
  usecase "Assign Complaint to Staff" as UA3
  usecase "Review & Allocate Reward Points" as UA4
  usecase "View System Analytics & Reports" as UA5
  usecase "Manage MCF Totals & Assign Recycler" as UA6

  ' Recycler Use Cases (Bottom Group)
  usecase "View Assigned Recycling Batches" as UR1
  usecase "Partner Login (JWT Authentication)" as UR2
  usecase "Complete Recycling & Upload Proof" as UR3
}

' Admin Connections (on left)
admin --> UA1
admin --> UA2
admin --> UA3
admin --> UA4
admin --> UA5
admin --> UA6

' Recycler Connections (on right)
UR1 <-- recycler
UR2 <-- recycler
UR3 <-- recycler

' Coordination Link
UA6 ..> UR1 : allocates batch

@enduml
"""

# 4. Master System Overview Use Case Diagram (Balanced 4-Actor Overview)
PUML_MASTER = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nSystem Use Case Diagram (Comprehensive Architecture)

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

skinparam package {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 14
  FontStyle bold
}

left to right direction

actor "Citizen" as citizen
actor "Collection Staff" as staff
actor "Municipal Administrator" as admin
actor "Recycling Partner" as recycler

rectangle "EcoPulse Intelligent Municipal Waste Management System" {

  package "Citizen Services" as P1 {
    usecase "Submit Waste Pickup Request\\n(AI Detection & Fee Payment)" as UC_C1
    usecase "Track Pickup Request Status" as UC_C2
    usecase "Register & Track Waste Grievance" as UC_C3
    usecase "Submit Recyclables for Rewards" as UC_C4
  }

  package "Field Operations" as P2 {
    usecase "View Assigned Tasks & Schedule" as UC_S1
    usecase "Execute Route & Record Waste Weight" as UC_S2
    usecase "Resolve Grievance with Proof Photo" as UC_S3
    usecase "Log Daily Segregated MCF Waste" as UC_S4
  }

  package "Municipal Administration" as P3 {
    usecase "Assign Pickup to Staff & Set Date" as UC_A1
    usecase "Assign Grievance to Ward Staff" as UC_A2
    usecase "Review & Allocate Reward Points" as UC_A3
    usecase "Manage MCF Totals & Assign Recycler" as UC_A4
    usecase "View Analytics & Operational Reports" as UC_A5
  }

  package "Recycling Operations" as P4 {
    usecase "View Assigned Recyclable Batches" as UC_R1
    usecase "Complete Recycling & Submit Proof" as UC_R2
  }
}

citizen --> UC_C1
citizen --> UC_C2
citizen --> UC_C3
citizen --> UC_C4

staff --> UC_S1
staff --> UC_S2
staff --> UC_S3
staff --> UC_S4

UC_A1 <-- admin
UC_A2 <-- admin
UC_A3 <-- admin
UC_A4 <-- admin
UC_A5 <-- admin

UC_R1 <-- recycler
UC_R2 <-- recycler

UC_A4 ..> UC_R1 : allocates

@enduml
"""

if __name__ == "__main__":
    render("01_Use_Case_Diagram", PUML_MASTER)
    render("01a_Use_Case_Citizen_Subsystem", PUML_CITIZEN)
    render("01b_Use_Case_Staff_Operations", PUML_STAFF)
    render("01c_Use_Case_Admin_and_Recycling", PUML_ADMIN_REC)
