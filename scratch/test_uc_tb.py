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
skinparam nodesep 40
skinparam ranksep 45

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

' System boundary with 4 primary actors
actor "Citizen" as citizen
actor "Municipal Administrator" as admin
actor "Collection Staff" as staff
actor "Recycler" as recycler

rectangle "EcoPulse Waste Management System" {
  package "Citizen Services" {
    usecase "Submit Waste Pickup Request" as UC_SubmitPickup
    usecase "Detect Waste via YOLO AI" as UC_YOLO
    usecase "Pay Fixed Pickup Fee (Rs. 50)" as UC_PayFee
    usecase "Track Pickup Request Status" as UC_TrackPickup
    usecase "Cancel Active Pickup Request" as UC_CancelPickup
    usecase "Register Waste Complaint" as UC_SubmitComplaint
    usecase "Track Complaint Status" as UC_TrackComplaint
    usecase "Submit Recyclable Item for Reward" as UC_SubmitReward
    usecase "Claim Reward Coupon" as UC_ClaimReward
  }

  package "Field Operations" {
    usecase "View Assigned Tasks & Date Schedule" as UC_ViewStaffTasks
    usecase "View Optimized Route Preview" as UC_OptimizeRoute
    usecase "Start Scheduled Date Collection" as UC_StartRoute
    usecase "Update Task Status & Record Weight" as UC_UpdateTask
    usecase "Resolve Assigned Complaint with Proof" as UC_ResolveComplaint
  }

  package "Administration & Recycling" {
    usecase "Assign Pickup to Staff & Set Date" as UC_AssignPickup
    usecase "Assign Complaint to Staff" as UC_AssignComplaint
    usecase "Manage MCF Totals & Assign Recycler" as UC_AssignRecycler
    usecase "Review & Allocate Reward Points" as UC_AllocateReward
    usecase "View System Analytics & Reports" as UC_Analytics
    usecase "Log Daily MCF Segregated Waste" as UC_LogMCF
    usecase "View Assigned Recycling Batches" as UC_ViewRecyclerTasks
    usecase "Complete Recycling & Upload Proof" as UC_CompleteRecycling
  }

  package "Authentication" {
    usecase "Register & Authenticate (JWT)" as UC_Auth
    usecase "Manage User Profile & Ward" as UC_Profile
  }
}

' Associations
citizen -down-> UC_Auth
citizen -down-> UC_Profile
citizen -down-> UC_SubmitPickup
citizen -down-> UC_TrackPickup
citizen -down-> UC_SubmitComplaint
citizen -down-> UC_TrackComplaint
citizen -down-> UC_SubmitReward
citizen -down-> UC_ClaimReward

UC_SubmitPickup .> UC_YOLO : <<include>>
UC_SubmitPickup .> UC_PayFee : <<include>>
UC_CancelPickup .> UC_TrackPickup : <<extend>>
UC_StartRoute .> UC_OptimizeRoute : <<include>>
UC_UpdateTask .> UC_StartRoute : <<extend>>

staff -up-> UC_Auth
staff -up-> UC_ViewStaffTasks
staff -up-> UC_StartRoute
staff -up-> UC_UpdateTask
staff -up-> UC_ResolveComplaint
staff -up-> UC_LogMCF

admin -down-> UC_Auth
admin -down-> UC_AssignPickup
admin -down-> UC_AssignComplaint
admin -down-> UC_AssignRecycler
admin -down-> UC_AllocateReward
admin -down-> UC_Analytics

recycler -up-> UC_Auth
recycler -up-> UC_ViewRecyclerTasks
recycler -up-> UC_CompleteRecycling

@enduml"""

build_all_diagrams.render_diagram('test_use_case_tb', test_puml)
im = Image.open('docs/uml-diagrams/test_use_case_tb.png')
print(f'TB Use Case Dimensions: {im.size[0]}x{im.size[1]}, Aspect: {im.size[0]/im.size[1]:.2f}')
