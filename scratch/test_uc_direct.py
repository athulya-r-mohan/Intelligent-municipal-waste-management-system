import sys, os
sys.path.append('docs/uml-diagrams')
import build_all_diagrams
from PIL import Image

test_puml = """@startuml
title EcoPulse - Use Case Diagram (Municipal Waste Management System)

skinparam dpi 300
skinparam monochrome true
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 8
skinparam nodesep 30
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

rectangle "EcoPulse Waste Management Platform" {

  ' Citizen Use Cases
  usecase "Register & Authenticate (JWT)" as UC_Auth
  usecase "Manage User Profile & Ward" as UC_Profile
  usecase "Submit Waste Pickup Request" as UC_SubmitPickup
  usecase "Detect Waste via YOLO AI" as UC_YOLO
  usecase "Pay Fixed Pickup Fee (Rs. 50)" as UC_PayFee
  usecase "Track Pickup Request Status" as UC_TrackPickup
  usecase "Cancel Active Pickup Request" as UC_CancelPickup
  usecase "Register Waste Complaint" as UC_SubmitComplaint
  usecase "Track Complaint Status" as UC_TrackComplaint
  usecase "Submit Recyclable Item for Reward" as UC_SubmitReward
  usecase "Claim Reward Coupon" as UC_ClaimReward

  ' Staff Use Cases
  usecase "View Assigned Tasks & Date Schedule" as UC_ViewStaffTasks
  usecase "View Optimized Route Preview" as UC_OptimizeRoute
  usecase "Start Scheduled Date Collection" as UC_StartRoute
  usecase "Update Task Status & Record Weight" as UC_UpdateTask
  usecase "Resolve Assigned Complaint with Proof" as UC_ResolveComplaint

  ' Admin Use Cases
  usecase "Assign Pickup to Staff & Set Date" as UC_AssignPickup
  usecase "Assign Complaint to Staff" as UC_AssignComplaint
  usecase "Manage MCF Totals & Assign Recycler" as UC_AssignRecycler
  usecase "Review & Allocate Reward Points" as UC_AllocateReward
  usecase "View System Analytics & Reports" as UC_Analytics

  ' MCF & Recycler Use Cases
  usecase "Log Daily MCF Segregated Waste" as UC_LogMCF
  usecase "View Assigned Recycling Batches" as UC_ViewRecyclerTasks
  usecase "Complete Recycling & Upload Proof" as UC_CompleteRecycling
}

actor "Collection Staff" as staff
actor "Recycler" as recycler

' Citizen Links
citizen --> UC_Auth
citizen --> UC_Profile
citizen --> UC_SubmitPickup
citizen --> UC_TrackPickup
citizen --> UC_SubmitComplaint
citizen --> UC_TrackComplaint
citizen --> UC_SubmitReward
citizen --> UC_ClaimReward

' Includes & Extends
UC_SubmitPickup ..> UC_YOLO : <<include>>
UC_SubmitPickup ..> UC_PayFee : <<include>>
UC_CancelPickup ..> UC_TrackPickup : <<extend>>
UC_StartRoute ..> UC_OptimizeRoute : <<include>>
UC_UpdateTask ..> UC_StartRoute : <<extend>>

' Admin Links
admin --> UC_Auth
admin --> UC_AssignPickup
admin --> UC_AssignComplaint
admin --> UC_AssignRecycler
admin --> UC_AllocateReward
admin --> UC_Analytics

' Staff Links
UC_Auth <-- staff
UC_ViewStaffTasks <-- staff
UC_StartRoute <-- staff
UC_UpdateTask <-- staff
UC_ResolveComplaint <-- staff
UC_LogMCF <-- staff

' Recycler Links
UC_Auth <-- recycler
UC_ViewRecyclerTasks <-- recycler
UC_CompleteRecycling <-- recycler

@enduml"""

build_all_diagrams.render_diagram('test_use_case', test_puml)
im = Image.open('docs/uml-diagrams/test_use_case.png')
print(f'Direct Use Case Dimensions: {im.size[0]}x{im.size[1]}, Aspect: {im.size[0]/im.size[1]:.2f}')
