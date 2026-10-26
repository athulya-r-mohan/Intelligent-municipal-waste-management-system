import os
import zlib
import requests
from PIL import Image

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
    z = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=-15)
    compressed = z.compress(text.encode('utf-8')) + z.flush()
    res = []
    for i in range(0, len(compressed), 3):
        b1 = compressed[i]
        b2 = compressed[i+1] if i+1 < len(compressed) else 0
        b3 = compressed[i+2] if i+2 < len(compressed) else 0
        res.append(append3bytes(b1, b2, b3))
    return ''.join(res)

def render(name, puml_content):
    puml_path = os.path.join(DIAGRAMS_DIR, f"{name}.puml")
    with open(puml_path, "w", encoding="utf-8") as f:
        f.write(puml_content)
        
    encoded = encode_plantuml(puml_content)
    png_url = f"https://www.plantuml.com/plantuml/png/{encoded}"
    r_png = requests.get(png_url, timeout=30)
    png_path = os.path.join(DIAGRAMS_DIR, f"{name}.png")
    with open(png_path, "wb") as f:
        f.write(r_png.content)
        
    img = Image.open(png_path)
    print(f"[{name}] PNG Dimensions: {img.size} (Width x Height), Aspect Ratio: {img.size[1]/img.size[0]:.2f}")
    return img.size

PUML = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nSystem Use Case Diagram

skinparam dpi 160
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000
skinparam roundCorner 8

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
  FontStyle bold
  ArrowColor #000000
}

skinparam rectangle {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 15
  FontStyle bold
}

skinparam package {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #000000
  FontSize 14
  FontStyle bold
}

left to right direction

actor "Citizen" as citizen
actor "Collection Staff" as staff
actor "Municipal Administrator" as admin
actor "Recycling Partner" as recycler

rectangle "EcoPulse Intelligent Municipal Waste Management System" {
  
  package "Citizen Services & AI Subsystem" as P_Cit {
    usecase "Register & Login (JWT)" as C1
    usecase "Submit Waste Pickup Request" as C2
    usecase "Track Pickup Request Status" as C3
    usecase "Register Waste Complaint" as C4
    usecase "Submit Recyclables for Rewards" as C5
  }

  package "Field Collection & Operations" as P_Stf {
    usecase "Staff Authentication" as S1
    usecase "View Assigned Tasks & Schedule" as S2
    usecase "Execute Route & Record Waste Weight" as S3
    usecase "Resolve Complaint with Proof Photo" as S4
    usecase "Log Daily Segregated MCF Waste" as S5
  }

  package "Municipal Administration Subsystem" as P_Adm {
    usecase "Admin Authentication" as A1
    usecase "Assign Pickup to Staff & Set Date" as A2
    usecase "Assign Complaint to Staff" as A3
    usecase "Manage MCF & Allocate Recycler" as A4
    usecase "Review & Allocate Reward Points" as A5
    usecase "Monitor Analytics & Municipal Reports" as A6
  }

  package "Recycling Partner Subsystem" as P_Rec {
    usecase "Partner Authentication" as R1
    usecase "View Assigned Recyclable Batches" as R2
    usecase "Complete Recycling & Submit Proof" as R3
  }
}

' Layout alignment: Citizen top-left, Staff bottom-left, Admin top-right, Recycler bottom-right
P_Cit -[hidden]down-> P_Stf
P_Adm -[hidden]down-> P_Rec
P_Cit -[hidden]right-> P_Adm
P_Stf -[hidden]right-> P_Rec

citizen -[hidden]down-> staff
admin -[hidden]down-> recycler

' Left side connections
citizen --> C1
citizen --> C2
citizen --> C3
citizen --> C4
citizen --> C5

staff --> S1
staff --> S2
staff --> S3
staff --> S4
staff --> S5

' Right side connections (arrow points FROM right actor TO use case)
A1 <-- admin
A2 <-- admin
A3 <-- admin
A4 <-- admin
A5 <-- admin
A6 <-- admin

R1 <-- recycler
R2 <-- recycler
R3 <-- recycler

@enduml
"""

if __name__ == "__main__":
    render("test_master_2x2", PUML)
