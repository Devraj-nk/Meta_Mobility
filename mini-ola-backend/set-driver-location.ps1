# Set Driver Location Manually (for testing)
# This script sets a driver's location manually when browser location isn't working

param(
    [Parameter(Mandatory=$true)]
    [string]$driverEmail,
    
    [Parameter(Mandatory=$false)]
    [double]$latitude = 12.9716,  # Default Bangalore coordinates
    
    [Parameter(Mandatory=$false)]
    [double]$longitude = 77.5946
)

Write-Host "🔧 Set Driver Location Manually" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"

# Step 1: Login as driver
Write-Host "📝 Step 1: Logging in as $driverEmail..." -ForegroundColor Yellow

$loginBody = @{
    email = $driverEmail
    password = "password123"  # Default password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    
    # Step 2: Update location
    Write-Host "📍 Step 2: Setting location to Lat: $latitude, Lng: $longitude..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $locationBody = @{
        latitude = $latitude
        longitude = $longitude
        address = "Manual Location (Lat: $($latitude.ToString('0.0000')), Lng: $($longitude.ToString('0.0000')))"
    } | ConvertTo-Json
    
    $locationResponse = Invoke-RestMethod -Uri "$baseUrl/drivers/location" -Method PUT -Headers $headers -Body $locationBody
    
    Write-Host "✅ Location updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 New Location:" -ForegroundColor Cyan
    Write-Host "   Latitude: $latitude"
    Write-Host "   Longitude: $longitude"
    Write-Host ""
    
    # Step 3: Make driver available
    Write-Host "🚗 Step 3: Setting driver as ONLINE..." -ForegroundColor Yellow
    
    $availabilityBody = @{
        isAvailable = $true
        latitude = $latitude
        longitude = $longitude
        address = "Online at manual location"
    } | ConvertTo-Json
    
    $availResponse = Invoke-RestMethod -Uri "$baseUrl/drivers/availability" -Method PUT -Headers $headers -Body $availabilityBody
    
    Write-Host "✅ Driver is now ONLINE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Driver $driverEmail is now:" -ForegroundColor White
    Write-Host "  • ONLINE and ready to accept rides" -ForegroundColor Green
    Write-Host "  • Located at: $latitude, $longitude" -ForegroundColor Green
    Write-Host "  • Will receive requests within 5km" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Make sure backend server is running"
    Write-Host "  • Check if email is correct: $driverEmail"
    Write-Host "  • Default password is 'password123'"
    Write-Host "  • KYC must be approved"
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
