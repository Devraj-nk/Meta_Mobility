# Test Payment Flow Script
# This script tests that payment status is properly updated after payment

Write-Host "🧪 Testing Payment Flow" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"

# You'll need to replace these with actual values
$riderEmail = "rider@example.com"  # Replace with your rider email
$riderPassword = "password123"      # Replace with your password
$rideId = ""                        # Will get from completed rides

Write-Host "📝 Step 1: Login as rider..." -ForegroundColor Yellow

$loginBody = @{
    email = $riderEmail
    password = $riderPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Step 2: Get ride history
    Write-Host "📋 Step 2: Getting ride history..." -ForegroundColor Yellow
    
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/rides/history" -Method GET -Headers $headers
    $rides = $historyResponse.data.rides
    
    Write-Host "Found $($rides.Count) rides in history" -ForegroundColor White
    Write-Host ""
    
    # Find completed rides without payment
    $unpaidRides = $rides | Where-Object { $_.status -eq 'completed' -and $_.paymentStatus -ne 'completed' }
    
    if ($unpaidRides.Count -eq 0) {
        Write-Host "⚠️  No unpaid completed rides found!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "All rides are either:" -ForegroundColor White
        Write-Host "  • Not completed yet"
        Write-Host "  • Already paid"
        Write-Host ""
        
        # Show all rides
        Write-Host "All rides:" -ForegroundColor Cyan
        foreach ($ride in $rides) {
            Write-Host "  • Ride $($ride._id.Substring(0,8))... - Status: $($ride.status) - Payment: $($ride.paymentStatus)" -ForegroundColor White
        }
        
        exit
    }
    
    Write-Host "💰 Found $($unpaidRides.Count) unpaid ride(s)!" -ForegroundColor Green
    Write-Host ""
    
    # Test payment on first unpaid ride
    $testRide = $unpaidRides[0]
    $rideId = $testRide._id
    
    Write-Host "🎯 Testing payment for ride: $($rideId.Substring(0,8))..." -ForegroundColor Cyan
    Write-Host "   Status: $($testRide.status)"
    Write-Host "   Payment Status (Before): $($testRide.paymentStatus)"
    Write-Host "   Amount: ₹$($testRide.fare.finalFare)"
    Write-Host ""
    
    # Step 3: Process payment
    Write-Host "💳 Step 3: Processing payment..." -ForegroundColor Yellow
    
    $paymentBody = @{
        rideId = $rideId
    } | ConvertTo-Json
    
    $paymentResponse = Invoke-RestMethod -Uri "$baseUrl/payments/process" -Method POST -Headers $headers -Body $paymentBody
    
    Write-Host "✅ Payment processed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Step 4: Verify ride history updated
    Write-Host "🔍 Step 4: Verifying payment status updated..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 1
    
    $historyResponse2 = Invoke-RestMethod -Uri "$baseUrl/rides/history" -Method GET -Headers $headers
    $updatedRide = $historyResponse2.data.rides | Where-Object { $_._id -eq $rideId }
    
    if ($updatedRide.paymentStatus -eq 'completed') {
        Write-Host "✅ SUCCESS! Payment status is now: $($updatedRide.paymentStatus)" -ForegroundColor Green
        Write-Host ""
        Write-Host "=================================" -ForegroundColor Cyan
        Write-Host "✅ PAYMENT FLOW TEST PASSED!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Results:" -ForegroundColor White
        Write-Host "  • Payment was processed"
        Write-Host "  • Payment status updated to 'completed'"
        Write-Host "  • 'Pay Now' button should no longer appear"
        Write-Host "  • '✅ Payment Completed' should be shown instead"
        Write-Host ""
    } else {
        Write-Host "❌ FAILED! Payment status is still: $($updatedRide.paymentStatus)" -ForegroundColor Red
        Write-Host ""
        Write-Host "This indicates the payment status was not properly updated." -ForegroundColor Yellow
    }
    
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
    Write-Host "  • Update riderEmail and riderPassword at top of script"
    Write-Host "  • Make sure you have at least one completed ride"
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
