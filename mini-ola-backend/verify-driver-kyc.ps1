# Quick Admin Script - Verify Driver KYC via MongoDB
# This script uses mongoose to directly update the database

Write-Host ""
Write-Host "Creating temporary admin script..." -ForegroundColor Yellow

$adminScript = @"
const mongoose = require('mongoose');
require('dotenv').config();

async function verifyDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Update driver with email driver@test.com
    const Driver = mongoose.model('Driver', new mongoose.Schema({
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      isKycVerified: Boolean,
      kycStatus: String,
      isAvailable: Boolean
    }));
    
    const User = mongoose.model('User', new mongoose.Schema({
      email: String
    }));
    
    // Find user with email
    const user = await User.findOne({ email: 'driver@test.com' });
    if (!user) {
      console.log('Driver user not found!');
      process.exit(1);
    }
    
    console.log('Found driver user:', user._id);
    
    // Update driver profile
    const result = await Driver.updateOne(
      { user: user._id },
      { 
        isKycVerified: true,
        kycStatus: 'approved'
      }
    );
    
    console.log('Update result:', result);
    
    // Verify the update
    const driver = await Driver.findOne({ user: user._id });
    console.log('Driver KYC Status:', driver.isKycVerified);
    console.log('Driver KYC Field:', driver.kycStatus);
    
    if (driver.isKycVerified && driver.kycStatus === 'approved') {
      console.log('SUCCESS: Driver KYC is now verified and approved!');
    } else {
      console.log('WARNING: Fields may not be updated correctly');
      console.log('isKycVerified:', driver.isKycVerified);
      console.log('kycStatus:', driver.kycStatus);
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyDriver();
"@

# Write the admin script
$adminScript | Out-File -FilePath "admin-verify-kyc.js" -Encoding UTF8

Write-Host "Running KYC verification..." -ForegroundColor Yellow
node admin-verify-kyc.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Driver KYC verified!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now run: .\test-setup-driver.ps1 to bring driver online" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "FAILED: Could not verify driver" -ForegroundColor Red
}

# Clean up
Remove-Item "admin-verify-kyc.js" -ErrorAction SilentlyContinue
