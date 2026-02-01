from PIL import Image
import os

def analyze_directory(directory):
    print(f"\nAnalyzing directory: {directory}")
    print("-" * 80)
    print(f"{'Filename':<40} | {'Size (KB)':<10} | {'Dimensions':<15} | {'MegaPixels':<10}")
    print("-" * 80)
    
    for filename in os.listdir(directory):
        if filename.lower().endswith('.webp'):
            filepath = os.path.join(directory, filename)
            try:
                size_kb = os.path.getsize(filepath) / 1024
                with Image.open(filepath) as img:
                    width, height = img.size
                    mp = (width * height) / 1000000
                    
                print(f"{filename[:38]:<40} | {size_kb:<10.1f} | {f'{width}x{height}':<15} | {mp:<10.1f}")
            except Exception as e:
                print(f"Error reading {filename}: {e}")

base_dir = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images"
analyze_directory(base_dir)

hero_dir = os.path.join(base_dir, "hero")
if os.path.exists(hero_dir):
    analyze_directory(hero_dir)
