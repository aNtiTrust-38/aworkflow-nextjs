#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Testing Desktop Packaging Process...\n');

// 1. Verify all required files exist
const requiredFiles = [
  'electron/main.js',
  'electron/package.json',
  'electron/preload.js',
  'lib/database/desktop-config.ts',
  'build/icon.icns',
  'build/background.png',
  'next.config.ts'
];

console.log('✅ Checking required files...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    process.exit(1);
  }
  console.log(`   ✓ ${file}`);
}

// 2. Verify package.json configuration
console.log('\n✅ Checking package.json configuration...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredScripts = ['electron:dev', 'electron:build', 'electron:pack'];
for (const script of requiredScripts) {
  if (!packageJson.scripts[script]) {
    console.error(`❌ Missing script: ${script}`);
    process.exit(1);
  }
  console.log(`   ✓ ${script}: ${packageJson.scripts[script]}`);
}

// 3. Verify electron-builder configuration
console.log('\n✅ Checking electron-builder configuration...');
if (!packageJson.build) {
  console.error('❌ Missing build configuration');
  process.exit(1);
}

const buildConfig = packageJson.build;
const requiredBuildFields = ['appId', 'productName', 'mac', 'dmg'];
for (const field of requiredBuildFields) {
  if (!buildConfig[field]) {
    console.error(`❌ Missing build.${field}`);
    process.exit(1);
  }
  console.log(`   ✓ build.${field}`);
}

// 4. Verify DMG configuration
console.log('\n✅ Checking DMG configuration...');
const dmgConfig = buildConfig.dmg;
if (!dmgConfig.contents || dmgConfig.contents.length !== 2) {
  console.error('❌ Invalid DMG contents configuration');
  process.exit(1);
}

const firstItem = dmgConfig.contents[0];
const secondItem = dmgConfig.contents[1];

if (firstItem.x !== 130 || firstItem.y !== 220) {
  console.error('❌ Invalid first item position');
  process.exit(1);
}

if (secondItem.x !== 410 || secondItem.y !== 220 || secondItem.path !== '/Applications') {
  console.error('❌ Invalid Applications link configuration');
  process.exit(1);
}

console.log('   ✓ DMG layout configuration');
console.log('   ✓ Applications link configuration');

// 5. Test Next.js configuration
console.log('\n✅ Checking Next.js configuration...');
const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
if (!nextConfig.includes('output: \'standalone\'')) {
  console.error('❌ Missing standalone output configuration');
  process.exit(1);
}
console.log('   ✓ Standalone output enabled');

// 6. Test Electron dependencies
console.log('\n✅ Checking Electron dependencies...');
const electronPackage = JSON.parse(fs.readFileSync('electron/package.json', 'utf8'));
if (electronPackage.main !== 'main.js') {
  console.error('❌ Invalid electron main file');
  process.exit(1);
}
console.log('   ✓ Electron main process configured');

console.log('\n🎉 All packaging tests passed!');
console.log('\n📦 To build the DMG installer:');
console.log('   npm run electron:build');
console.log('\n🚀 To test in development:');
console.log('   npm run electron:dev');
console.log('\n📱 The installer will create a drag-to-Applications experience');
console.log('   exactly like the Chrome screenshot you provided!');