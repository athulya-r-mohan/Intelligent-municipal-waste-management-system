import re
import os
import subprocess

md_path = r"c:\Users\acer\OneDrive\Desktop\projects\waste-management-system\docs\EcoPulse_Database_Normalization_Report.md"
html_path = r"c:\Users\acer\OneDrive\Desktop\projects\waste-management-system\docs\EcoPulse_Database_Normalization_Report.html"
pdf_path = r"c:\Users\acer\OneDrive\Desktop\projects\waste-management-system\docs\EcoPulse_Database_Normalization_Report.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

html_body = []
in_table = False
table_header = False
in_code = False
code_lines = []

for line in lines:
    raw = line.rstrip("\r\n")
    
    # Code block
    if raw.startswith("```"):
        if in_code:
            in_code = False
            html_body.append(f"<pre><code>{'<br>'.join(code_lines)}</code></pre>")
            code_lines = []
        else:
            in_code = True
            code_lines = []
        continue
    if in_code:
        sanitized = raw.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        code_lines.append(sanitized)
        continue

    # Table handling
    if raw.startswith("|") and raw.endswith("|"):
        cells = [c.strip() for c in raw[1:-1].split("|")]
        if all(re.match(r"^:?-+:?$", c) for c in cells):
            # Separator line
            continue
        if not in_table:
            in_table = True
            html_body.append('<div class="table-container"><table>')
            html_body.append("<thead><tr>" + "".join(f"<th>{c}</th>" for c in cells) + "</tr></thead><tbody>")
        else:
            html_body.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
        continue
    else:
        if in_table:
            in_table = False
            html_body.append("</tbody></table></div>")

    # Headers
    if raw.startswith("# "):
        html_body.append(f"<h1>{raw[2:]}</h1>")
    elif raw.startswith("## "):
        html_body.append(f"<h2>{raw[3:]}</h2>")
    elif raw.startswith("### "):
        html_body.append(f"<h3>{raw[4:]}</h3>")
    elif raw.startswith("---"):
        html_body.append("<hr>")
    elif raw.strip() == "":
        continue
    else:
        # Convert inline markdown
        p = raw
        p = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", p)
        p = re.sub(r"\*(.*?)\*", r"<em>\1</em>", p)
        p = re.sub(r"`(.*?)`", r"<code>\1</code>", p)
        html_body.append(f"<p>{p}</p>")

if in_table:
    html_body.append("</tbody></table></div>")

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EcoPulse - Database Normalization Report</title>
<style>
    @page {{
        size: A4 portrait;
        margin: 20mm 15mm 20mm 15mm;
    }}
    body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #1a1a1a;
        background: #ffffff;
        max-width: 900px;
        margin: 0 auto;
        padding: 30px 20px;
    }}
    h1 {{
        font-size: 20pt;
        color: #0f172a;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 6px;
        margin-top: 15px;
        margin-bottom: 8px;
    }}
    h2 {{
        font-size: 15pt;
        color: #1e293b;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 4px;
        margin-top: 25px;
        margin-bottom: 12px;
        page-break-after: avoid;
    }}
    h3 {{
        font-size: 12pt;
        color: #334155;
        margin-top: 18px;
        margin-bottom: 6px;
        page-break-after: avoid;
    }}
    p {{
        margin: 6px 0;
    }}
    hr {{
        border: 0;
        border-top: 1px solid #e2e8f0;
        margin: 20px 0;
    }}
    .table-container {{
        width: 100%;
        overflow-x: auto;
        margin: 12px 0 18px 0;
        page-break-inside: avoid;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5pt;
        page-break-inside: avoid;
    }}
    th, td {{
        border: 1px solid #94a3b8;
        padding: 6px 9px;
        text-align: left;
        vertical-align: top;
    }}
    th {{
        background-color: #f1f5f9;
        font-weight: 600;
        color: #0f172a;
    }}
    tr:nth-child(even) td {{
        background-color: #f8fafc;
    }}
    pre {{
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 10px 14px;
        font-size: 9pt;
        font-family: Consolas, Monaco, "Courier New", monospace;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        page-break-inside: avoid;
    }}
    code {{
        font-family: Consolas, Monaco, "Courier New", monospace;
        font-size: 9pt;
        background-color: #f1f5f9;
        padding: 2px 4px;
        border-radius: 3px;
    }}
    @media print {{
        body {{
            max-width: 100%;
            padding: 0;
        }}
        h2 {{
            page-break-before: auto;
        }}
        table, pre {{
            page-break-inside: avoid;
        }}
    }}
</style>
</head>
<body>
{"".join(html_body)}
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)
print(f"HTML generated at: {html_path}")

# Generate PDF via Edge headless
edge_cmd = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={pdf_path}",
    html_path
]
print("Running Edge PDF generation...")
res = subprocess.run(edge_cmd, capture_output=True, text=True)
if os.path.exists(pdf_path):
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"SUCCESS: PDF generated at: {pdf_path} ({size_kb:.1f} KB)")
else:
    print(f"FAILED to generate PDF. Edge stderr: {res.stderr}")
