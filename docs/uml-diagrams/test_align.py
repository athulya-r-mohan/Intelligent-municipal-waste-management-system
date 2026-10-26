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

# Refined Master System Use Case Diagram with 2-column rank anchors
PUML_MASTER = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nSystem Use Case Diagram (Architectural Overview)

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
  
  ' Left Column: Citizen & Staff Use Cases
  together {
    usecase "Submit Waste Pickup Request\\n(with YOLO AI & Payment)" as UC_C1
    usecase "Track Pickup Request Status" as UC_C2
    usecase "Register & Track Waste Grievance" as UC_C3
    usecase "Submit Recyclables for Rewards" as UC_C4
    
    usecase "View Assigned Tasks & Schedule" as UC_S1
    usecase "Execute Route & Record Waste Weight" as UC_S2
    usecase "Resolve Grievance with Proof Photo" as UC_S3
    usecase "Log Daily Segregated MCF Waste" as UC_S4
  }

  ' Right Column: Admin & Recycler Use Cases
  together {
    usecase "Assign Pickup to Staff & Set Date" as UC_A1
    usecase "Assign Grievance to Ward Staff" as UC_A2
    usecase "Review & Allocate Reward Points" as UC_A3
    usecase "Manage MCF Totals & Assign Recycler" as UC_A4
    usecase "Monitor Analytics & Municipal Reports" as UC_A5

    usecase "View Assigned Recyclable Batches" as UC_R1
    usecase "Complete Recycling & Submit Proof" as UC_R2
  }
}

' Column alignment anchors
UC_C1 -[hidden]right-> UC_A1
UC_C2 -[hidden]right-> UC_A2
UC_C3 -[hidden]right-> UC_A3
UC_C4 -[hidden]right-> UC_A4
UC_S1 -[hidden]right-> UC_A5
UC_S2 -[hidden]right-> UC_R1
UC_S3 -[hidden]right-> UC_R2

' Vertical flow
citizen -[hidden]down-> staff
admin -[hidden]down-> recycler

UC_C4 -[hidden]down-> UC_S1
UC_A5 -[hidden]down-> UC_R1

' Left-side connections
citizen --> UC_C1
citizen --> UC_C2
citizen --> UC_C3
citizen --> UC_C4

staff --> UC_S1
staff --> UC_S2
staff --> UC_S3
staff --> UC_S4

' Right-side connections
UC_A1 <-- admin
UC_A2 <-- admin
UC_A3 <-- admin
UC_A4 <-- admin
UC_A5 <-- admin

UC_R1 <-- recycler
UC_R2 <-- recycler

' Cross-subsystem link
UC_A4 ..> UC_R1 : allocates

@enduml
"""

# Refined Staff Subdiagram with cleaner mcf_facility placement
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

US7 --> mcf_facility : <<deposit tonnage>>
US4 -[hidden]down-> mcf_facility

@enduml
"""

if __name__ == "__main__":
    render("01_Use_Case_Diagram", PUML_MASTER)
    render("01b_Use_Case_Staff_Operations", PUML_STAFF)
