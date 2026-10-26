import os
import zlib
import requests
from PIL import Image

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

def render(name, puml):
    out_png = f"scratch/{name}.png"
    encoded = encode_plantuml(puml)
    r = requests.get(f"http://www.plantuml.com/plantuml/png/{encoded}", timeout=30)
    with open(out_png, "wb") as f:
        f.write(r.content)
    im = Image.open(out_png)
    print(f"{name}: size={im.size}")
    return out_png

puml_e = """@startuml
skinparam dpi 160
skinparam monochrome true
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 13
skinparam roundCorner 8
skinparam nodesep 20
skinparam ranksep 30

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
  ArrowColor #000000
}

skinparam package {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 14
  FontStyle bold
}

skinparam rectangle {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 16
  FontStyle bold
}

left to right direction

actor "Citizen" as citizen
actor "Collection Staff" as staff
actor "Municipal Administrator" as admin
actor "Recycling Partner" as recycler

rectangle "EcoPulse Intelligent Municipal Waste Management System" {
  
  package "Citizen Services & AI" as P_Citizen {
    usecase "Register & Login (JWT)" as UC_C1
    usecase "Submit Waste Pickup Request" as UC_C2
    usecase "Detect Waste via YOLO AI" as UC_C3
    usecase "Pay Pickup Fee (Rs. 50)" as UC_C4
    usecase "Track Pickup Request Status" as UC_C5
    usecase "Cancel Active Request" as UC_C6
    usecase "Register Waste Complaint" as UC_C7
    usecase "Submit Item for Reward Points" as UC_C8
    usecase "Claim Reward Coupon" as UC_C9
  }

  package "Field Collection & Operations" as P_Staff {
    usecase "Staff Login (JWT)" as UC_S1
    usecase "View Assigned Tasks & Date Schedule" as UC_S2
    usecase "Start Scheduled Collection Route" as UC_S3
    usecase "View Optimized Route Preview" as UC_S4
    usecase "Update Status & Record Waste Weight" as UC_S5
    usecase "Resolve Complaint with Proof Photo" as UC_S6
    usecase "Log Daily Segregated MCF Waste" as UC_S7
  }

  package "Administrative Management" as P_Admin {
    usecase "Admin Login (JWT)" as UC_A1
    usecase "Assign Pickup to Staff & Set Date" as UC_A2
    usecase "Assign Complaint to Staff" as UC_A3
    usecase "Manage MCF Totals & Assign Recycler" as UC_A4
    usecase "Review & Allocate Reward Points" as UC_A5
    usecase "View System Analytics & Reports" as UC_A6
  }

  package "MCF & Recycling Operations" as P_Recycler {
    usecase "Recycler Login (JWT)" as UC_R1
    usecase "View Assigned Recycling Batches" as UC_R2
    usecase "Complete Recycling & Upload Proof" as UC_R3
  }
}

' Citizen Relationships
citizen --> UC_C1
citizen --> UC_C2
citizen --> UC_C5
citizen --> UC_C7
citizen --> UC_C8
citizen --> UC_C9
UC_C2 ..> UC_C3 : <<include>>
UC_C2 ..> UC_C4 : <<include>>
UC_C6 ..> UC_C5 : <<extend>>

' Staff Relationships
staff --> UC_S1
staff --> UC_S2
staff --> UC_S3
staff --> UC_S5
staff --> UC_S6
staff --> UC_S7
UC_S3 ..> UC_S4 : <<include>>
UC_S5 ..> UC_S3 : <<extend>>

' Admin Relationships
admin --> UC_A1
admin --> UC_A2
admin --> UC_A3
admin --> UC_A4
admin --> UC_A5
admin --> UC_A6

' Recycler Relationships
recycler --> UC_R1
recycler --> UC_R2
recycler --> UC_R3

@enduml
"""

render("test_e", puml_e)
