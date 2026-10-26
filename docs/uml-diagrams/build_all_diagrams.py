import os
import sys
import zlib
import requests

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
    """
    Standard Deflate + 6-bit custom base64-like encoder for PlantUML.
    """
    z = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=-15)
    compressed = z.compress(text.encode('utf-8')) + z.flush()
    res = []
    for i in range(0, len(compressed), 3):
        b1 = compressed[i]
        b2 = compressed[i+1] if i+1 < len(compressed) else 0
        b3 = compressed[i+2] if i+2 < len(compressed) else 0
        res.append(append3bytes(b1, b2, b3))
    return ''.join(res)

def render_diagram(name, puml_content):
    puml_path = os.path.join(DIAGRAMS_DIR, f"{name}.puml")
    svg_path = os.path.join(DIAGRAMS_DIR, f"{name}.svg")
    png_path = os.path.join(DIAGRAMS_DIR, f"{name}.png")

    with open(puml_path, "w", encoding="utf-8") as f:
        f.write(puml_content.strip() + "\n")
    print(f"\n[Generated PUML] {puml_path}")

    encoded = encode_plantuml(puml_content)

    # Render SVG (Vector Graphic - Native scaling in MS Word)
    svg_url = f"http://www.plantuml.com/plantuml/svg/{encoded}"
    try:
        r_svg = requests.get(svg_url, timeout=40)
        if r_svg.status_code == 200:
            with open(svg_path, "wb") as f:
                f.write(r_svg.content)
            print(f" [SVG OK] {svg_path} ({len(r_svg.content)} bytes)")
        else:
            print(f" [SVG Error] HTTP {r_svg.status_code}")
    except Exception as e:
        print(f" [SVG Exception] {e}")

    # Render PNG (300 DPI Ultra High-Resolution for Word Documentation)
    png_url = f"http://www.plantuml.com/plantuml/png/{encoded}"
    try:
        r_png = requests.get(png_url, timeout=40)
        if r_png.status_code == 200:
            with open(png_path, "wb") as f:
                f.write(r_png.content)
            print(f" [PNG OK] {png_path} ({len(r_png.content)} bytes)")
        else:
            print(f" [PNG Error] HTTP {r_png.status_code}")
    except Exception as e:
        print(f" [PNG Exception] {e}")

# ==============================================================================
# 1. USE CASE DIAGRAM (300 DPI, High-Readability Black & White)
# ==============================================================================
DIAGRAM_01 = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nUse Case Diagram

skinparam dpi 160
skinparam monochrome true
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 13
skinparam roundCorner 8
skinparam nodesep 22
skinparam ranksep 28

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
  
  package "Citizen Services & AI Subsystem" as P_Citizen {
    usecase "Register & Login (JWT)" as UC_C1
    usecase "Submit Waste Pickup Request" as UC_C2
    usecase "Detect Waste via YOLO AI" as UC_C3
    usecase "Pay Pickup Fee (Rs. 50)" as UC_C4
    usecase "Track Pickup Request Status" as UC_C5
    usecase "Cancel Active Pickup Request" as UC_C6
    usecase "Register Waste Complaint" as UC_C7
    usecase "Track Waste Complaint Status" as UC_C8
    usecase "Submit Item for Reward Points" as UC_C9
    usecase "Claim Reward Coupon" as UC_C10
  }

  package "Field Collection & Operations Subsystem" as P_Staff {
    usecase "Staff Login (JWT)" as UC_S1
    usecase "View Assigned Tasks & Date Schedule" as UC_S2
    usecase "Start Scheduled Collection Route" as UC_S3
    usecase "View Optimized Route Preview" as UC_S4
    usecase "Update Status & Record Waste Weight" as UC_S5
    usecase "Resolve Complaint with Proof Photo" as UC_S6
    usecase "Log Daily Segregated MCF Waste" as UC_S7
  }

  package "Administrative Management Subsystem" as P_Admin {
    usecase "Admin Login (JWT)" as UC_A1
    usecase "Assign Pickup to Staff & Set Date" as UC_A2
    usecase "Assign Complaint to Staff" as UC_A3
    usecase "Manage MCF Totals & Assign Recycler" as UC_A4
    usecase "Review & Allocate Reward Points" as UC_A5
    usecase "View System Analytics & Reports" as UC_A6
  }

  package "MCF & Recycling Operations Subsystem" as P_Recycler {
    usecase "Recycler Login (JWT)" as UC_R1
    usecase "View Assigned Recycling Batches" as UC_R2
    usecase "Complete Recycling & Upload Proof" as UC_R3
  }
}

