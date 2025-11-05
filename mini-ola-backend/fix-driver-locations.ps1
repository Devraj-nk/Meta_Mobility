# Fix Driver Locations Script
# This script helps diagnose and fix driver location issues

Write-Host "🔧 Driver Location Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"

# Step 1: Check available drivers
Write-Host "📍 Step 1: Checking all drivers..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/drivers/debug/available" -Method GET
    
    $data = $response.data
    Write-Host "Total Drivers: $($data.totalDrivers)" -ForegroundColor White
    Write-Host "Available Drivers: $($data.availableDrivers)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Driver Details:" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    
    foreach ($driver in $data.drivers) {
        Write-Host ""
        Write-Host "👤 Driver: $($driver.name)" -ForegroundColor White
        Write-Host "   Email: $($driver.email)"
        Write-Host "   Phone: $($driver.phone)"
        Write-Host "   Available: $($driver.isAvailable)" -ForegroundColor $(if ($driver.isAvailable) { "Green" } else { "Red" })
        Write-Host "   KYC Status: $($driver.kycStatus)" -ForegroundColor $(if ($driver.kycStatus -eq "approved") { "Green" } else { "Yellow" })
        Write-Host "   Current Ride: $($driver.currentRide)"
        Write-Host "   Vehicle: $($driver.vehicleType) - $($driver.vehicleNumber)"
        
        $coords = $driver.location.coordinates
        if ($coords -and $coords.Count -eq 2) {
            $lat = [math]::Round($coords[1], 6)
            $lng = [math]::Round($coords[0], 6)
            
            if ($lat -eq 0 -and $lng -eq 0) {
                Write-Host "   Location: ⚠️  NOT SET (0, 0) - PROBLEM!" -ForegroundColor Red
            } else {
                Write-Host "   Location: ✅ Lat: $lat, Lng: $lng" -ForegroundColor Green
                Write-Host "   Address: $($driver.location.address)"
            }
        } else {
            Write-Host "   Location: ❌ NOT SET - PROBLEM!" -ForegroundColor Red
        }
        
        Write-Host "   Can Accept Rides: $($driver.canAcceptRides)" -ForegroundColor $(if ($driver.canAcceptRides) { "Green" } else { "Red" })
    }
    
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Analyze issues
    $driversWithIssues = $data.drivers | Where-Object { -not $_.canAcceptRides }
    
    if ($driversWithIssues.Count -gt 0) {
        Write-Host "🚨 ISSUES FOUND:" -ForegroundColor Red
        Write-Host ""
        
        foreach ($driver in $driversWithIssues) {
            Write-Host "❌ $($driver.name):" -ForegroundColor Yellow
            
            if ($driver.kycStatus -ne "approved") {
                Write-Host "   - KYC not approved (Status: $($driver.kycStatus))"
            }
            if (-not $driver.isAvailable) {
                Write-Host "   - Driver is OFFLINE"
            }
            if ($driver.currentRide -ne "No active ride") {
                Write-Host "   - Has active ride: $($driver.currentRideId)"
                Write-Host "     Run: .\clear-driver-ride.ps1 -driverId $($driver._id)"
            }
            
            $coords = $driver.location.coordinates
            if (-not $coords -or $coords.Count -ne 2 -or ($coords[0] -eq 0 -and $coords[1] -eq 0)) {
                Write-Host "   - Location NOT SET - Driver needs to:" -ForegroundColor Red
                Write-Host "     1. Enable browser location permissions"
                Write-Host "     2. Go to Driver Dashboard"
                Write-Host "     3. Toggle ONLINE (this will capture their location)"
            }
            Write-Host ""
        }
    } else {
        Write-Host "✅ All drivers can accept rides!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "💡 SOLUTIONS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If drivers can't receive ride requests:" -ForegroundColor White
    Write-Host "1. Make sure drivers are ONLINE (toggle availability)" 
    Write-Host "2. Ensure location permissions are enabled in browser"
    Write-Host "3. When going online, the driver's browser will ask for location"
    Write-Host "4. The location should show actual coordinates (not 0, 0)"
    Write-Host "5. Both driver and rider should be within 5km of each other"
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend server is running on http://localhost:5000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
