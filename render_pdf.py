import subprocess
import os

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
html_path = r"C:\Users\alexa\Documents\antigravity\fervent-hubble\apresentacao.html"
pdf_path = r"C:\Users\alexa\Documents\antigravity\fervent-hubble\apresentacao_comercial.pdf"

# Garante que o diretório de destino existe
os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

args = [
    edge_path,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={pdf_path}",
    "--no-margins",
    "--virtual-time-budget=5000",
    html_path
]

print("Running command:")
print(" ".join(args))

result = subprocess.run(args, capture_output=True, text=True)

print("Return code:", result.returncode)
print("Stdout:", result.stdout)
print("Stderr:", result.stderr)

if os.path.exists(pdf_path):
    print("SUCCESS: PDF generated at", pdf_path, "Size:", os.path.getsize(pdf_path), "bytes")
else:
    print("FAILURE: PDF was not generated.")
