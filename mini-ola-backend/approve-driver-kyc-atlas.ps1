# Approve Driver KYC Script - MongoDB Atlas Version
# Quick way to approve driver KYC verification

param(
    [Parameter(Mandatory=$false)]
    [string]$driverEmail = "",
    
    [Parameter(Mandatory=$true)]
    [string]$mongoUri = ""  # Your Atlas connection string
)

Write-Host "✅ Driver KYC Approval Tool (Atlas)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if (-not $mongoUri) {
    Write-Host "❌ Error: MongoDB Atlas URI is required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host '  .\approve-driver-kyc-atlas.ps1 -mongoUri "mongodb+srv://username:password@cluster.mongodb.net/mini-ola"' -ForegroundColor White
    Write-Host ""
    Write-Host "Optional: Add -driverEmail to approve specific driver" -ForegroundColor Yellow
    Write-Host '  .\approve-driver-kyc-atlas.ps1 -mongoUri "..." -driverEmail "kumar@example.com"' -ForegroundColor White
    Write-Host ""
    exit
}

$mongoCommand = @"
const mongoose = require('mongoose');
const Driver = require('./src/models/Driver');

const mongoUri = '$mongoUri';
const driverEmail = '$driverEmail';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas\n');
    
    if (driverEmail) {
      // Approve specific driver
      const User = require('./src/models/User');
      const user = await User.findOne({ email: driverEmail });
      
      if (!user) {
        console.log('❌ User not found with email: ' + driverEmail);
        process.exit(1);
      }
      
      const driver = await Driver.findOne({ user: user._id }).populate('user', 'name email');
      
      if (!driver) {
        console.log('❌ Driver profile not found for: ' + driverEmail);
        process.exit(1);
      }
      
      if (driver.kycStatus === 'approved') {
        console.log('ℹ️  Driver ' + driver.user.name + ' is already approved!');
      } else {
        driver.kycStatus = 'approved';
        await driver.save();
        console.log('✅ KYC approved for driver: ' + driver.user.name + ' (' + driver.user.email + ')');
      }
    } else {
      // Show all drivers and approve all pending
      const drivers = await Driver.find({}).populate('user', 'name email');
      
      console.log('📋 All Drivers:\n');
      
      let approvedCount = 0;
      
      for (const driver of drivers) {
        console.log('Driver: ' + driver.user.name);
        console.log('  Email: ' + driver.user.email);
        console.log('  KYC Status: ' + driver.kycStatus);
        console.log('  Vehicle: ' + driver.vehicleType + ' - ' + driver.vehicleNumber);
        
        if (driver.kycStatus === 'pending') {
          driver.kycStatus = 'approved';
          await driver.save();
          console.log('  ✅ APPROVED!');
          approvedCount++;
        } else if (driver.kycStatus === 'approved') {
          console.log('  ✓ Already approved');
        }
        console.log('');
      }
      
      console.log('====================================');
      console.log('Total drivers approved: ' + approvedCount);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error connecting to MongoDB Atlas:', err.message);
    console.log('\nCheck your connection string and make sure:');
    console.log('  • Username and password are correct');
    console.log('  • IP address is whitelisted in Atlas');
    console.log('  • Network access is configured');
    process.exit(1);
  });
"@

# Save to temp file
$tempFile = "approve-kyc-atlas-temp.js"
$mongoCommand | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "🔄 Connecting to MongoDB Atlas..." -ForegroundColor Yellow
Write-Host ""

# Run the script
node $tempFile

# Cleanup
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
