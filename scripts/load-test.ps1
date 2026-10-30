#Requires -Version 5.1
<#
.SYNOPSIS
    ParkSmart load test script for HPA scaling demonstration.
.DESCRIPTION
    Sends HTTP requests to the ParkSmart API to simulate load and trigger HPA scaling.
    Records response times, success/failure counts, and calculates statistics.
    
    Safe defaults: 100 requests, 5 concurrent, 300s max.
    
    Lab procedure:
    1. Deploy to EKS or run locally with Docker Compose
    2. Open a second terminal: watch kubectl get hpa -n parksmart
    3. Run this script
    4. Observe HPA scaling in CloudWatch or kubectl output
    
.PARAMETER TargetUrl
    Base URL of the ParkSmart API (default: http://localhost:5000)
.PARAMETER Requests
    Total number of requests to send (default: 100)
.PARAMETER Concurrency
    Number of concurrent requests (default: 5)
.PARAMETER MaxSeconds
    Maximum test duration in seconds (default: 300)
.EXAMPLE
    .\scripts\load-test.ps1
    .\scripts\load-test.ps1 -TargetUrl http://your-lb-url -Requests 500 -Concurrency 10
#>

param(
    [string]$TargetUrl = "http://localhost:5000",
    [int]$Requests = 100,
    [int]$Concurrency = 5,
    [int]$MaxSeconds = 300,
    [string]$OutputFile = "load-test-results.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Write-Host "================================================" -ForegroundColor Blue
Write-Host "  ParkSmart — Load Test" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host "Target:      $TargetUrl"
Write-Host "Requests:    $Requests"
Write-Host "Concurrency: $Concurrency"
Write-Host "Max Time:    ${MaxSeconds}s"
Write-Host ""

$Endpoints = @(
    "/api/health",
    "/api/spaces",
    "/api/analytics/overview",
    "/api/reservations",
    "/api/vehicles/active"
)

$Results = [System.Collections.Concurrent.ConcurrentBag[object]]::new()
$StartTime = Get-Date
$Deadline = $StartTime.AddSeconds($MaxSeconds)

$RequestCount = 0
$Completed = 0

Write-Host "Starting load test..." -ForegroundColor Cyan

$Jobs = @()
$BatchSize = [Math]::Ceiling($Requests / $Concurrency)

for ($w = 0; $w -lt $Concurrency; $w++) {
    $WorkerRequests = [Math]::Min($BatchSize, $Requests - $w * $BatchSize)
    if ($WorkerRequests -le 0) { break }
    
    $Jobs += Start-Job -ScriptBlock {
        param($BaseUrl, $Eps, $Count, $Deadline)
        $local_results = @()
        $rng = [System.Random]::new()
        for ($i = 0; $i -lt $Count; $i++) {
            if ((Get-Date) -gt $Deadline) { break }
            $endpoint = $Eps[$rng.Next($Eps.Count)]
            $url = "$BaseUrl$endpoint"
            $start = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                $resp = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
                $start.Stop()
                $local_results += @{
                    url = $url
                    status = $resp.StatusCode
                    latency_ms = $start.ElapsedMilliseconds
                    success = $true
                }
            } catch {
                $start.Stop()
                $statusCode = 0
                if ($_.Exception.Response) {
                    $statusCode = [int]$_.Exception.Response.StatusCode
                }
                $local_results += @{
                    url = $url
                    status = $statusCode
                    latency_ms = $start.ElapsedMilliseconds
                    success = $false
                    error = $_.Exception.Message
                }
            }
        }
        return $local_results
    } -ArgumentList $TargetUrl, $Endpoints, $WorkerRequests, $Deadline
}

Write-Host "Waiting for $($Jobs.Count) workers to complete..." -ForegroundColor Yellow

$AllResults = @()
foreach ($job in $Jobs) {
    $jobResults = Receive-Job -Job $job -Wait -AutoRemoveJob
    if ($jobResults) {
        $AllResults += $jobResults
    }
}

$EndTime = Get-Date
$TotalDuration = ($EndTime - $StartTime).TotalSeconds

# Calculate statistics
$Successful = $AllResults | Where-Object { $_.success -eq $true }
$Failed = $AllResults | Where-Object { $_.success -ne $true }
$Latencies = $AllResults | ForEach-Object { $_.latency_ms } | Sort-Object

$SuccessCount = ($Successful | Measure-Object).Count
$FailCount = ($Failed | Measure-Object).Count
$TotalCount = $AllResults.Count

$AvgLatency = 0
$P95Latency = 0
$MinLatency = 0
$MaxLatency = 0

if ($Latencies.Count -gt 0) {
    $AvgLatency = [Math]::Round(($Latencies | Measure-Object -Average).Average, 2)
    $P95Index = [Math]::Floor($Latencies.Count * 0.95)
    $P95Latency = $Latencies[[Math]::Min($P95Index, $Latencies.Count - 1)]
    $MinLatency = $Latencies[0]
    $MaxLatency = $Latencies[$Latencies.Count - 1]
}

$RPS = if ($TotalDuration -gt 0) { [Math]::Round($TotalCount / $TotalDuration, 2) } else { 0 }
$SuccessRate = if ($TotalCount -gt 0) { [Math]::Round($SuccessCount / $TotalCount * 100, 1) } else { 0 }

# Display results
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  Load Test Results" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Duration:     $([Math]::Round($TotalDuration, 2))s"
Write-Host "Total Req:    $TotalCount"
Write-Host "Successful:   $SuccessCount ($SuccessRate%)"
Write-Host "Failed:       $FailCount"
Write-Host "Req/sec:      $RPS"
Write-Host ""
Write-Host "Latency (ms):"
Write-Host "  Min:        $MinLatency"
Write-Host "  Average:    $AvgLatency"
Write-Host "  P95:        $P95Latency"
Write-Host "  Max:        $MaxLatency"

# Save results
$Summary = @{
    test_run = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    target_url = $TargetUrl
    config = @{
        total_requests = $Requests
        concurrency = $Concurrency
        max_seconds = $MaxSeconds
    }
    results = @{
        duration_seconds = [Math]::Round($TotalDuration, 2)
        total_requests = $TotalCount
        successful = $SuccessCount
        failed = $FailCount
        success_rate_percent = $SuccessRate
        requests_per_second = $RPS
        latency_ms = @{
            min = $MinLatency
            average = $AvgLatency
            p95 = $P95Latency
            max = $MaxLatency
        }
    }
    note = "Results generated from ParkSmart load test. Do not fabricate or modify results."
}

$Summary | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host "`nResults saved to: $OutputFile" -ForegroundColor Cyan

Write-Host "`nNext steps for HPA observation:" -ForegroundColor Yellow
Write-Host "  kubectl get hpa -n parksmart"
Write-Host "  kubectl describe hpa parksmart-backend-hpa -n parksmart"
Write-Host "  kubectl get pods -n parksmart"
