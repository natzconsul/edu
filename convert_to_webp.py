from PIL import Image
import os

# Directory containing the images
hero_dir = r"c:\Users\user\.gemini\antigravity\scratch\edu\assets\images\hero"

# List of PNG files to convert
png_files = [
    "geography_students_1769575797124.png",
    "science_professionals_1769575809751.png",
    "business_professionals_1769575843013.png",
    "arts_students_1769575856678.png",
    "technology_students_1769575872388.png"
]

print("Converting PNG images to WebP format...")
print("-" * 50)

for png_file in png_files:
    png_path = os.path.join(hero_dir, png_file)
    
    # Create WebP filename (replace .png with .webp)
    webp_file = png_file.replace('.png', '.webp')
    webp_path = os.path.join(hero_dir, webp_file)
    
    try:
        # Open PNG image
        img = Image.open(png_path)
        
        # Get original size
        original_size = os.path.getsize(png_path)
        
        # Convert and save as WebP with high quality (85)
        img.save(webp_path, 'WebP', quality=85, method=6)
        
        # Get new size
        webp_size = os.path.getsize(webp_path)
        
        # Calculate savings
        savings = ((original_size - webp_size) / original_size) * 100
        
        print(f"✓ {png_file}")
        print(f"  Original: {original_size / 1024:.1f} KB")
        print(f"  WebP: {webp_size / 1024:.1f} KB")
        print(f"  Savings: {savings:.1f}%")
        print()
        
    except Exception as e:
        print(f"✗ Error converting {png_file}: {e}")
        print()

print("-" * 50)
print("Conversion complete!")
