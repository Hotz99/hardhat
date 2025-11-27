import re
import os
import subprocess

# Configuration
INPUT_FILE = "./diagrams.md"
OUTPUT_DIR = "./generated_diagrams"
IMAGE_FORMAT = "svg" # Options: svg, png, pdf

def check_dependencies():
    """Checks if mermaid-cli (mmdc) is installed."""
    try:
        subprocess.run(["mmdc", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except FileNotFoundError:
        return False

def extract_and_render():
    if not check_dependencies():
        print("❌ Error: 'mmdc' not found. Install it using: bun install -g @mermaid-js/mermaid-cli")
        return

    # Create output directory
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Error: Could not find {INPUT_FILE}")
        return

    # Regex to find mermaid blocks
    # Looks for ```mermaid ...content... ```
    pattern = r"```mermaid\n(.*?)```"
    matches = re.findall(pattern, content, re.DOTALL)

    print(f"🔎 Found {len(matches)} diagrams. Processing...")

    for i, mermaid_code in enumerate(matches):
        file_index = i + 1
        
        # 1. Create a temporary .mmd file
        temp_mmd = f"temp_{file_index}.mmd"
        with open(temp_mmd, "w", encoding="utf-8") as f:
            f.write(mermaid_code.strip())

        # 2. Define output filename
        output_filename = os.path.join(OUTPUT_DIR, f"diagram_{file_index}.{IMAGE_FORMAT}")

        # 3. Run the mmdc command
        # -i: input, -o: output, -b: background color (transparent by default, white is safer for docs)
        cmd = ["mmdc", "-i", temp_mmd, "-o", output_filename, "-b", "white", "--scale", "2"]
        
        try:
            print(f"   ⚙️ Rendering Diagram {file_index}...")
            subprocess.run(cmd, check=True, shell=True if os.name == 'nt' else False)
            print(f"   ✅ Saved: {output_filename}")
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Failed to render Diagram {file_index}: {e}")
        finally:
            # 4. Cleanup temp file
            if os.path.exists(temp_mmd):
                os.remove(temp_mmd)

    print(f"\n✨ Done! Check the '{OUTPUT_DIR}' folder.")

if __name__ == "__main__":
    extract_and_render()