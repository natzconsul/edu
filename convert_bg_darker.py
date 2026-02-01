from PIL import Image
import os

source = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images\background_darker_source.png"
target = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images\background.webp"

print(f"Converting {source} to {target}...")

try:
    with Image.open(source) as img:
        # Resize to 1280 max width (User requested "even smaller" and "instant load")
        # 1280px is sufficient for a dark, abstract background
        max_dimension = 1280
        width, height = img.size
        
        if width > max_dimension:
            new_height = int(height * (max_dimension / width))
            img = img.resize((max_dimension, new_height), Image.Resampling.LANCZOS)
            print(f"Resized to {max_dimension}x{new_height}")
            
        # Quality 50 - aggressive compression for minimal file size
        img.save(target, 'WebP', quality=50, method=6)
        
    size_kb = os.path.getsize(target) / 1024
    print(f"✅ Success! New background size: {size_kb:.1f} KB")

except Exception as e:
    print(f"❌ Error: {e}")