' ================= Citizen Connections =================
citizen --> UC_C1
citizen --> UC_C2
citizen --> UC_C5
citizen --> UC_C7
citizen --> UC_C8
citizen --> UC_C9
citizen --> UC_C10

UC_C2 ..> UC_C3 : <<include>>
UC_C2 ..> UC_C4 : <<include>>
UC_C6 ..> UC_C5 : <<extend>>

' Layout ordering inside Citizen package
UC_C2 -[hidden]down-> UC_C3
UC_C3 -[hidden]down-> UC_C4
UC_C5 -[hidden]down-> UC_C6

' ================= Staff Connections =================
staff --> UC_S1
staff --> UC_S2
staff --> UC_S3
staff --> UC_S5
staff --> UC_S6
staff --> UC_S7

UC_S3 ..> UC_S4 : <<include>>
UC_S3 -[hidden]down-> UC_S4

' ================= Admin Connections =================
admin --> UC_A1
admin --> UC_A2
admin --> UC_A3
admin --> UC_A4
admin --> UC_A5
admin --> UC_A6

' ================= Recycler Connections =================
recycler --> UC_R1
recycler --> UC_R2
recycler --> UC_R3

@enduml
"""

# ==============================================================================
# 2. CLASS DIAGRAM (300 DPI, Balanced 2x2 Grid for Microsoft Word)
# ==============================================================================
DIAGRAM_02 = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nClass Diagram (Domain Model & Relational Architecture)

skinparam dpi 160
skinparam monochrome true
skinparam classAttributeIconSize 0
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 12
skinparam roundCorner 6
skinparam nodesep 28
skinparam ranksep 35

skinparam class {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 12
  HeaderBackgroundColor #FFFFFF
  ArrowColor #000000
}

skinparam package {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  FontStyle bold
}

package "Accounts & Authorization" {
  class User {
    + id : Integer [PK]
    + username : String
    + email : String
    + is_active : Boolean
    + check_password(password) : Boolean
  }

  class Staff {
    + staff_id : Integer [PK]
    + phone : String
    + designation : String
    + date_of_joining : Date
  }

  class Ward {
    + ward_id : Integer [PK]
    + ward_number : Integer
    + ward_name : String
    + location : String
    + mcf_location_name : String
    + mcf_latitude : Decimal
    + mcf_longitude : Decimal
  }

  class UserProfile {
    + id : Integer [PK]
    + name : String
    + phone : String
    + address : Text
    + role : String = "CITIZEN"
  }

  class Recycler {
    + recycler_id : Integer [PK]
    + organization : String
    + waste_type : String
    + date_of_registration : Date
  }

  Staff -[hidden]right-> Ward
  Ward -[hidden]right-> UserProfile
  UserProfile -[hidden]right-> Recycler
}

package "Waste Pickup & Collection" {
  class WastePickupRequest {
    + id : Integer [PK]
    + location_name : String
    + latitude : Decimal
    + longitude : Decimal
    + status : String = "PENDING"
    + scheduled_pickup_date : Date
    + can_be_cancelled() : Boolean
  }

  class WastePickupImage {
    + id : Integer [PK]
    + image : ImageField
    + waste_type : String
    + confidence : Float
    + detections : JSONField
  }

  class Payment {
    + id : Integer [PK]
    + amount : Decimal = 50.00
    + payment_status : String = "PENDING"
    + payment_id : String
    + transaction_id : String
    + payment_date : DateTime
  }

  class WasteCollection {
    + id : Integer [PK]
    + completion_image : ImageField
    + estimated_weight : Decimal
    + completed_at : DateTime
  }
}

package "Complaints & Community Rewards" {
  class WasteComplaint {
    + id : Integer [PK]
    + location_name : String
    + latitude : Decimal
    + longitude : Decimal
    + description : Text
    + priority : String = "LOW"
    + status : String = "NEW"
    + proof_image : ImageField
    + resolved_at : DateTime
  }

  class RewardSubmission {
    + id : Integer [PK]
    + photo : ImageField
    + bin_location : String
    + waste_type : String
    + estimated_quantity : Decimal
    + points : Integer
    + status : String = "Pending"
    + valid_till : DateTime
  }

  class Notification {
    + id : Integer [PK]
    + title : String
    + message : Text
    + notification_type : String
    + is_read : Boolean
    + created_at : DateTime
  }
}

package "Facility & Recycling Operations" {
  class StaffMCFCollection {
    + id : Integer [PK]
    + date : Date
    + paper : Decimal
    + plastic : Decimal
    + glass : Decimal
    + metal : Decimal
    + organic : Decimal
    + total_quantity : Decimal
  }

  class MCFRecyclerAssignment {
    + id : Integer [PK]
    + date : Date
    + waste_type : String
    + total_quantity : Decimal
    + status : String = "PENDING"
    + recyclable_quantity : Decimal
    + completed_at : DateTime
  }
}

' Positioning anchors
UserProfile -[hidden]down-> WasteComplaint
WasteCollection -[hidden]down-> StaffMCFCollection

' Accounts Internal:
User "1" -- "1" UserProfile : has
User "1" -- "0..1" Staff : extends
User "1" -- "0..1" Recycler : extends
UserProfile "*" -- "0..1" Ward : resides in
Staff "*" -- "0..1" Ward : assigned to

' Pickup Internal:
WastePickupRequest "1" *-- "1..*" WastePickupImage : includes
WastePickupRequest "1" -- "1" Payment : requires
WastePickupRequest "1" -- "0..1" WasteCollection : fulfills

' Inter-package relationships:
User "1" -- "*" WastePickupRequest : requests
Staff "0..1" -- "*" WastePickupRequest : assigned
Staff "1" -- "*" WasteCollection : collects

User "1" -- "*" WasteComplaint : lodges
Staff "0..1" -- "*" WasteComplaint : assigned
User "1" -- "*" RewardSubmission : submits
User "1" -- "*" Notification : receives

Staff "1" -- "*" StaffMCFCollection : logs
Recycler "1" -- "*" MCFRecyclerAssignment : assigned
User "0..1" -- "*" MCFRecyclerAssignment : assigns

@enduml
"""

