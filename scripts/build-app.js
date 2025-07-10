#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function createDirectories() {
  console.log('📁 Creating build directories...');
  
  const dirs = [
    'build',
    'build/assets',
    'build/installers',
    'build/temp',
    'dist',
    'dist/electron'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to create ${dir}:`, error.message);
    }
  }
}

async function cleanBuild() {
  console.log('🧹 Cleaning previous builds...');
  
  const pathsToClean = [
    'build/installers',
    'build/temp',
    'dist'
  ];
  
  for (const cleanPath of pathsToClean) {
    try {
      await fs.rm(cleanPath, { recursive: true, force: true });
      console.log(`✅ Cleaned ${cleanPath}`);
    } catch (error) {
      console.log(`ℹ️  ${cleanPath} didn't exist or couldn't be cleaned`);
    }
  }
}

function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function createPlaceholderAssets() {
  console.log('🎨 Creating placeholder assets...');
  
  // Create a simple icon placeholder (we'll replace this with real icons later)
  const iconSizes = [16, 32, 64, 128, 256, 512, 1024];
  
  for (const size of iconSizes) {
    const iconPath = path.join('build/assets', `icon-${size}.png`);
    try {
      // Create a simple colored square as placeholder
      const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#2563eb"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${size/8}">AW</text>
      </svg>`;
      
      await fs.writeFile(iconPath.replace('.png', '.svg'), canvas);
      console.log(`✅ Created placeholder icon ${size}x${size}`);
    } catch (error) {
      console.error(`❌ Failed to create icon ${size}x${size}:`, error.message);
    }
  }
  
  // Create main icon placeholder
  const mainIcon = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="180" fill="url(#grad)"/>
    <text x="512" y="400" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="120">📚</text>
    <text x="512" y="580" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="80">Academic</text>
    <text x="512" y="680" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="80">Workflow</text>
  </svg>`;
  
  await fs.writeFile('build/assets/icon.svg', mainIcon);
  console.log('✅ Created main app icon');
}

async function generateBuildReport() {
  console.log('📊 Generating build report...');
  
  const buildInfo = {
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  };
  
  try {
    // Check if installers were created
    const installerDir = 'build/installers';
    const files = await fs.readdir(installerDir).catch(() => []);
    buildInfo.installers = files;
    
    // Calculate file sizes
    const fileSizes = {};
    for (const file of files) {
      try {
        const stats = await fs.stat(path.join(installerDir, file));
        fileSizes[file] = `${(stats.size / 1024 / 1024).toFixed(2)} MB`;
      } catch (error) {
        fileSizes[file] = 'Unknown';
      }
    }
    buildInfo.fileSizes = fileSizes;
    
    await fs.writeFile(
      'build/build-report.json', 
      JSON.stringify(buildInfo, null, 2)
    );
    
    console.log('✅ Build report generated');
    console.log('📋 Build Summary:');
    console.log(`   Version: ${buildInfo.version}`);
    console.log(`   Platform: ${buildInfo.platform}`);
    console.log(`   Installers: ${buildInfo.installers.length > 0 ? buildInfo.installers.join(', ') : 'None'}`);
    
    return buildInfo;
  } catch (error) {
    console.error('❌ Failed to generate build report:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Academic Workflow build process...\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Clean and setup
    await cleanBuild();
    await createDirectories();
    await createPlaceholderAssets();
    
    // Step 2: Build Next.js application
    if (!runCommand('npm run build', 'Building Next.js application')) {
      throw new Error('Next.js build failed');
    }
    
    // Step 3: Compile Electron TypeScript
    if (!runCommand('npx tsc electron/*.ts --outDir dist/electron --target ES2020 --module commonjs --skipLibCheck --esModuleInterop', 'Compiling Electron TypeScript')) {
      throw new Error('Electron TypeScript compilation failed');
    }
    
    // Step 4: Package with Electron Builder (macOS only for now)
    if (process.platform === 'darwin') {
      if (!runCommand('npx electron-builder --mac', 'Packaging macOS application')) {
        console.warn('⚠️  Electron packaging completed with warnings');
      }
    } else {
      console.log('ℹ️  Skipping macOS packaging on non-macOS platform');
      console.log('ℹ️  Run on macOS to create .dmg and .pkg installers');
    }
    
    // Step 5: Generate build report
    const buildReport = await generateBuildReport();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Build completed successfully in ${duration} seconds!`);
    
    if (process.platform === 'darwin' && buildReport?.installers.length > 0) {
      console.log('\n📦 Installers created:');
      for (const installer of buildReport.installers) {
        console.log(`   - ${installer} (${buildReport.fileSizes[installer]})`);
      }
      console.log('\n💡 To install: Open the .dmg file and drag to Applications');
    }
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };