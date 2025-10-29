# Mini Ola Complete Ride Flow Test
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Testing Complete Ride Flow" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"

# Step 1: Verify we have tokens
if (-not $global:riderToken -or -not $global:driverToken) {
    Write-Host "ERROR: Please run test-simple.ps1 first to get tokens!" -ForegroundColor Red
    exit
}

Write-Host "Step 1: Request a Ride" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
$headers = @{
    Authorization = "Bearer $global:riderToken"
}
$rideData = @{
    pickupLat = 12.9716
    pickupLng = 77.5946
    pickupAddress = "MG Road, Bangalore"
    dropoffLat = 12.9352
    dropoffLng = 77.6245
    dropoffAddress = "Indiranagar, Bangalore"
    rideType = "sedan"
    paymentMethod = "cash"
} | ConvertTo-Json

try {
    $rideResponse = Invoke-RestMethod -Uri "$baseUrl/api/rides/request" -Method Post -Body $rideData -Headers $headers -ContentType "application/json"
    Write-Host "SUCCESS - Ride Requested!" -ForegroundColor Green
    Write-Host "Ride ID: $($rideResponse.data._id)" -ForegroundColor White
    Write-Host "Fare: Rs.$($rideResponse.data.fare)" -ForegroundColor Cyan
    Write-Host "Status: $($rideResponse.data.status)" -ForegroundColor White
    $global:rideId = $rideResponse.data._id
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Details: $($errorDetails.message)" -ForegroundColor Yellow
    Write-Host ""
    exit
}

# Step 2: Check Ride History
Write-Host "Step 2: Check Rider's Ride History" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
try {
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/api/rides/history" -Method Get -Headers $headers
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Total Rides: $($historyResponse.data.Count)" -ForegroundColor White
    Write-Host "Latest Ride Status: $($historyResponse.data[0].status)" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Step 3: Get Rider Profile
Write-Host "Step 3: Get Rider Profile" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/profile" -Method Get -Headers $headers
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Name: $($profileResponse.data.name)" -ForegroundColor White
    Write-Host "Email: $($profileResponse.data.email)" -ForegroundColor White
    Write-Host "Rating: $($profileResponse.data.rating)" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Step 4: Driver accepts the ride (Simulated)
Write-Host "Step 4: Simulating Driver Actions" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
$driverHeaders = @{
    Authorization = "Bearer $global:driverToken"
}

# Try to get driver profile to check KYC status
try {
    $driverProfile = Invoke-RestMethod -Uri "$baseUrl/api/auth/profile" -Method Get -Headers $driverHeaders
    Write-Host "Driver: $($driverProfile.data.name)" -ForegroundColor White
    Write-Host "KYC Status: $($driverProfile.data.driver.isKycVerified)" -ForegroundColor White
    
    if (-not $driverProfile.data.driver.isKycVerified) {
        Write-Host "Note: Driver KYC not verified - some operations may be restricted" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Step 5: Get ride details
Write-Host "Step 5: Get Ride Details" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
try {
    $rideDetails = Invoke-RestMethod -Uri "$baseUrl/api/rides/$global:rideId" -Method Get -Headers $headers
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Ride ID: $($rideDetails.data._id)" -ForegroundColor White
    Write-Host "Status: $($rideDetails.data.status)" -ForegroundColor Cyan
    Write-Host "Pickup: $($rideDetails.data.pickupLocation.address)" -ForegroundColor White
    Write-Host "Dropoff: $($rideDetails.data.dropoffLocation.address)" -ForegroundColor White
    Write-Host "Fare: Rs.$($rideDetails.data.fare)" -ForegroundColor Green
    
    if ($rideDetails.data.driver) {
        Write-Host "Driver Assigned: Yes" -ForegroundColor Green
    } else {
        Write-Host "Driver Assigned: No (waiting for assignment)" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Ride Flow Test Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "- Ride successfully created with ID: $global:rideId" -ForegroundColor Green
Write-Host "- Ride is in 'requested' status" -ForegroundColor Yellow
Write-Host "- Waiting for driver assignment (requires online driver nearby)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To complete the flow, you need:" -ForegroundColor White
Write-Host "1. Driver KYC verification (admin approval)" -ForegroundColor Gray
Write-Host "2. Driver to go online and be within 5km" -ForegroundColor Gray
Write-Host "3. Driver to accept the ride" -ForegroundColor Gray
Write-Host "4. Complete ride lifecycle (start, complete, payment)" -ForegroundColor Gray
Write-Host ""
Write-Host "Your ride ID: $global:rideId" -ForegroundColor Cyan
Write-Host "Save this ID for manual testing!" -ForegroundColor Yellow
Write-Host ""