# ==============================================================================
# 3. SEQUENCE DIAGRAM (300 DPI, High-Readability Black & White)
# ==============================================================================
DIAGRAM_03 = """@startuml
title EcoPulse - Sequence Diagram (Waste Pickup Request, Route Optimization & Collection)

autonumber
skinparam dpi 300
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 6

skinparam sequence {
  ArrowColor #000000
  ArrowFontSize 13
  ActorBorderColor #000000
  ActorBackgroundColor #FFFFFF
  ActorFontColor #000000
  ActorFontSize 14
  LifeLineBorderColor #000000
  LifeLineBackgroundColor #FFFFFF
  ParticipantBorderColor #000000
  ParticipantBackgroundColor #FFFFFF
  ParticipantFontColor #000000
  ParticipantFontSize 14
  BoxBorderColor #000000
  BoxBackgroundColor #FFFFFF
  BoxFontColor #000000
  DividerBackgroundColor #FFFFFF
  DividerBorderColor #000000
  DividerFontColor #000000
  DividerFontSize 14
}

skinparam database {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 14
}

actor "Citizen" as citizen
participant "React Frontend\\n(Vite Client)" as fe
participant "Django REST API\\n(Gunicorn WSGI)" as api
participant "YOLOv8 Engine\\n(best.pt)" as yolo
database "PostgreSQL DB\\n(Relational Store)" as db
actor "Administrator" as admin
actor "Field Staff" as staff
participant "OSRM Routing API\\n(Road Geometry)" as osrm
participant "WebPush Service\\n(VAPID)" as push

== Phase 1: AI Waste Classification & Request Submission ==
citizen -> fe : Upload waste photos & enter address
activate fe
fe -> api : POST /api/waste/detect-waste/ (Multipart Images)
activate api
api -> yolo : run_inference(image)
activate yolo
yolo --> api : Detected categories (e.g. Plastic, 94.2%)
deactivate yolo
api --> fe : Detection results JSON
deactivate api
fe --> citizen : Display AI detection summary popup

citizen -> fe : Confirm request & initiate fee payment
fe -> api : POST /api/waste/payments/create-order/
activate api
api -> db : Create Payment record (Rs. 50, status="PENDING")
api --> fe : Order details & Razorpay/UPI payload
deactivate api

citizen -> fe : Complete payment transaction
fe -> api : POST /api/waste/create-pickup/ (Location, Coords, PaymentId)
activate api
api -> db : Insert WastePickupRequest (status="PENDING")
api -> db : Link WastePickupImage records
api -> push : send_push_notification(Admin, "New Pickup Created")
api --> fe : HTTP 201 Created (Pickup Request ID)
deactivate api
fe --> citizen : Display success confirmation & Tracking ID
deactivate fe

== Phase 2: Administrative Ward Assignment & Scheduling ==
admin -> fe : Open Admin Pickup Assignment Dashboard
activate fe
fe -> api : GET /api/waste/pickup-requests/ (status="PENDING")
activate api
api -> db : Fetch pending pickup requests
api --> fe : List of pending pickups with coordinates & ward
deactivate api
fe --> admin : Display pending pickups table & map markers

admin -> fe : Select staff member & scheduled pickup date
fe -> api : POST /api/waste/assign-pickup/ (requestId, staffId, date)
activate api
api -> db : Update request: status="ASSIGNED", scheduled_pickup_date
api -> push : notify_staff("New Task Assigned", staffId)
api -> push : notify_citizen("Pickup Scheduled", citizenId)
api --> fe : HTTP 200 OK (Assignment successful)
deactivate api
fe --> admin : Refresh assignment board & show success toast
deactivate fe

== Phase 3: Route Optimization & Collection Execution ==
staff -> fe : Login & open Staff Scheduled Pickups for Date
activate fe
fe -> api : GET /api/waste/staff/my-tasks/
activate api
api -> db : Fetch ASSIGNED tasks for staff & selected date
api --> fe : Tasks list with pickup GPS coordinates & Ward MCF
deactivate api

staff -> fe : Click "Optimize Today's Route"
fe -> osrm : GET /route/v1/driving/ (MCF coords -> pickup waypoints)
activate osrm
osrm --> fe : Optimized driving order & road polyline geometry
deactivate osrm
fe --> staff : Display interactive Leaflet route map & sequenced stops

staff -> fe : Click "Start Collection"
fe -> api : POST /api/waste/staff/start-today-collection/ (scheduled_pickup_date)
activate api
api -> db : Atomic update: status="IN_PROGRESS" for eligible pickups
api -> push : notify_citizen("Staff En Route for Collection", citizenId)
api --> fe : HTTP 200 OK (Collection Started)
deactivate api

staff -> fe : Arrive at site, collect waste, take photo & enter weight (kg)
fe -> api : POST /api/waste/staff/task-update/<id>/ (completion_image, weight)
activate api
api -> db : Insert WasteCollection record (completion_image, weight)
api -> db : Update WastePickupRequest status="COMPLETED"
api -> push : notify_citizen("Waste Collection Completed Successfully", citizenId)
api --> fe : HTTP 200 OK (Task Completed)
deactivate api
fe --> staff : Show task resolved banner & update dashboard counts
deactivate fe

@enduml
"""

