# Mini Ola API Quick Test
# Simple PowerShell script to test APIs

$baseUrl = "http://localhost:5000"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Mini Ola Backend API Testing" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Register Rider
Write-Host "Test 2: Register Rider" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
$riderData = @{
    name = "Chethan Test"
    email = "chethan@test.com"
    phone = "9876543210"
    password = "test123"
    role = "rider"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $riderData -ContentType "application/json"
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "User: $($response.data.user.name)" -ForegroundColor White
    Write-Host "Email: $($response.data.user.email)" -ForegroundColor White
    $global:riderToken = $response.data.token
    Write-Host "Token saved!" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Note: User might already exist" -ForegroundColor Yellow
    Write-Host ""
}

# Test 3: Login Rider
Write-Host "Test 3: Login Rider" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
$loginData = @{
    email = "chethan@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Logged in as: $($response.data.user.name)" -ForegroundColor White
    $global:riderToken = $response.data.token
    Write-Host "Token: $($global:riderToken.Substring(0,30))..." -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Register Driver
Write-Host "Test 4: Register Driver" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
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
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Driver: $($response.data.user.name)" -ForegroundColor White
    $global:driverToken = $response.data.token
    Write-Host "Token saved!" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Note: Driver might already exist" -ForegroundColor Yellow
    Write-Host ""
}

# Test 5: Login Driver
Write-Host "Test 5: Login Driver" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
$loginData = @{
    email = "driver@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "Logged in as: $($response.data.user.name)" -ForegroundColor White
    $global:driverToken = $response.data.token
    Write-Host "Token: $($global:driverToken.Substring(0,30))..." -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 6: Get Fare Estimate
if ($global:riderToken) {
    Write-Host "Test 6: Get Fare Estimate" -ForegroundColor Yellow
    Write-Host "--------------------------------------" -ForegroundColor Gray
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
        Write-Host "SUCCESS" -ForegroundColor Green
        Write-Host "Distance: $($response.data.breakdown.distance)" -ForegroundColor White
        Write-Host "Estimated Time: $($response.data.breakdown.estimatedTime)" -ForegroundColor White
        Write-Host "Estimated Fare: Rs.$($response.data.estimatedFare)" -ForegroundColor Cyan
        Write-Host ""
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

# Test 7: Driver Go Online
if ($global:driverToken) {
    Write-Host "Test 7: Driver - Go Online" -ForegroundColor Yellow
    Write-Host "--------------------------------------" -ForegroundColor Gray
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
        Write-Host "SUCCESS" -ForegroundColor Green
        Write-Host "Driver is now: ONLINE" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($global:riderToken) {
    Write-Host "Rider Token Available" -ForegroundColor Green
    Write-Host "Use: `$global:riderToken" -ForegroundColor Gray
    Write-Host ""
}

if ($global:driverToken) {
    Write-Host "Driver Token Available" -ForegroundColor Green
    Write-Host "Use: `$global:driverToken" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Next: Run .\test-ride-flow.ps1 to test complete ride flow" -ForegroundColor Yellow
Write-Host ""
