import sys, os
import zlib, requests
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

puml = '''@startuml
title EcoPulse - Use Case Diagram (Municipal Waste Management System)

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
  FontSize 15
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
actor "Administrator" as admin

rectangle "EcoPulse Municipal Waste Management Platform" {

  together {
    package "Citizen Services & AI Subsystem" as PKG_CITIZEN {
      usecase "Register & Authenticate (JWT)" as UC_Auth_C
      usecase "Submit Waste Pickup Request" as UC_SubmitPickup
      usecase "Detect Waste via YOLO AI" as UC_YOLO
      usecase "Pay Pickup Fee (Rs. 50)" as UC_PayFee
      usecase "Track Pickup Request Status" as UC_TrackPickup
      usecase "Cancel Active Pickup Request" as UC_CancelPickup
      usecase "Register Waste Complaint" as UC_SubmitComplaint
      usecase "Track Complaint Status" as UC_TrackComplaint
      usecase "Submit Item for Reward Points" as UC_SubmitReward
      usecase "Claim Reward Coupon" as UC_ClaimReward
    }

    package "Administrative Management Subsystem" as PKG_ADMIN {
      usecase "Admin Authentication (JWT)" as UC_Auth_A
      usecase "Assign Pickup to Staff & Set Date" as UC_AssignPickup
      usecase "Assign Complaint to Staff" as UC_AssignComplaint
      usecase "Manage MCF Totals & Assign Recycler" as UC_AssignRecycler
      usecase "Review & Allocate Reward Points" as UC_AllocateReward
      usecase "View System Analytics & Reports" as UC_Analytics
    }
  }

  together {
    package "Field Collection & Staff Subsystem" as PKG_STAFF {
      usecase "Staff Authentication (JWT)" as UC_Auth_S
      usecase "View Assigned Tasks & Date Schedule" as UC_ViewStaffTasks
      usecase "Start Scheduled Date Collection" as UC_StartRoute
      usecase "View Optimized Route Preview" as UC_OptimizeRoute
      usecase "Update Task Status & Record Weight" as UC_UpdateTask
      usecase "Resolve Complaint with Proof Photo" as UC_ResolveComplaint
      usecase "Log Daily Segregated MCF Waste" as UC_LogMCF
    }

    package "MCF & Recycling Subsystem" as PKG_RECYCLER {
      usecase "Recycler Authentication (JWT)" as UC_Auth_R
      usecase "View Assigned Recycling Batches" as UC_ViewRecyclerTasks
      usecase "Complete Recycling & Upload Proof" as UC_CompleteRecycling
    }
  }

  PKG_CITIZEN -[hidden]down-> PKG_ADMIN
  PKG_STAFF -[hidden]down-> PKG_RECYCLER
  PKG_CITIZEN -[hidden]right-> PKG_STAFF
}

actor "Collection Staff" as staff
actor "Recycler" as recycler

' Citizen Links
citizen --> UC_Auth_C
citizen --> UC_SubmitPickup
citizen --> UC_TrackPickup
citizen --> UC_SubmitComplaint
citizen --> UC_TrackComplaint
citizen --> UC_SubmitReward
citizen --> UC_ClaimReward

UC_SubmitPickup .down.> UC_YOLO : <<include>>
UC_SubmitPickup .down.> UC_PayFee : <<include>>
UC_CancelPickup .up.> UC_TrackPickup : <<extend>>

' Admin Links
admin --> UC_Auth_A
admin --> UC_AssignPickup
admin --> UC_AssignComplaint
admin --> UC_AssignRecycler
admin --> UC_AllocateReward
admin --> UC_Analytics

' Staff Links
staff -left-> UC_Auth_S
staff -left-> UC_ViewStaffTasks
staff -left-> UC_StartRoute
staff -left-> UC_UpdateTask
staff -left-> UC_ResolveComplaint
staff -left-> UC_LogMCF

UC_StartRoute .down.> UC_OptimizeRoute : <<include>>
UC_UpdateTask .up.> UC_StartRoute : <<extend>>

' Recycler Links
recycler -left-> UC_Auth_R
recycler -left-> UC_ViewRecyclerTasks
recycler -left-> UC_CompleteRecycling

@enduml
'''

enc = encode_plantuml(puml)
r = requests.get(f"http://www.plantuml.com/plantuml/png/{enc}", timeout=40)
with open("scratch/test_grid.png", "wb") as f:
    f.write(r.content)
im = Image.open("scratch/test_grid.png")
print("Image Size:", im.size)
