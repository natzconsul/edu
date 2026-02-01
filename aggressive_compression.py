from PIL import Image
import os

def compress_image(source_path, target_path, quality=60, max_dimension=None):
    try:
        if not os.path.exists(source_path):
            print(f"⚠ Source not found: {source_path}")
            return

        with Image.open(source_path) as img:
            # Resize if requested
            if max_dimension:
                width, height = img.size
                if width > max_dimension or height > max_dimension:
                    if width > height:
                        new_width = max_dimension
                        new_height = int(height * (max_dimension / width))
                    else:
                        new_height = max_dimension
                        new_width = int(width * (max_dimension / height))
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    print(f"  Resized to {new_width}x{new_height}")

            # Save as WebP
            img.save(target_path, 'WebP', quality=quality, method=6)
            
            new_size = os.path.getsize(target_path) / 1024
            print(f"  ✓ Saved to {os.path.basename(target_path)}: {new_size:.1f} KB (Quality: {quality})")

    except Exception as e:
        print(f"  ✗ Error: {e}")

# Base assets directory
assets_dir = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images"
hero_dir = os.path.join(assets_dir, "hero")

# 1. Compress Main Backgrounds (Quality 50 - very aggressive for bg)
print("Compressing Backgrounds (Quality 50)...")
compress_image(os.path.join(assets_dir, "background.jpg"), os.path.join(assets_dir, "background.webp"), quality=50)
compress_image(os.path.join(assets_dir, "hero_bg.png"), os.path.join(assets_dir, "hero_bg.webp"), quality=50)

# 2. Compress Infographics (Quality 65 - needs text readability)
print("\nCompressing Infographics (Quality 65)...")
compress_image(os.path.join(assets_dir, "study_pathway_infographic.png"), os.path.join(assets_dir, "study_pathway_infographic.webp"), quality=65)
compress_image(os.path.join(assets_dir, "study_pathway_new.jpg"), os.path.join(assets_dir, "study_pathway_new.webp"), quality=65)

# 3. Compress Hero Animation Slides (Quality 50 - moving images, less detail needed)
print("\nCompressing Hero Animation Slides (Quality 50)...")
hero_files = [
    "geography_students_1769575797124.png",
    "science_professionals_1769575809751.png",
    "business_professionals_1769575843013.png",
    "arts_students_1769575856678.png",
    "technology_students_1769575872388.png"
]

for filename in hero_files:
    source = os.path.join(hero_dir, filename)
    target = os.path.join(hero_dir, filename.replace('.png', '.webp'))
    print(f"Processing {filename}...")
    compress_image(source, target, quality=50)
