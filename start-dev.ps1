# Start development servers for Mat project
# Usage: .\start-dev.ps1

Write-Host "Starting Mat Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Kill existing processes on our ports
Write-Host ""
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow

# Kill process on port 5000 (backend)
$backendPort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "  Stopping existing backend on port 5000..." -ForegroundColor Gray
    $backendPort | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 500
}

# Kill process on port 5173 (frontend)
$frontendPort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "  Stopping existing frontend on port 5173..." -ForegroundColor Gray
    $frontendPort | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 500
}

Write-Host "  Ports cleared!" -ForegroundColor Green
Write-Host ""

# Get paths
$backendPath = "$PSScriptRoot\backend\MatBackend.Api"
$frontendPath = "$PSScriptRoot\frontend"

# Check if Windows Terminal is available
$wtExists = Get-Command wt -ErrorAction SilentlyContinue

if ($wtExists) {
    Write-Host "Starting in Windows Terminal with tabs..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Tab 1: Backend  (http://localhost:5000)" -ForegroundColor Cyan
    Write-Host "  Tab 2: Frontend (http://localhost:5173)" -ForegroundColor Cyan
    Write-Host ""
    
    # Launch backend tab first, then add frontend tab
    # Using cmd.exe to avoid issues with npm being a .cmd file on Windows
    wt -w 0 nt --title "Backend" -d "$backendPath" cmd /k "dotnet run"
    Start-Sleep -Milliseconds 500
    wt -w 0 nt --title "Frontend" -d "$frontendPath" cmd /k "npm run dev"
} else {
    # Fallback to separate windows if Windows Terminal not available
    Write-Host "Windows Terminal not found, using separate windows..." -ForegroundColor Yellow
    Write-Host ""
    
    Start-Process cmd -ArgumentList "/k", "cd /d `"$backendPath`" && dotnet run"
    Start-Sleep -Seconds 1
    Start-Process cmd -ArgumentList "/k", "cd /d `"$frontendPath`" && npm run dev"
    
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Development servers starting!" -ForegroundColor Green