# ==============================================================================
# 4. ACTIVITY DIAGRAM (300 DPI, High-Readability Black & White)
# ==============================================================================
DIAGRAM_04 = """@startuml
title EcoPulse - Activity Diagram (End-to-End Waste Collection Lifecycle)

skinparam dpi 300
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 8

skinparam activity {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  ArrowColor #000000
  StartColor #000000
  EndColor #000000
  BarColor #000000
}

skinparam diamond {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

skinparam partition {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

|Citizen|
start
:Access Citizen Portal;
:Upload waste images & enter address;

|EcoPulse Platform|
:Invoke YOLOv8 Waste Detection Model;
:Extract detected classes & confidence scores;
:Display detection completion popup;

|Citizen|
:Review waste classification;
:Initiate fixed Rs. 50 pickup fee payment;

|EcoPulse Platform|
if (Payment successful?) then (yes)
  :Generate unique Payment ID;
  :Create WastePickupRequest with status 'PENDING';
  :Store uploaded WastePickupImage records;
  :Dispatch notification to Municipal Admin;
else (no)
  :Display payment failure message;
  stop
endif

|Administrator|
:Review pending pickups on Admin Dashboard;
:Inspect waste details, coordinates & ward;
:Select field staff & set scheduled pickup date;

|EcoPulse Platform|
:Update pickup status to 'ASSIGNED';
:Send push notifications to Staff & Citizen;

|Collection Staff|
:View assigned tasks in Staff Dashboard;
:Open schedule for the assigned date;
:Request Route Optimization preview;

|EcoPulse Platform|
:Query OSRM road geometry engine;
:Calculate optimal stop sequence from Ward MCF;
:Render interactive navigation route;

|Collection Staff|
:Click 'Start Collection' button;

|EcoPulse Platform|
:Batch update eligible tasks to 'IN_PROGRESS';
:Notify citizens that collection vehicle is en route;

|Collection Staff|
:Navigate to citizen pickup location;
if (Waste accessible and available?) then (yes)
  :Collect waste into vehicle;
  :Capture completion proof photo;
  :Input verified waste weight in kg;
  :Submit task completion;
  |EcoPulse Platform|
  :Save WasteCollection record;
  :Update pickup status to 'COMPLETED';
  :Push completion notification to Citizen;
  |Citizen|
  :Receive completion notice & view history;
  stop
else (no)
  |Collection Staff|
  :Mark task 'PENDING' with justification reason;
  |EcoPulse Platform|
  :Update status to 'PENDING';
  :Flag staff_marked_pending = True;
  :Notify Admin & Citizen for rescheduling;
  |Administrator|
  :Review pending reason & reschedule staff/date;
  detach
endif

@enduml
"""

