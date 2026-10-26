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
        
    svg_url = f"https://www.plantuml.com/plantuml/svg/{encoded}"
    r_svg = requests.get(svg_url, timeout=30)
    svg_path = os.path.join(DIAGRAMS_DIR, f"{name}.svg")
    with open(svg_path, "wb") as f:
        f.write(r_svg.content)
        
    img = Image.open(png_path)
    print(f"[{name}] PNG Dimensions: {img.size} (Width x Height), Aspect Ratio: {img.size[1]/img.size[0]:.2f}")
    return img.size

PUML = """@startuml
title EcoPulse - Intelligent Municipal Waste Management System\\nSystem Use Case Diagram (Master Architecture)

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

  package "Citizen Services" as P1 {
    usecase "Submit Waste Pickup Request (with YOLO AI & Payment)" as C1
    usecase "Track Pickup Request Status" as C2
    usecase "Register & Track Waste Grievance" as C3
    usecase "Submit Recyclables for Rewards" as C4
  }

  package "Field Collection & Operations" as P2 {
    usecase "View Assigned Tasks & Schedule" as S1
    usecase "Execute Route & Record Waste Weight" as S2
    usecase "Resolve Grievance with Proof Photo" as S3
    usecase "Log Daily Segregated MCF Waste" as S4
  }

  package "Municipal Administration" as P3 {
    usecase "Assign Pickup to Staff & Set Date" as A1
    usecase "Assign Grievance to Ward Staff" as A2
    usecase "Review & Allocate Reward Points" as A3
    usecase "Manage MCF Totals & Assign Recycler" as A4
    usecase "View Analytics & Operational Reports" as A5
  }

  package "Recycling Operations" as P4 {
    usecase "View Assigned Recyclable Batches" as R1
    usecase "Complete Recycling & Submit Proof" as R2
  }
}

P1 -[hidden]down-> P2
P2 -[hidden]down-> P3
P3 -[hidden]down-> P4

citizen --> C1
citizen --> C2
citizen --> C3
citizen --> C4

staff --> S1
staff --> S2
staff --> S3
staff --> S4

admin --> A1
admin --> A2
admin --> A3
admin --> A4
admin --> A5

recycler --> R1
recycler --> R2

@enduml
"""

if __name__ == "__main__":
    render("01_Use_Case_Diagram", PUML)
