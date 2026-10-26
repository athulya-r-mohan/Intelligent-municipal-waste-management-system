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
}

' Primary Actors
actor "Citizen" as citizen
actor "Municipal\\nAdministrator" as admin
actor "Collection Staff" as staff
actor "Authorized\\nRecycler" as recycler

rectangle "EcoPulse Waste Management Platform" {

  package "Citizen Services & AI" as P_Citizen {
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

  package "Field Collection & Navigation" as P_Staff {
    usecase "View Assigned Tasks & Date Schedule" as UC_ViewStaffTasks
    usecase "View Optimized Route Preview" as UC_OptimizeRoute
    usecase "Start Scheduled Date Collection" as UC_StartRoute
    usecase "Update Task Status & Record Weight" as UC_UpdateTask
    usecase "Resolve Assigned Complaint with Proof" as UC_ResolveComplaint
  }

  package "Administrative Operations & Analytics" as P_Admin {
    usecase "Assign Pickup to Staff & Set Date" as UC_AssignPickup
    usecase "Assign Complaint to Staff" as UC_AssignComplaint
    usecase "Manage MCF Totals & Assign Recycler" as UC_AssignRecycler
    usecase "Review & Allocate Reward Points" as UC_AllocateReward
    usecase "View System Analytics & Reports" as UC_Analytics
  }

  package "MCF & Recycling Facility Operations" as P_Recycler {
    usecase "Log Daily MCF Segregated Waste" as UC_LogMCF
    usecase "View Assigned Recycling Batches" as UC_ViewRecyclerTasks
    usecase "Complete Recycling & Upload Proof" as UC_CompleteRecycling
  }

  package "Core Authentication & Profile" as P_Auth {
    usecase "Register & Authenticate (JWT)" as UC_Auth
    usecase "Manage User Profile & Ward" as UC_Profile
  }
}

' 2x2 Grid Package Alignment
P_Citizen -[hidden]right-> P_Staff
P_Admin -[hidden]right-> P_Recycler
P_Citizen -[hidden]down-> P_Admin
P_Staff -[hidden]down-> P_Recycler
P_Admin -[hidden]down-> P_Auth

' Actor Alignments relative to packages
citizen -[hidden]down-> admin
staff -[hidden]down-> recycler

citizen -right-> UC_SubmitPickup
citizen -right-> UC_TrackPickup
citizen -right-> UC_SubmitComplaint
citizen -right-> UC_TrackComplaint
citizen -right-> UC_SubmitReward
citizen -right-> UC_ClaimReward
citizen -right-> UC_Auth
citizen -right-> UC_Profile

UC_SubmitPickup .> UC_YOLO : <<include>>
UC_SubmitPickup .> UC_PayFee : <<include>>
UC_CancelPickup .> UC_TrackPickup : <<extend>>

admin -right-> UC_AssignPickup
admin -right-> UC_AssignComplaint
admin -right-> UC_AssignRecycler
admin -right-> UC_AllocateReward
admin -right-> UC_Analytics
admin -right-> UC_Auth

UC_StartRoute .> UC_OptimizeRoute : <<include>>
UC_UpdateTask .> UC_StartRoute : <<extend>>

UC_ViewStaffTasks <-left- staff
UC_StartRoute <-left- staff
UC_UpdateTask <-left- staff
UC_ResolveComplaint <-left- staff
UC_LogMCF <-left- staff
UC_Auth <-left- staff

UC_ViewRecyclerTasks <-left- recycler
UC_CompleteRecycling <-left- recycler
UC_Auth <-left- recycler

@enduml"""

build_all_diagrams.render_diagram('test_use_case_grid', test_puml)
im = Image.open('docs/uml-diagrams/test_use_case_grid.png')
print(f'Grid Use Case Dimensions: {im.size[0]}x{im.size[1]}, Aspect: {im.size[0]/im.size[1]:.2f}')
