# Mini Ola API Test Script
# Run this in PowerShell to test all APIs

$baseUrl = "http://localhost:5000"

Write-Host "`n🚕 Mini Ola Backend API Testing`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Register Rider
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Test 2: Register Rider" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$riderData = @{
    name = "Chethan Test"
    email = "chethan@test.com"
    phone = "9876543210"
    password = "test123"
    role = "rider"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $riderData -ContentType "application/json"
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host "User created: $($response.data.user.name)" -ForegroundColor White
    Write-Host "Email: $($response.data.user.email)" -ForegroundColor White
    $global:riderToken = $response.data.token
    Write-Host "🔑 Token saved for rider!" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Note: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   (User might already exist - try login instead)" -ForegroundColor Gray
}

# Test 3: Register Driver
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Test 3: Register Driver" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$driverData = @{
    name = "Driver Kumar"
    email = "driver@test.com"
    phone = "9876543211"
    password = "test123"
    role = "driver"
    vehicleType = "sedan"
    vehicleNumber = "KA01AB1234"
    vehicleModel = "Honda City"
    vehicleColor = "White"
    licenseNumber = "DL1234567890"
    licenseExpiry = "2026-12-31"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $driverData -ContentType "application/json"
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host "Driver created: $($response.data.user.name)" -ForegroundColor White
    Write-Host "Vehicle: $($response.data.user.driverProfile.vehicleModel)" -ForegroundColor White
    $global:driverToken = $response.data.token
    Write-Host "🔑 Token saved for driver!" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Note: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   (Driver might already exist - try login instead)" -ForegroundColor Gray
}

# Test 4: Login Rider
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Test 4: Login Rider" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$loginData = @{
    email = "chethan@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host "Logged in as: $($response.data.user.name)" -ForegroundColor White
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor White
    $global:riderToken = $response.data.token
    Write-Host "🔑 Token: $($global:riderToken.Substring(0,30))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Login Driver
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Test 5: Login Driver" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$loginData = @{
    email = "driver@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host "Logged in as: $($response.data.user.name)" -ForegroundColor White
    Write-Host "Vehicle: $($response.data.user.driverProfile.vehicleModel)" -ForegroundColor White
    $global:driverToken = $response.data.token
    Write-Host "🔑 Token: $($global:driverToken.Substring(0,30))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get Rider Profile
if ($global:riderToken) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Test 6: Get Rider Profile (Protected Route)" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    $headers = @{
        Authorization = "Bearer $global:riderToken"
    }
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/profile" -Method Get -Headers $headers
        Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
        Write-Host "Name: $($response.data.user.name)" -ForegroundColor White
        Write-Host "Email: $($response.data.user.email)" -ForegroundColor White
        Write-Host "Phone: $($response.data.user.phone)" -ForegroundColor White
        Write-Host "Rides Completed: $($response.data.user.ridesCompleted)" -ForegroundColor White
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 7: Get Fare Estimate
if ($global:riderToken) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Test 7: Get Fare Estimate" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    $headers = @{
        Authorization = "Bearer $global:riderToken"
    }
    $fareData = @{
        pickupLat = 12.9716
        pickupLng = 77.5946
        dropoffLat = 12.9352
        dropoffLng = 77.6245
        rideType = "sedan"
        isGroupRide = $false
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/rides/estimate" -Method Post -Body $fareData -Headers $headers -ContentType "application/json"
        Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
        Write-Host "Ride Type: $($response.data.breakdown.rideType)" -ForegroundColor White
        Write-Host "Distance: $($response.data.breakdown.distance)" -ForegroundColor White
        Write-Host "Estimated Time: $($response.data.breakdown.estimatedTime)" -ForegroundColor White
        Write-Host "Base Fare: ₹$($response.data.baseFare)" -ForegroundColor White
        Write-Host "Distance Fare: ₹$($response.data.distanceFare)" -ForegroundColor White
        Write-Host "Time Fare: ₹$($response.data.timeFare)" -ForegroundColor White
        Write-Host "Total Fare: ₹$($response.data.estimatedFare)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 8: Driver - Go Online
if ($global:driverToken) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Test 8: Driver - Toggle Availability (Go Online)" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    $headers = @{
        Authorization = "Bearer $global:driverToken"
    }
    $availabilityData = @{
        isAvailable = $true
        latitude = 12.9716
        longitude = 77.5946
        address = "MG Road, Bangalore"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/availability" -Method Put -Body $availabilityData -Headers $headers -ContentType "application/json"
        Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
        Write-Host "Driver is now: ONLINE 🟢" -ForegroundColor Green
        Write-Host "Location: $($response.data.driver.currentLocation.address)" -ForegroundColor White
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Test Summary                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($global:riderToken) {
    Write-Host "`n✅ Rider Token Available" -ForegroundColor Green
    Write-Host "   Use: `$global:riderToken to access rider endpoints" -ForegroundColor Gray
}

if ($global:driverToken) {
    Write-Host "✅ Driver Token Available" -ForegroundColor Green
    Write-Host "   Use: `$global:driverToken to access driver endpoints" -ForegroundColor Gray
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Request a ride: .\test-ride-flow.ps1" -ForegroundColor White
Write-Host "   2. Complete ride flow: .\test-complete-flow.ps1" -ForegroundColor White
Write-Host "   3. Test payments: .\test-payments.ps1" -ForegroundColor White

Write-Host "`n🎯 All basic tests completed!`n" -ForegroundColor Cyan
