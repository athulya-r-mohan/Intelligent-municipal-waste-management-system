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

# Variation A: Citizen on Left, Staff & Recycler & Admin on Right, clean internal system boundary
puml_a = """@startuml
skinparam dpi 160
skinparam monochrome true
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 13
skinparam roundCorner 8
skinparam nodesep 25
skinparam ranksep 35

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

actor "Citizen\\n(Resident)" as citizen

rectangle "EcoPulse Municipal Waste Management System" {
  
  package "Citizen Services & AI" {
    usecase "Register & Login (JWT)" as UC_Auth_C
    usecase "Submit Waste Pickup Request" as UC_SubmitPickup
    usecase "Detect Waste via YOLO AI" as UC_YOLO
    usecase "Pay Pickup Fee (Rs. 50)" as UC_PayFee
    usecase "Track Pickup Request Status" as UC_TrackPickup
    usecase "Cancel Active Request" as UC_CancelPickup
    usecase "Register Waste Complaint" as UC_Complaint
    usecase "Submit Item for Reward Points" as UC_Reward
    usecase "Claim Reward Coupon" as UC_Coupon
  }

  package "Field Operations & Staff" {
    usecase "Staff Login (JWT)" as UC_Auth_S
    usecase "View Assigned Pickups & Schedule" as UC_StaffTasks
    usecase "View Optimized Route Preview" as UC_Route
    usecase "Update Status & Record Waste Weight" as UC_UpdateTask
    usecase "Resolve Complaint with Proof Photo" as UC_ResolveComp
    usecase "Log Daily Segregated MCF Waste" as UC_LogMCF
  }

  package "Administration & Recycling" {
    usecase "Admin Login (JWT)" as UC_Auth_A
    usecase "Assign Pickup to Staff & Set Date" as UC_AssignPickup
    usecase "Assign Complaint to Staff" as UC_AssignComp
    usecase "Manage MCF & Assign Recycler Batch" as UC_AssignRecycler
    usecase "Review & Allocate Reward Points" as UC_AllocateReward
    usecase "View System Analytics & Reports" as UC_Analytics
    usecase "Recycler Login (JWT)" as UC_Auth_R
    usecase "View Assigned Recycling Batches" as UC_RecyclerBatches
    usecase "Complete Recycling & Upload Certificate" as UC_CompleteRecycling
  }
}

actor "Collection Staff" as staff
actor "Administrator" as admin
actor "Recycler" as recycler

' Citizen Links
citizen --> UC_Auth_C
citizen --> UC_SubmitPickup
citizen --> UC_TrackPickup
citizen --> UC_Complaint
citizen --> UC_Reward
citizen --> UC_Coupon

UC_SubmitPickup ..> UC_YOLO : <<include>>
UC_SubmitPickup ..> UC_PayFee : <<include>>
UC_CancelPickup ..> UC_TrackPickup : <<extend>>

' Staff Links
UC_Auth_S <-- staff
UC_StaffTasks <-- staff
UC_UpdateTask <-- staff
UC_ResolveComp <-- staff
UC_LogMCF <-- staff
UC_StaffTasks ..> UC_Route : <<include>>

' Admin Links
UC_Auth_A <-- admin
UC_AssignPickup <-- admin
UC_AssignComp <-- admin
UC_AssignRecycler <-- admin
UC_AllocateReward <-- admin
UC_Analytics <-- admin

' Recycler Links
UC_Auth_R <-- recycler
UC_RecyclerBatches <-- recycler
UC_CompleteRecycling <-- recycler

@enduml
"""

render("test_a", puml_a)
