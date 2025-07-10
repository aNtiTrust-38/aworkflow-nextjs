#!/bin/bash

# Create proper ICNS icon for macOS
# This script converts the SVG icon to proper ICNS format

echo "🎨 Creating macOS ICNS icon..."

# Create temporary iconset directory
mkdir -p build/assets/icon.iconset

# Create all required icon sizes
declare -a sizes=("16" "32" "64" "128" "256" "512" "1024")

for size in "${sizes[@]}"; do
    echo "Creating ${size}x${size} icon..."
    
    # Create PNG from SVG (if available tools exist)
    if command -v rsvg-convert >/dev/null 2>&1; then
        rsvg-convert -w $size -h $size build/assets/icon.svg -o "build/assets/icon.iconset/icon_${size}x${size}.png"
    elif command -v convert >/dev/null 2>&1; then
        convert -background transparent -size ${size}x${size} build/assets/icon.svg "build/assets/icon.iconset/icon_${size}x${size}.png"
    else
        # Fallback: copy SVG as PNG for each size
        cp build/assets/icon.svg "build/assets/icon.iconset/icon_${size}x${size}.png"
    fi
    
    # Create @2x versions for retina
    if [ $size -le 512 ]; then
        retina_size=$((size * 2))
        if command -v rsvg-convert >/dev/null 2>&1; then
            rsvg-convert -w $retina_size -h $retina_size build/assets/icon.svg -o "build/assets/icon.iconset/icon_${size}x${size}@2x.png"
        elif command -v convert >/dev/null 2>&1; then
            convert -background transparent -size ${retina_size}x${retina_size} build/assets/icon.svg "build/assets/icon.iconset/icon_${size}x${size}@2x.png"
        else
            cp build/assets/icon.svg "build/assets/icon.iconset/icon_${size}x${size}@2x.png"
        fi
    fi
done

# Create ICNS file if iconutil is available (macOS only)
if command -v iconutil >/dev/null 2>&1; then
    iconutil -c icns build/assets/icon.iconset -o build/assets/icon.icns
    echo "✅ ICNS icon created successfully"
else
    # Fallback: copy SVG as ICNS
    cp build/assets/icon.svg build/assets/icon.icns
    echo "⚠️  iconutil not available, using SVG as ICNS"
fi

# Clean up
rm -rf build/assets/icon.iconset

echo "🎉 Icon creation completed"