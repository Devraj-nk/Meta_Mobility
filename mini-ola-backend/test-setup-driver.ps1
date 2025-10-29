# Setup Test Environment with KYC Verified Driver
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Setting Up Test Environment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"

# Check if we have driver token
if (-not $global:driverToken) {
    Write-Host "ERROR: Please run test-simple.ps1 first to get driver token!" -ForegroundColor Red
    exit
}

$driverHeaders = @{
    Authorization = "Bearer $global:driverToken"
}

# Step 1: Get Driver Profile
Write-Host "Step 1: Checking Driver Profile" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
try {
    $driverProfile = Invoke-RestMethod -Uri "$baseUrl/api/auth/profile" -Method Get -Headers $driverHeaders
    Write-Host "Driver Name: $($driverProfile.data.name)" -ForegroundColor White
    Write-Host "Email: $($driverProfile.data.email)" -ForegroundColor White
    Write-Host "KYC Verified: $($driverProfile.data.driver.isKycVerified)" -ForegroundColor $(if($driverProfile.data.driver.isKycVerified){"Green"}else{"Red"})
    Write-Host "Is Available: $($driverProfile.data.driver.isAvailable)" -ForegroundColor White
    $global:driverId = $driverProfile.data._id
    $global:driverProfileId = $driverProfile.data.driver._id
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Step 2: Manually verify KYC (Direct MongoDB update needed)
Write-Host "Step 2: KYC Verification Status" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
Write-Host "Note: KYC verification requires admin approval" -ForegroundColor Yellow
Write-Host "For testing purposes, you can manually update MongoDB:" -ForegroundColor White
Write-Host ""
Write-Host "MongoDB Compass or Shell Command:" -ForegroundColor Cyan
Write-Host "db.drivers.updateOne(" -ForegroundColor Gray
Write-Host "  { _id: ObjectId('$global:driverProfileId') }," -ForegroundColor Gray
Write-Host "  { `$set: { isKycVerified: true } }" -ForegroundColor Gray
Write-Host ")" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use this MongoDB URI in Compass:" -ForegroundColor Yellow
Write-Host "<MONGODB_URI from .env file or environment variable>" -ForegroundColor Gray
Write-Host ""

# Step 3: Try to go online anyway (will fail if not KYC verified)
Write-Host "Step 3: Attempting to Go Online" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
$availabilityData = @{
    isAvailable = $true
    latitude = 12.9716
    longitude = 77.5946
    address = "MG Road, Bangalore"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/availability" -Method Put -Body $availabilityData -Headers $driverHeaders -ContentType "application/json"
    Write-Host "SUCCESS - Driver is now ONLINE!" -ForegroundColor Green
    Write-Host "Location: $($response.data.currentLocation.address)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Reason: $($errorDetails.message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "1. Install MongoDB Compass: https://www.mongodb.com/try/download/compass" -ForegroundColor White
    Write-Host "2. Connect using the URI above" -ForegroundColor White
    Write-Host "3. Navigate to: mini-ola-db > drivers collection" -ForegroundColor White
    Write-Host "4. Find driver with email: driver@test.com" -ForegroundColor White
    Write-Host "5. Edit document and set isKycVerified: true" -ForegroundColor White
    Write-Host "6. Run this script again" -ForegroundColor White
    Write-Host ""
}

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current Status:" -ForegroundColor White
Write-Host "- Driver ID: $global:driverId" -ForegroundColor Gray
Write-Host "- Driver Profile ID: $global:driverProfileId" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Verify driver KYC (see instructions above)" -ForegroundColor Yellow
Write-Host "2. Run this script again to go online" -ForegroundColor Yellow
Write-Host "3. Then run test-ride-flow.ps1 to complete the flow" -ForegroundColor Yellow
Write-Host ""
