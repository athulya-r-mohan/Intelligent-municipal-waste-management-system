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
    r = requests.get(f"http://www.plantuml.com/plantuml/png/{encoded}", timeout=40)
    with open(out_png, "wb") as f:
        f.write(r.content)
    im = Image.open(out_png)
    print(f"{name}: size={im.size}")
    return out_png

# Let's test a vertically balanced 2x2 grid with DPI 135
puml_class_4 = """@startuml
title EcoPulse - Class Diagram (Domain Model & Relational Architecture)

skinparam dpi 135
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

package "Accounts & Authorization" as PKG_ACCOUNTS {
  class User {
    + id : Integer [PK]
    + username : String
    + email : String
    + is_active : Boolean
    + check_password(password) : Boolean
  }

  class UserProfile {
    + id : Integer [PK]
    + name : String
    + phone : String
    + address : Text
    + role : String = "CITIZEN"
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

  class Staff {
    + staff_id : Integer [PK]
    + phone : String
    + designation : String
    + date_of_joining : Date
  }

  class Recycler {
    + recycler_id : Integer [PK]
    + organization : String
    + waste_type : String
    + date_of_registration : Date
  }
}

package "Waste Pickup & Collection" as PKG_PICKUP {
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

package "Complaints & Community Rewards" as PKG_COMMUNITY {
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

package "Facility & Recycling Operations" as PKG_MCF {
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

' 2x2 Grid anchors
PKG_ACCOUNTS -[hidden]right-> PKG_PICKUP
PKG_COMMUNITY -[hidden]right-> PKG_MCF
PKG_ACCOUNTS -[hidden]down-> PKG_COMMUNITY
PKG_PICKUP -[hidden]down-> PKG_MCF

' Accounts internal
User "1" -down-> "1" UserProfile : has
User "1" -down-> "0..1" Staff : extends
User "1" -down-> "0..1" Recycler : extends
UserProfile "*" -down-> "0..1" Ward : resides in
Staff "*" -down-> "0..1" Ward : assigned to

' Pickup internal
WastePickupRequest "1" *-- "1..*" WastePickupImage : includes
WastePickupRequest "1" -- "1" Payment : requires
WastePickupRequest "1" -- "0..1" WasteCollection : fulfills

' Inter-package links
User "1" -right-> "*" WastePickupRequest : requests
Staff "0..1" -right-> "*" WastePickupRequest : assigned
Staff "1" -right-> "*" WasteCollection : collects

User "1" -down-> "*" WasteComplaint : lodges
Staff "0..1" -down-> "*" WasteComplaint : assigned
User "1" -down-> "*" RewardSubmission : submits
User "1" -down-> "*" Notification : receives

Staff "1" -right-> "*" StaffMCFCollection : logs
Recycler "1" -right-> "*" MCFRecyclerAssignment : assigned
User "0..1" -right-> "*" MCFRecyclerAssignment : assigns

@enduml
"""

render("test_class_4", puml_class_4)
