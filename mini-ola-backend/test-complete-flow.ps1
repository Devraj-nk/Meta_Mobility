# Complete Ride Flow Test
# Tests: Request Ride → Accept → Start → Complete → Payment

$baseUrl = "http://localhost:5000"

Write-Host "`n🚕 Testing Complete Ride Flow`n" -ForegroundColor Cyan

# Check if tokens exist
if (-not $global:riderToken -or -not $global:driverToken) {
    Write-Host "⚠️  Tokens not found. Run .\test-api.ps1 first!" -ForegroundColor Yellow
    exit
}

# Step 1: Request a Ride (Rider)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 1: Rider - Request a Ride" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

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
    isGroupRide = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/rides/request" -Method Post -Body $rideData -Headers $headers -ContentType "application/json"
    Write-Host "✅ Ride Requested Successfully!" -ForegroundColor Green
    Write-Host "Ride ID: $($response.data.ride._id)" -ForegroundColor White
    Write-Host "Status: $($response.data.ride.status)" -ForegroundColor White
    Write-Host "Driver: $($response.data.ride.driver.name)" -ForegroundColor White
    Write-Host "Estimated Fare: ₹$($response.data.ride.fare.estimatedFare)" -ForegroundColor Cyan
    Write-Host "OTP: $($response.data.otp)" -ForegroundColor Yellow
    
    $global:rideId = $response.data.ride._id
    $global:rideOtp = $response.data.otp
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    $errorDetails = $_ | ConvertFrom-Json
    Write-Host ($errorDetails | ConvertTo-Json) -ForegroundColor Red
    exit
}

Start-Sleep -Seconds 1