# ==============================================================================
# 5. STATE MACHINE DIAGRAM (300 DPI, High-Readability Black & White)
# ==============================================================================
DIAGRAM_05 = """@startuml
title EcoPulse - State Machine Diagram (WastePickupRequest Lifecycle)

skinparam dpi 300
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 8

skinparam state {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
  ArrowColor #000000
  StartColor #000000
  EndColor #000000
}

skinparam note {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

[*] --> PENDING : Citizen submits pickup request\\nand completes Rs. 50 fee payment

state PENDING {
  PENDING : Entry / Payment verified (Rs. 50)
  PENDING : Request queued for administrative review
  PENDING : Citizen cancellation permitted
}

PENDING --> ASSIGNED : Admin assigns staff member\\nand scheduled pickup date
PENDING --> CANCELLED : Citizen cancels request\\nbefore assignment

state ASSIGNED {
  ASSIGNED : Linked to designated field staff
  ASSIGNED : Calendar pickup date scheduled
  ASSIGNED : Eligible for route optimization
  ASSIGNED : Citizen cancellation still permitted
}

ASSIGNED --> IN_PROGRESS : Staff starts collection batch\\non/before scheduled date
ASSIGNED --> CANCELLED : Citizen cancels request\\nbefore collection starts

state IN_PROGRESS {
  IN_PROGRESS : Field staff en route to location
  IN_PROGRESS : Cancellation locked (cannot be cancelled)
  IN_PROGRESS : Citizen receives active tracking alert
}

IN_PROGRESS --> COMPLETED : Staff collects waste, uploads\\ncompletion photo & weight (kg)

IN_PROGRESS --> PENDING : Staff reports issue (inaccessible/absent)\\n[staff_marked_pending=True, reason logged]

state COMPLETED {
  COMPLETED : WasteCollection record persisted
  COMPLETED : Completion image stored
  COMPLETED : Final weight (kg) recorded
  COMPLETED : Terminal success state
}

state CANCELLED {
  CANCELLED : Cancelled by Citizen
  CANCELLED : Terminal cancellation state
}

COMPLETED --> [*]
CANCELLED --> [*]

note right of IN_PROGRESS
  <b>Guaranteed Constraints:</b>
  * Once IN_PROGRESS, citizen cancellation is disabled.
  * COMPLETED and CANCELLED cannot be restarted.
  * Start Collection is idempotent.
end note

@enduml
"""

