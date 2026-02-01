from PIL import Image
import os

source = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images\background_new.png"
target = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images\background.webp"

print(f"Converting {source} to {target}...")

try:
    with Image.open(source) as img:
        # Resize to 1920 max width (standard HD is enough for bg, 4k is overkill for file size)
        # The user specifically asked for "very low weight"
        max_dimension = 1920
        width, height = img.size
        
        if width > max_dimension:
            new_height = int(height * (max_dimension / width))
            img = img.resize((max_dimension, new_height), Image.Resampling.LANCZOS)
            print(f"Resized to {max_dimension}x{new_height}")
            
        # Quality 60 provides a great balance for abstract backgrounds
        img.save(target, 'WebP', quality=60, method=6)
        
    size_kb = os.path.getsize(target) / 1024
    print(f"✅ Success! New background size: {size_kb:.1f} KB")

except Exception as e:
    print(f"❌ Error: {e}")