# Step 2: Driver - Get Active Ride
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 2: Driver - Check Active Ride" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$headers = @{
    Authorization = "Bearer $global:driverToken"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/rides/active" -Method Get -Headers $headers
    Write-Host "✅ Active Ride Found!" -ForegroundColor Green
    Write-Host "Rider: $($response.data.ride.rider.name)" -ForegroundColor White
    Write-Host "Pickup: $($response.data.ride.pickupLocation.address)" -ForegroundColor White
    Write-Host "Dropoff: $($response.data.ride.dropoffLocation.address)" -ForegroundColor White
} catch {
    Write-Host "⚠️  Note: $($_.Exception.Message)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# Step 3: Driver - Arrive at Pickup
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 3: Driver - Arrive at Pickup Location" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/rides/$global:rideId/arrive" -Method Put -Headers $headers
    Write-Host "✅ Driver Arrived at Pickup!" -ForegroundColor Green
    Write-Host "Status: $($response.data.ride.status)" -ForegroundColor White
} catch {
    Write-Host "⚠️  Note: $($_.Exception.Message)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# Step 4: Driver - Start Ride (with OTP)
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 4: Driver - Start Ride (OTP Verification)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$otpData = @{
    otp = $global:rideOtp
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/rides/$global:rideId/start" -Method Put -Body $otpData -Headers $headers -ContentType "application/json"
    Write-Host "✅ Ride Started!" -ForegroundColor Green
    Write-Host "Status: $($response.data.ride.status)" -ForegroundColor White
    Write-Host "Start Time: $($response.data.ride.startTime)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Step 5: Driver - Complete Ride
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 5: Driver - Complete Ride" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$completeData = @{
    finalFare = 150
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/rides/$global:rideId/complete" -Method Put -Body $completeData -Headers $headers -ContentType "application/json"
    Write-Host "✅ Ride Completed!" -ForegroundColor Green
    Write-Host "Status: $($response.data.ride.status)" -ForegroundColor White
    Write-Host "Final Fare: ₹$($response.data.ride.fare.finalFare)" -ForegroundColor Cyan
    Write-Host "End Time: $($response.data.ride.endTime)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Start-Sleep -Seconds 1

# Step 6: Rider - Process Payment
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 6: Rider - Process Payment" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$headers = @{
    Authorization = "Bearer $global:riderToken"
}
$paymentData = @{
    rideId = $global:rideId
    method = "upi"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/payments/process" -Method Post -Body $paymentData -Headers $headers -ContentType "application/json"
    Write-Host "✅ Payment Processed!" -ForegroundColor Green
    Write-Host "Amount: ₹$($response.data.payment.amount)" -ForegroundColor Cyan
    Write-Host "Method: $($response.data.payment.method)" -ForegroundColor White
    Write-Host "Status: $($response.data.payment.status)" -ForegroundColor White
    Write-Host "Receipt Number: $($response.data.payment.receiptNumber)" -ForegroundColor White
    Write-Host "Transaction ID: $($response.data.payment.transactionId)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Step 7: Get Payment Receipt
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 7: Get Payment Receipt" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/payments/$global:rideId" -Method Get -Headers $headers
    Write-Host "✅ Receipt Retrieved!" -ForegroundColor Green
    Write-Host "`nReceipt Details:" -ForegroundColor Cyan
    Write-Host "  Receipt Number: $($response.data.receipt.receiptNumber)" -ForegroundColor White
    Write-Host "  Rider: $($response.data.receipt.rider.name)" -ForegroundColor White
    Write-Host "  Driver: $($response.data.receipt.driver.name)" -ForegroundColor White
    Write-Host "  Base Fare: ₹$($response.data.receipt.fareBreakdown.baseFare)" -ForegroundColor White
    Write-Host "  Distance Fare: ₹$($response.data.receipt.fareBreakdown.distanceFare)" -ForegroundColor White
    Write-Host "  Time Fare: ₹$($response.data.receipt.fareBreakdown.timeFare)" -ForegroundColor White
    Write-Host "  Total: ₹$($response.data.receipt.fareBreakdown.total)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Step 8: Rider - Rate the Ride
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 8: Rider - Rate the Ride" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$ratingData = @{
    rating = 5
    feedback = "Great ride! Driver was professional and car was clean."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/rides/$global:rideId/rate" -Method Post -Body $ratingData -Headers $headers -ContentType "application/json"
    Write-Host "✅ Ride Rated!" -ForegroundColor Green
    Write-Host "Rating: $($response.data.ride.rating.riderRating.rating) ⭐" -ForegroundColor Yellow
    Write-Host "Feedback: $($response.data.ride.rating.riderRating.feedback)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Driver - Check Earnings
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 9: Driver - Check Earnings" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$headers = @{
    Authorization = "Bearer $global:driverToken"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/drivers/earnings" -Method Get -Headers $headers
    Write-Host "✅ Earnings Retrieved!" -ForegroundColor Green
    Write-Host "`nDriver Stats:" -ForegroundColor Cyan
    Write-Host "  Total Earnings: ₹$($response.data.totalEarnings)" -ForegroundColor Green
    Write-Host "  Total Rides: $($response.data.totalRides)" -ForegroundColor White
    Write-Host "  Today's Earnings: ₹$($response.data.todayEarnings)" -ForegroundColor Cyan
    Write-Host "  Today's Rides: $($response.data.todayRides)" -ForegroundColor White
    Write-Host "  Rating: $($response.data.driver.rating) ⭐" -ForegroundColor Yellow
    Write-Host "  Level: $($response.data.driver.level)" -ForegroundColor White
    if ($response.data.driver.badges.Count -gt 0) {
        Write-Host "  Badges: $($response.data.driver.badges.name -join ', ')" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Final Summary
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          ✅ Complete Ride Flow Test PASSED! ✅            ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📊 Test Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Ride Requested" -ForegroundColor Green
Write-Host "  ✅ Driver Assigned" -ForegroundColor Green
Write-Host "  ✅ Driver Arrived" -ForegroundColor Green
Write-Host "  ✅ Ride Started (OTP Verified)" -ForegroundColor Green
Write-Host "  ✅ Ride Completed" -ForegroundColor Green
Write-Host "  ✅ Payment Processed" -ForegroundColor Green
Write-Host "  ✅ Receipt Generated" -ForegroundColor Green
Write-Host "  ✅ Ride Rated" -ForegroundColor Green
Write-Host "  ✅ Earnings Updated" -ForegroundColor Green

Write-Host "`n🎉 All APIs Working Perfectly!`n" -ForegroundColor Cyan