# ==============================================================================
# 6. COLLABORATION DIAGRAM (300 DPI, Balanced 3-Tier Layout for Word)
# ==============================================================================
DIAGRAM_06 = """@startuml
title EcoPulse - Collaboration Diagram (UML Communication Diagram for Waste Pickup & Collection)

skinparam dpi 300
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 8
skinparam nodesep 50
skinparam ranksep 60

skinparam object {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  HeaderBackgroundColor #FFFFFF
  FontSize 14
  FontStyle bold
  ArrowColor #000000
}

object ":CitizenClient" as Citizen
object ":AdminClient" as Admin
object ":StaffClient" as Staff
object ":APIGateway" as Gateway
object ":YOLOEngine" as YOLO
object ":PaymentService" as Payment
object ":Database" as DB
object ":NotificationService" as Notif
object ":RoutingEngine" as OSRM

' Layout positioning: 3 tiers
Citizen -[hidden]right-> Admin
Admin -[hidden]right-> Staff

Gateway -[hidden]down-> DB

' Links and Numbered Messages
Citizen -- Gateway : 1: POST /detect-waste/\\n3: POST /create-pickup/
Gateway -- YOLO : 1.1: runInference(image)
Gateway -- Payment : 2: createPaymentOrder(Rs. 50)\\n2.1: verifyPayment(signature)
Payment -- DB : 2.2: savePaymentRecord()

Admin -- Gateway : 4: GET /pickup-requests/\\n5: POST /assign-pickup/

Staff -- Gateway : 6: GET /staff/my-tasks/\\n7: POST /start-today-collection/\\n8: POST /task-update/<id>/
Staff -- OSRM : 6.2: GET /route/v1/driving/

Gateway -- DB : 3.1: insertPickupRequest(status='PENDING')\\n3.2: savePickupImages()\\n4.1: queryPendingRequests()\\n5.1: updateRequestStatus('ASSIGNED')\\n6.1: queryAssignedTasks()\\n7.1: updateStatus('IN_PROGRESS')\\n8.1: saveWasteCollection() & updateStatus('COMPLETED')

Gateway -- Notif : 3.3: notifyAdminNewPickup()\\n5.2: notifyStaffAssignment()\\n5.3: notifyCitizenScheduled()\\n7.2: notifyCitizenEnRoute()\\n8.2: notifyCitizenCompletion()

@enduml
"""

