import os
from PIL import Image

src_path = r"C:\Users\ingen\.gemini\antigravity-ide\brain\98600ead-0eb3-4a13-8ea8-c310f310dbc7\media__1784579440315.jpg"
public_dir = r"c:\Users\ingen\Documents\APPS\Antigravity\LogiKinetics\public"
android_res_dir = r"c:\Users\ingen\Documents\APPS\Antigravity\LogiKinetics\android\app\src\main\res"

img = Image.open(src_path).convert("RGBA")
print(f"Source image loaded: {img.size}")

# Define public icon files and target sizes
public_icons = {
    "icon-192.png": (192, 192),
    "icon-192.v0.8.7.33.7.png": (192, 192),
    "icon-192-maskable.png": (192, 192),
    "icon-192-maskable.v0.8.7.33.7.png": (192, 192),
    "icon-512.png": (512, 512),
    "icon-512.v0.8.7.33.7.png": (512, 512),
    "icon-512-maskable.png": (512, 512),
    "icon-512-maskable.v0.8.7.33.7.png": (512, 512),
    "apple-touch-icon.png": (180, 180),
    "apple-touch-icon.v0.8.7.33.7.png": (180, 180),
    "favicon.png": (64, 64),
    "favicon.v0.8.7.33.7.png": (64, 64),
}

for fname, size in public_icons.items():
    out_path = os.path.join(public_dir, fname)
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(out_path, "PNG")
    print(f"Saved {fname} ({size[0]}x{size[1]})")

# Also save favicon.ico
ico_path = os.path.join(public_dir, "favicon.ico")
ico_img = img.resize((64, 64), Image.Resampling.LANCZOS)
ico_img.save(ico_path, format="ICO")
print("Saved favicon.ico")

# Android mipmap targets
mipmap_sizes = {
    "mipmap-mdpi": {"ic_launcher.png": (48, 48), "ic_launcher_round.png": (48, 48), "ic_launcher_foreground.png": (108, 108)},
    "mipmap-hdpi": {"ic_launcher.png": (72, 72), "ic_launcher_round.png": (72, 72), "ic_launcher_foreground.png": (162, 162)},
    "mipmap-xhdpi": {"ic_launcher.png": (96, 96), "ic_launcher_round.png": (96, 96), "ic_launcher_foreground.png": (216, 216)},
    "mipmap-xxhdpi": {"ic_launcher.png": (144, 144), "ic_launcher_round.png": (144, 144), "ic_launcher_foreground.png": (324, 324)},
    "mipmap-xxxhdpi": {"ic_launcher.png": (192, 192), "ic_launcher_round.png": (192, 192), "ic_launcher_foreground.png": (432, 432)}
}

if os.path.exists(android_res_dir):
    for folder, files in mipmap_sizes.items():
        folder_path = os.path.join(android_res_dir, folder)
        if os.path.exists(folder_path):
            for fname, size in files.items():
                out_path = os.path.join(folder_path, fname)
                resized = img.resize(size, Image.Resampling.LANCZOS)
                resized.save(out_path, "PNG")
                print(f"Saved Android {folder}/{fname} ({size[0]}x{size[1]})")

print("All icon processing completed successfully!")
