from PIL import Image
import os

# Directory containing the images
images_dir = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images"

# List of files to convert
files_to_convert = [
    "background.jpg",
    "hero_bg.png",
    "study_pathway_infographic.png",
    "study_pathway_new.jpg"
]

print("Converting large images to WebP format...")
print("-" * 50)

for filename in files_to_convert:
    file_path = os.path.join(images_dir, filename)
    
    # Create WebP filename
    name_part = os.path.splitext(filename)[0]
    webp_filename = f"{name_part}.webp"
    webp_path = os.path.join(images_dir, webp_filename)
    
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"⚠ File not found: {filename}")
            continue

        # Open image
        img = Image.open(file_path)
        
        # Get original size
        original_size = os.path.getsize(file_path)
        
        # Convert and save as WebP with optimized settings (quality 80)
        img.save(webp_path, 'WebP', quality=80, method=6)
        
        # Get new size
        webp_size = os.path.getsize(webp_path)
        
        # Calculate savings
        savings = ((original_size - webp_size) / original_size) * 100
        
        print(f"✓ {filename}")
        print(f"  Original: {original_size / 1024:.1f} KB")
        print(f"  WebP: {webp_size / 1024:.1f} KB")
        print(f"  Savings: {savings:.1f}%")
        print()
        
    except Exception as e:
        print(f"✗ Error converting {filename}: {e}")
        print()

print("-" * 50)
print("Conversion complete!")