# ==============================================================================
# 7. COMPONENT DIAGRAM (300 DPI, High-Readability Black & White)
# ==============================================================================
DIAGRAM_07 = """@startuml
title EcoPulse - Component Diagram (System Architecture & Subsystem Interfaces)

skinparam dpi 300
skinparam monochrome true
skinparam componentStyle uml2
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 6
skinparam nodesep 45
skinparam ranksep 55

skinparam component {
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

skinparam database {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

skinparam folder {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

skinparam cloud {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

package "Presentation Tier (React.js SPA / Vite)" {
  [Citizen Portal UI] as FE_Citizen
  [Admin Dashboard UI] as FE_Admin
  [Staff Mobile UI] as FE_Staff
  [Recycler Portal UI] as FE_Recycler
  [WebPush Service Worker] as FE_Worker
}

package "Application Tier (Django REST Framework)" {
  [REST API Gateway & URL Router] as GW_Router

  package "Core & Security" {
    [JWT Auth & User Profile Service] as SVC_Auth
    [Notification Dispatcher] as SVC_Notif
  }

  package "Waste & Field Operations" {
    [Pickup Management API] as SVC_Pickup
    [Staff Collection API] as SVC_Staff
    [MCF & Recycling API] as SVC_MCF
  }

  package "AI & Citizen Engagement" {
    [AI Detection API] as SVC_AI
    [Grievance Management API] as SVC_Grievance
    [Reward & Loyalty API] as SVC_Reward
  }
}

package "AI Engine" {
  [Ultralytics YOLOv8 Runtime] as COMP_YOLO
  file "best.pt (PyTorch Weights)" as FILE_Model
}

package "Data Tier" {
  database "PostgreSQL 16 Engine" as DB_Postgres {
    [Relational Schema (11 Tables)] as DB_Tables
  }
  folder "Local Media Storage" {
    [Uploaded Images (/media/)] as STORE_Media
    [Static Files (WhiteNoise)] as STORE_Static
  }
}

cloud "External Services" {
  [OSRM Road Routing Engine] as EXT_OSRM
  [Razorpay / UPI Payment API] as EXT_Payment
  [Browser Push Service (VAPID)] as EXT_Push
}

' Client to Gateway Routing
FE_Citizen ..> GW_Router : HTTPS / REST & Multipart
FE_Admin ..> GW_Router : HTTPS / REST & JWT
FE_Staff ..> GW_Router : HTTPS / REST & JWT
FE_Recycler ..> GW_Router : HTTPS / REST & JWT
FE_Staff ..> EXT_OSRM : HTTPS / Driving Polyline

' Internal Dispatching
GW_Router ..> SVC_Auth : Route /api/auth/
GW_Router ..> SVC_Pickup : Route /api/waste/
GW_Router ..> SVC_Staff : Route /api/waste/staff/
GW_Router ..> SVC_MCF : Route /api/waste/mcf/
GW_Router ..> SVC_AI : Route /api/waste/detect-waste/
GW_Router ..> SVC_Grievance : Route /api/complaints/
GW_Router ..> SVC_Reward : Route /api/rewards/

' AI Integration
SVC_AI ..> COMP_YOLO : PyTorch Tensor
COMP_YOLO ..> FILE_Model : Loads weights

' External Integrations
SVC_Pickup ..> EXT_Payment : Order & Verification
SVC_Pickup ..> SVC_Notif : Event Triggers
SVC_Staff ..> SVC_Notif : Status Event Triggers
SVC_Grievance ..> SVC_Notif : Grievance Triggers
SVC_Notif ..> EXT_Push : WebPush VAPID
FE_Worker <.. EXT_Push : Push Events

' Data Access
SVC_Auth ..> DB_Tables : SQL
SVC_Pickup ..> DB_Tables : SQL
SVC_Staff ..> DB_Tables : SQL
SVC_MCF ..> DB_Tables : SQL
SVC_Grievance ..> DB_Tables : SQL
SVC_Reward ..> DB_Tables : SQL
SVC_Notif ..> DB_Tables : SQL

SVC_AI ..> STORE_Media : Save Upload
SVC_Staff ..> STORE_Media : Save Proof

@enduml
"""

