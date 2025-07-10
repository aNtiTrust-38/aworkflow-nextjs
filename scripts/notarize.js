#!/usr/bin/env node

const { notarize } = require('electron-notarize');
const path = require('path');

async function notarizeApp() {
  console.log('🔐 Starting macOS app notarization...');
  
  // Check if we're on macOS
  if (process.platform !== 'darwin') {
    console.log('ℹ️  Notarization is only available on macOS');
    return;
  }
  
  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  
  if (!appleId || !appleIdPassword || !teamId) {
    console.log('⚠️  Skipping notarization: Missing Apple credentials');
    console.log('   Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID environment variables');
    console.log('   to enable automatic notarization');
    return;
  }
  
  // Find the app to notarize
  const appPath = path.join(__dirname, '../build/installers/mac/Academic Workflow.app');
  
  try {
    console.log('📝 Submitting app for notarization...');
    console.log(`   App: ${appPath}`);
    console.log(`   Apple ID: ${appleId}`);
    console.log(`   Team ID: ${teamId}`);
    
    await notarize({
      appBundleId: 'com.academicworkflow.app',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId
    });
    
    console.log('✅ Notarization completed successfully!');
    console.log('🎉 Your app is now ready for distribution');
    
  } catch (error) {
    console.error('❌ Notarization failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Verify your Apple ID and password are correct');
    console.log('   2. Ensure your Apple ID has access to the team');
    console.log('   3. Check that the app is properly signed');
    console.log('   4. Make sure you have a valid Developer ID certificate');
    throw error;
  }
}

async function main() {
  try {
    await notarizeApp();
  } catch (error) {
    console.error('Notarization process failed:', error.message);
    process.exit(1);
  }
}

// Export for use in electron-builder afterSign hook
module.exports = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }
  
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  
  if (!appleId || !appleIdPassword || !teamId) {
    console.log('⚠️  Skipping notarization: Missing Apple credentials');
    return;
  }
  
  console.log('🔐 Notarizing app...');
  
  await notarize({
    appBundleId: 'com.academicworkflow.app',
    appPath: appPath,
    appleId: appleId,
    appleIdPassword: appleIdPassword,
    teamId: teamId
  });
  
  console.log('✅ Notarization completed');
};

// Run if called directly
if (require.main === module) {
  main();
}