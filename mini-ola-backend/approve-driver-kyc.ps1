# Approve Driver KYC Script
# Quick way to approve driver KYC verification

param(
    [Parameter(Mandatory=$false)]
    [string]$driverEmail = ""
)

Write-Host "✅ Driver KYC Approval Tool" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

$mongoCommand = @"
const mongoose = require('mongoose');
const Driver = require('./src/models/Driver');

mongoose.connect('mongodb://localhost:27017/mini-ola')
  .then(async () => {
    const driverEmail = '$driverEmail';
    
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
      
      for (const driver of drivers) {
        console.log('Driver: ' + driver.user.name);
        console.log('  Email: ' + driver.user.email);
        console.log('  KYC Status: ' + driver.kycStatus);
        console.log('  Vehicle: ' + driver.vehicleType + ' - ' + driver.vehicleNumber);
        
        if (driver.kycStatus === 'pending') {
          driver.kycStatus = 'approved';
          await driver.save();
          console.log('  ✅ APPROVED!');
        } else if (driver.kycStatus === 'approved') {
          console.log('  ✓ Already approved');
        }
        console.log('');
      }
    }
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
"@

# Save to temp file
$tempFile = "approve-kyc-temp.js"
$mongoCommand | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "🔄 Connecting to database..." -ForegroundColor Yellow
Write-Host ""

# Run the script
node $tempFile

# Cleanup
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Usage:" -ForegroundColor Cyan
Write-Host "  Approve all pending: .\approve-driver-kyc.ps1" -ForegroundColor White
Write-Host "  Approve specific: .\approve-driver-kyc.ps1 -driverEmail 'kumar@example.com'" -ForegroundColor White
Write-Host ""
