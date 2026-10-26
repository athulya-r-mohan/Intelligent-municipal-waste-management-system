import os
import sys
import zlib
import requests

DIAGRAMS_DIR = os.path.dirname(os.path.abspath(__file__))

def encode_plantuml(plantuml_text):
    """
    Encode PlantUML text using zlib deflate + PlantUML 64-character mapping.
    """
    zlib_str = zlib.compress(plantuml_text.encode('utf-8'))[2:-4]
    mapping = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    res = ""
    for i in range(0, len(zlib_str), 3):
        b1 = zlib_str[i]
        b2 = zlib_str[i+1] if i+1 < len(zlib_str) else 0
        b3 = zlib_str[i+2] if i+2 < len(zlib_str) else 0
        c1 = b1 >> 2
        c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
        c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
        c4 = b3 & 0x3F
        res += mapping[c1] + mapping[c2] + mapping[c3] + mapping[c4]
    return res

def render_diagram(name, puml_content):
    puml_path = os.path.join(DIAGRAMS_DIR, f"{name}.puml")
    svg_path = os.path.join(DIAGRAMS_DIR, f"{name}.svg")
    png_path = os.path.join(DIAGRAMS_DIR, f"{name}.png")

    # Save .puml file
    with open(puml_path, "w", encoding="utf-8") as f:
        f.write(puml_content.strip() + "\n")
    print(f" Saved: {puml_path}")

    # Encode for PlantUML API
    encoded = encode_plantuml(puml_content)

    # Render SVG
    svg_url = f"http://www.plantuml.com/plantuml/svg/~1{encoded}"
    try:
        r_svg = requests.get(svg_url, timeout=30)
        if r_svg.status_code == 200:
            with open(svg_path, "wb") as f:
                f.write(r_svg.content)
            print(f" Rendered SVG: {svg_path} ({len(r_svg.content)} bytes)")
        else:
            print(f" Failed SVG for {name}: HTTP {r_svg.status_code}")
    except Exception as e:
        print(f" Error fetching SVG for {name}: {e}")

    # Render PNG
    png_url = f"http://www.plantuml.com/plantuml/png/~1{encoded}"
    try:
        r_png = requests.get(png_url, timeout=30)
        if r_png.status_code == 200:
            with open(png_path, "wb") as f:
                f.write(r_png.content)
            print(f" Rendered PNG: {png_path} ({len(r_png.content)} bytes)")
        else:
            print(f" Failed PNG for {name}: HTTP {r_png.status_code}")
    except Exception as e:
        print(f" Error fetching PNG for {name}: {e}")

if __name__ == "__main__":
    print("PlantUML Generator ready.")