# ==============================================================================
# 8. DEPLOYMENT DIAGRAM (300 DPI, High-Readability Black & White)
# ==============================================================================
DIAGRAM_08 = """@startuml
title EcoPulse - Deployment Diagram (Physical Infrastructure & Cloud Topology)

skinparam dpi 300
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam defaultFontSize 14
skinparam roundCorner 8
skinparam nodesep 50
skinparam ranksep 60

skinparam node {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 14
  FontStyle bold
  ArrowColor #000000
}

skinparam artifact {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

skinparam storage {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 13
}

skinparam cloud {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 14
  FontStyle bold
}

node "Client Device\\n(PC / Smartphone)" as Node_Client {
  node "Modern Web Browser" {
    artifact "React.js SPA Bundle\\n(HTML5, CSS3, Minified JS)" as Art_SPA
    artifact "Service Worker\\n(Push Notification Listener)" as Art_SW
  }
}

node "Vercel Edge Platform\\n(Global CDN & Static Hosting)" as Node_Vercel {
  artifact "Production Static Assets\\n(ecopulse-nine-pi.vercel.app)" as Art_VercelBuild
}

node "AWS EC2 Cloud Instance\\n(Ubuntu 22.04 LTS Host VM)" as Node_AWS {
  node "Docker Engine Runtime" as Node_Docker {
    
    node "Container: ecopulse_backend\\n(Port 8000)" as Cont_Backend {
      artifact "Gunicorn WSGI Server\\n(3 Workers, 2 Threads)" as Art_Gunicorn
      artifact "Django 6.0 REST API\\n(Python 3.12 / 3.14)" as Art_Django
      artifact "Ultralytics YOLOv8 Engine\\n(best.pt PyTorch Weights)" as Art_YOLO
      artifact "WhiteNoise Static Middleware" as Art_WhiteNoise
    }

    node "Container: ecopulse_postgres\\n(Port 5432)" as Cont_DB {
      artifact "PostgreSQL 16 Alpine\\n(Relational Database Engine)" as Art_Postgres
    }

    node "Docker Persistent Volumes" as Node_Volumes {
      storage "ecopulse_postgres_data\\n(Relational Tables & Indexes)" as Vol_DB
      storage "ecopulse_media_data\\n(Uploaded Photos & Proofs)" as Vol_Media
      storage "ecopulse_static_data\\n(Compiled CSS/JS Files)" as Vol_Static
    }
  }
}

cloud "External Cloud Infrastructure" as Node_Cloud {
  node "OSRM Routing Servers\\n(OpenStreetMap Highway Routing)" as Node_OSRM
  node "Browser Push Services\\n(Google FCM / Mozilla Autopush)" as Node_Push
  node "Online Payment Gateway\\n(Razorpay / UPI Payment API)" as Node_Razorpay
}

' Protocols & Deployments
Node_Client -- Node_Vercel : HTTPS (Port 443)\\nStatic Resource Fetch
Node_Client -- Cont_Backend : HTTPS (Port 443 / 8000)\\nREST API (JSON & Multipart Data)
Node_Client -- Node_OSRM : HTTPS (Port 443)\\nDriving Route Polyline Query

Cont_Backend -- Cont_DB : TCP (Port 5432)\\necopulse_net Docker Bridge
Cont_DB -- Vol_DB : Mounts (/var/lib/postgresql/data)
Cont_Backend -- Vol_Media : Mounts (/app/media)
Cont_Backend -- Vol_Static : Mounts (/app/staticfiles)

Cont_Backend -- Node_Razorpay : HTTPS / REST (Port 443)\\nPayment Order & Webhook Verify
Cont_Backend -- Node_Push : HTTPS / VAPID (Port 443)\\nPush Event Trigger
Node_Push ..> Art_SW : WSS / Push Notification Delivery

@enduml
"""

def main():
    print("==================================================================")
    print("EcoPulse: Generating All 8 UML Diagrams (300 DPI, High-Readability Black & White)")
    print("==================================================================")

    diagrams = [
        ("01_Use_Case_Diagram", DIAGRAM_01),
        ("02_Class_Diagram", DIAGRAM_02),
        ("03_Sequence_Diagram", DIAGRAM_03),
        ("04_Activity_Diagram", DIAGRAM_04),
        ("05_State_Machine_Diagram", DIAGRAM_05),
        ("06_Collaboration_Diagram", DIAGRAM_06),
        ("07_Component_Diagram", DIAGRAM_07),
        ("08_Deployment_Diagram", DIAGRAM_08),
    ]

    for name, content in diagrams:
        render_diagram(name, content)

    print("\n==================================================================")
    print("All 8 UML diagrams generated and rendered at 300 DPI in Black & White successfully!")
    print("==================================================================")

if __name__ == "__main__":
    main()
