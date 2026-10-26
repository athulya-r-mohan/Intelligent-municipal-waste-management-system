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

# What if:
# Citizen (Top-Left) -> Citizen Services (Top-Center)
# Staff (Bottom-Left) -> Staff Operations (Bottom-Center)
# Admin (Top-Right) -> Admin Services (Top-Right-Center)
# Recycler (Bottom-Right) -> Recycler Services (Bottom-Right-Center)
# OR what if we use top to bottom direction?
# Let's test top-to-bottom!

puml_c = """@startuml
skinparam dpi 160
skinparam monochrome true
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 13
skinparam roundCorner 8
skinparam nodesep 30
skinparam ranksep 40

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

skinparam rectangle {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

actor "Citizen" as citizen
actor "Collection Staff" as staff
actor "Municipal Admin" as admin
actor "Recycling Partner" as recycler

rectangle "EcoPulse Municipal Waste Management System" {
  
  package "Citizen Services" {
    usecase "Register / Login" as UC_C1
    usecase "Submit Waste Pickup" as UC_C2
    usecase "Detect Waste via YOLO AI" as UC_C3
    usecase "Pay Rs. 50 Fee" as UC_C4
    usecase "Track Pickup Status" as UC_C5
    usecase "Cancel Pickup" as UC_C6
    usecase "File Waste Complaint" as UC_C7
    usecase "Redeem Reward Points" as UC_C8
  }

  package "Field Operations" {
    usecase "Staff Login" as UC_S1
    usecase "View Assigned Schedule" as UC_S2
    usecase "View Optimized Route" as UC_S3
    usecase "Update Pickup & Record Weight" as UC_S4
    usecase "Resolve Complaint with Photo" as UC_S5
    usecase "Log Daily MCF Segregation" as UC_S6
  }

  package "Administration & Recycling" {
    usecase "Admin Dashboard & Reports" as UC_A1
    usecase "Assign Pickup to Staff" as UC_A2
    usecase "Assign Complaint to Staff" as UC_A3
    usecase "Allocate Citizen Points" as UC_A4
    usecase "Dispatch MCF Batches" as UC_A5
    usecase "Recycler Login" as UC_R1
    usecase "Process Batch & Upload Proof" as UC_R2
  }
}

citizen --> UC_C1
citizen --> UC_C2
citizen --> UC_C5
citizen --> UC_C7
citizen --> UC_C8
UC_C2 ..> UC_C3 : <<include>>
UC_C2 ..> UC_C4 : <<include>>
UC_C6 ..> UC_C5 : <<extend>>

staff --> UC_S1
staff --> UC_S2
staff --> UC_S4
staff --> UC_S5
staff --> UC_S6
UC_S2 ..> UC_S3 : <<include>>

admin --> UC_A1
admin --> UC_A2
admin --> UC_A3
admin --> UC_A4
admin --> UC_A5

recycler --> UC_R1
recycler --> UC_R2
@enduml
"""

render("test_c", puml_c)
