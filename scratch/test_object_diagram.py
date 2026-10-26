import os
import zlib
import requests
from PIL import Image

DIAGRAMS_DIR = r"c:\Users\acer\OneDrive\Desktop\projects\waste-management-system\docs\uml-diagrams"

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

PUML = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nObject Diagram (Runtime Instance Model - End-to-End Collection & MCF Transfer)

skinparam dpi 160
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 12
skinparam roundCorner 6
skinparam nodesep 28
skinparam ranksep 35

skinparam object {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 12
  FontStyle normal
  AttributeFontColor #000000
  AttributeFontSize 11
  ArrowColor #000000
}

skinparam package {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  FontStyle bold
}

' ==========================================
' SUBSYSTEM 1 (LEFT): CITIZEN & COMMUNITY
' ==========================================
package "Citizen & Community Subsystem" {
  object "citizenUser : User" as u1 {
    id = 101
    username = "rahul_sharma"
    email = "rahul@ecopulse.in"
    is_active = True
  }

  object "citizenProfile : UserProfile" as up1 {
    id = 101
    name = "Rahul Sharma"
    phone = "+91 98765 43210"
    address = "42 Green Park, Ward 4"
    role = "CITIZEN"
  }

  object "notif_77 : Notification" as notif1 {
    id = 77
    title = "Pickup Completed"
    message = "Request #802 collected successfully"
    notification_type = "PICKUP_COMPLETED"
    is_read = True
  }

  object "ward04 : Ward" as w4 {
    ward_id = 4
    ward_number = 4
    ward_name = "Central Ward"
    location = "Kochi Central"
    mcf_location_name = "Central MCF Hub #4"
  }

  object "complaint_24 : WasteComplaint" as comp1 {
    id = 24
    location_name = "Green Park Market Corner"
    description = "Bin overflow near market gate"
    priority = "HIGH"
    status = "RESOLVED"
  }

  object "reward_108 : RewardSubmission" as rwd1 {
    id = 108
    bin_location = "Ward 4 Smart Drop Bin"
    waste_type = "PLASTIC_BOTTLE"
    points = 50
    status = "APPROVED"
    valid_till = 2026-11-25
  }

  u1 -- up1 : has
  up1 -- w4 : resides in
  u1 -- notif1 : receives
  u1 -- comp1 : lodges
  u1 -- rwd1 : submits

  u1 -[hidden]down-> up1
  up1 -[hidden]down-> w4
  notif1 -[hidden]down-> comp1
  comp1 -[hidden]down-> rwd1
}

' ==========================================
' SUBSYSTEM 2 (CENTER): PICKUP & FULFILLMENT
' ==========================================
package "Doorstep Pickup & Fulfillment Subsystem" {
  object "staffUser : User" as su1 {
    id = 202
    username = "anand_kumar"
    email = "anand.k@ecopulse.in"
    is_active = True
  }

  object "staff_07 : Staff" as s1 {
    staff_id = 7
    phone = "+91 94471 22334"
    designation = "Sanitation Field Officer"
    date_of_joining = 2024-03-15
  }

  object "pickupReq_802 : WastePickupRequest" as req1 {
    id = 802
    location_name = "42 Green Park Gate"
    latitude = 9.9820
    longitude = 76.3015
    status = "COMPLETED"
    scheduled_pickup_date = 2026-10-25
  }

  object "wasteImg_12 : WastePickupImage" as img1 {
    id = 12
    waste_type = "PLASTIC"
    confidence = 0.94
    detections = "{'bottles': 8, 'covers': 12}"
  }

  object "payment_401 : Payment" as pay1 {
    id = 401
    amount = 50.00
    payment_status = "SUCCESS"
    payment_id = "PAY_ECO_8921"
    transaction_id = "TXN_UPI_99210"
    payment_date = "2026-10-25 09:15"
  }

  object "collection_55 : WasteCollection" as col1 {
    id = 55
    estimated_weight = "14.50 kg"
    completed_at = "2026-10-25 14:30"
  }

  su1 -- s1 : extends
  req1 *-- img1 : includes
  req1 -- pay1 : requires
  req1 -- col1 : fulfilled by
  s1 -- req1 : assigned to
  s1 -- col1 : executes

  su1 -[hidden]down-> s1
  s1 -[hidden]down-> req1
}

' ==========================================
' SUBSYSTEM 3 (RIGHT): MCF & RECYCLER
' ==========================================
package "MCF Facility & Recycler Subsystem" {
  object "mcfCol_33 : StaffMCFCollection" as mcf1 {
    id = 33
    date = 2026-10-25
    plastic = "85.50 kg"
    paper = "42.00 kg"
    glass = "18.00 kg"
    total_quantity = "278.00 kg"
  }

  object "mcfAssign_19 : MCFRecyclerAssignment" as mcfA1 {
    id = 19
    date = 2026-10-25
    waste_type = "PLASTIC"
    total_quantity = "85.50 kg"
    recyclable_quantity = "82.00 kg"
    status = "IN_TRANSIT"
  }

  object "recycler_03 : Recycler" as rc1 {
    recycler_id = 3
    organization = "CleanEarth Polymers Ltd"
    waste_type = "PLASTIC"
    date_of_registration = 2024-01-10
  }

  mcf1 -- mcfA1 : segregated to
  rc1 -- mcfA1 : fulfills

  mcf1 -[hidden]down-> mcfA1
  mcfA1 -[hidden]down-> rc1
}

' ==========================================
' SUBSYSTEM ALIGNMENT (LEFT TO RIGHT FLOW)
' ==========================================
"Citizen & Community Subsystem" -[hidden]right-> "Doorstep Pickup & Fulfillment Subsystem"
"Doorstep Pickup & Fulfillment Subsystem" -[hidden]right-> "MCF Facility & Recycler Subsystem"

' ==========================================
' CROSS-SUBSYSTEM ASSOCIATIONS (ADJACENT ONLY)
' ==========================================
' Subsystem 1 <--> Subsystem 2:
u1 -- req1 : requests
s1 -- w4 : assigned ward
s1 -- comp1 : resolves

' Subsystem 2 <--> Subsystem 3:
s1 -- mcf1 : logs to MCF

@enduml
"""

out_puml = os.path.join(DIAGRAMS_DIR, "09_Object_Diagram.puml")
out_png = os.path.join(DIAGRAMS_DIR, "09_Object_Diagram.png")
out_svg = os.path.join(DIAGRAMS_DIR, "09_Object_Diagram.svg")

with open(out_puml, "w", encoding="utf-8") as f:
    f.write(PUML.strip() + "\n")

encoded = encode_plantuml(PUML)

r_svg = requests.get(f"http://www.plantuml.com/plantuml/svg/{encoded}", timeout=40)
if r_svg.status_code == 200:
    with open(out_svg, "wb") as f:
        f.write(r_svg.content)

r_png = requests.get(f"http://www.plantuml.com/plantuml/png/{encoded}", timeout=40)
if r_png.status_code == 200:
    with open(out_png, "wb") as f:
        f.write(r_png.content)
    im = Image.open(out_png)
    print(f"PNG dimensions: {im.size}")
