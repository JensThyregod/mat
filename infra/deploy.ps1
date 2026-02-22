<#
.SYNOPSIS
    Build, push, and deploy the Mat Tutor application to Scaleway.

.DESCRIPTION
    This script builds Docker images for the frontend and backend,
    pushes them to the Scaleway Container Registry, and applies
    the Terraform configuration to deploy serverless containers.

.PARAMETER SkipBuild
    Skip the Docker build step (useful when images are already built).

.PARAMETER SkipTerraform
    Skip the Terraform apply step (useful when only rebuilding images).

.PARAMETER ImageTag
    Docker image tag to use. Defaults to 'latest'.
#>
param(
    [switch]$SkipBuild,
    [switch]$SkipTerraform,
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Load terraform variables to get registry endpoint and credentials
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path "terraform.tfvars")) {
        Write-Error "terraform.tfvars not found. Copy terraform.tfvars.example and fill in your values."
        exit 1
    }

    # Initialize Terraform if needed
    if (-not (Test-Path ".terraform")) {
        Write-Host "Initializing Terraform..." -ForegroundColor Cyan
        terraform init
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    # Get the registry endpoint from Terraform state (or plan)
    $RegistryEndpoint = terraform output -raw registry_endpoint 2>$null
    if (-not $RegistryEndpoint) {
        Write-Host "Registry not yet created. Running Terraform to create registry first..." -ForegroundColor Yellow
        terraform apply -target=scaleway_registry_namespace.main -auto-approve
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        $RegistryEndpoint = terraform output -raw registry_endpoint
    }

    Write-Host "Registry endpoint: $RegistryEndpoint" -ForegroundColor Green

    if (-not $SkipBuild) {
        Write-Host "`n=== Building Docker images ===" -ForegroundColor Cyan

        # Get the backend URL for the frontend build arg
        $BackendUrl = terraform output -raw backend_url 2>$null
        if ($BackendUrl) {
            $BackendUrl = "https://$BackendUrl"
        } else {
            Write-Host "Backend URL not yet available. Frontend will be built without API URL (will need redeploy)." -ForegroundColor Yellow
            $BackendUrl = ""
        }

        # Build backend
        Write-Host "`nBuilding backend image..." -ForegroundColor Yellow
        docker build -t "${RegistryEndpoint}/mat-backend:${ImageTag}" -f "$RepoRoot/backend/Dockerfile" $RepoRoot
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        # Build frontend
        Write-Host "`nBuilding frontend image..." -ForegroundColor Yellow
        docker build -t "${RegistryEndpoint}/mat-frontend:${ImageTag}" `
            --build-arg "VITE_API_BASE_URL=$BackendUrl" `
            -f "$RepoRoot/frontend/Dockerfile" $RepoRoot
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        # Login to Scaleway Container Registry
        Write-Host "`nLogging in to Scaleway Container Registry..." -ForegroundColor Yellow
        $ScwSecretKey = (Select-String -Path "terraform.tfvars" -Pattern 'scw_secret_key\s*=\s*"([^"]*)"').Matches.Groups[1].Value
        docker login $RegistryEndpoint -u nologin --password-stdin <<< $ScwSecretKey
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Docker login failed. Try: scw login && docker login $RegistryEndpoint" -ForegroundColor Red
            exit $LASTEXITCODE
        }

        # Push images
        Write-Host "`nPushing backend image..." -ForegroundColor Yellow
        docker push "${RegistryEndpoint}/mat-backend:${ImageTag}"
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        Write-Host "`nPushing frontend image..." -ForegroundColor Yellow
        docker push "${RegistryEndpoint}/mat-frontend:${ImageTag}"
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        Write-Host "`nImages pushed successfully!" -ForegroundColor Green
    }

    if (-not $SkipTerraform) {
        Write-Host "`n=== Applying Terraform ===" -ForegroundColor Cyan
        terraform apply -var "backend_image_tag=$ImageTag" -var "frontend_image_tag=$ImageTag"
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
        Write-Host "Backend URL:  https://$(terraform output -raw backend_url)"
        Write-Host "Frontend URL: https://$(terraform output -raw frontend_url)"
    }
}
finally {
    Pop-Location
}
