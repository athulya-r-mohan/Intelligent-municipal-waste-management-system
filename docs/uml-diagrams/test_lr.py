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
    encoded = encode_plantuml(puml_content)
    png_url = f"https://www.plantuml.com/plantuml/png/{encoded}"
    r_png = requests.get(png_url, timeout=30)
    png_path = os.path.join(DIAGRAMS_DIR, f"{name}.png")
    with open(png_path, "wb") as f:
        f.write(r_png.content)
    img = Image.open(png_path)
    print(f"[{name}] PNG Dimensions: {img.size} (Width x Height), Ratio: {img.size[1]/img.size[0]:.2f}")
    return img.size

PUML = """@startuml
skinparam dpi 160
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontColor #000000

left to right direction

actor "Citizen" as citizen
actor "Administrator" as admin

rectangle "System" {
  usecase "Citizen UC 1" as UC1
  usecase "Citizen UC 2" as UC2
  usecase "Admin UC 1" as UA1
  usecase "Admin UC 2" as UA2
}

citizen --> UC1
citizen --> UC2

UA1 <-- admin
UA2 <-- admin
@enduml
"""

if __name__ == "__main__":
    render("test_left_right", PUML)
