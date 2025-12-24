const sharp = require('sharp');
const path = require('path');

async function cropFavicon() {
  const inputPath = path.join(__dirname, 'assets', 'shelfze_no_bg.png');
  const outputPath = path.join(__dirname, 'assets', 'favicon.png');
  
  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log('Original size:', metadata.width, 'x', metadata.height);
    
    // Calculate crop dimensions (center 60% - zoomed out 10% from previous)
    const cropPercent = 0.60;
    const margin = (1 - cropPercent) / 2;
    
    const left = Math.floor(metadata.width * margin);
    const top = Math.floor(metadata.height * margin);
    const width = Math.floor(metadata.width * cropPercent);
    const height = Math.floor(metadata.height * cropPercent);
    
    console.log('Cropping to:', width, 'x', height, 'from position', left, top);
    
    // Crop center 80% and resize to 64x64 for favicon
    await sharp(inputPath)
      .extract({ left, top, width, height })
      .resize(64, 64)
      .toFile(outputPath);
    
    console.log('✅ Favicon created successfully:', outputPath);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

cropFavicon();
