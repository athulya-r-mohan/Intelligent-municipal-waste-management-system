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

# Test Layout 1: Left-to-Right without nested packages, but with rectangles side by side or logical grouping
puml1 = """@startuml
skinparam dpi 150
skinparam monochrome true
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontSize 13
left to right direction

actor "Citizen" as citizen
actor "Collection Staff" as staff
actor "Recycler" as recycler
actor "Administrator" as admin

rectangle "Citizen Services" as box1 {
  usecase "Register & Login" as UC1
  usecase "Submit Waste Pickup Request" as UC2
  usecase "Detect Waste via YOLO AI" as UC3
  usecase "Pay Pickup Fee" as UC4
  usecase "Track Pickup Request" as UC5
  usecase "Cancel Request" as UC6
  usecase "Report Waste Complaint" as UC7
  usecase "Submit Item for Reward" as UC8
  usecase "Claim Reward Coupon" as UC9
}

rectangle "Staff Operations" as box2 {
  usecase "Staff Login" as UC10
  usecase "View Assigned Pickups" as UC11
  usecase "View Optimized Route" as UC12
  usecase "Update Pickup & Record Weight" as UC13
  usecase "Resolve Complaint with Photo" as UC14
  usecase "Log Daily Segregated MCF Waste" as UC15
}

rectangle "Admin & Recycling" as box3 {
  usecase "Admin Login" as UC16
  usecase "Assign Pickups to Staff" as UC17
  usecase "Assign Complaints" as UC18
  usecase "Assign Recycler Batches" as UC19
  usecase "Allocate Reward Points" as UC20
  usecase "View System Analytics" as UC21
  usecase "Recycler Login" as UC22
  usecase "View Assigned Batches" as UC23
  usecase "Complete Recycling & Proof" as UC24
}

citizen --> UC1
citizen --> UC2
citizen --> UC5
citizen --> UC7
citizen --> UC8
citizen --> UC9

UC2 ..> UC3 : <<include>>
UC2 ..> UC4 : <<include>>
UC6 ..> UC5 : <<extend>>

staff --> UC10
staff --> UC11
staff --> UC13
staff --> UC14
staff --> UC15
UC11 ..> UC12 : <<include>>

admin --> UC16
admin --> UC17
admin --> UC18
admin --> UC19
admin --> UC20
admin --> UC21

recycler --> UC22
recycler --> UC23
recycler --> UC24

box1 -[hidden]down-> box2
box2 -[hidden]down-> box3
@enduml
"""

render("test1", puml1)
