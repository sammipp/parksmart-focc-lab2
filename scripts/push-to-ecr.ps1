#Requires -Version 5.1
<#
.SYNOPSIS
    Build and push ParkSmart Docker images to Amazon ECR.
.DESCRIPTION
    This script builds the frontend and backend Docker images, creates ECR
    repositories if they do not exist, and pushes the images.
    
    Required IAM permissions:
    - ecr:GetAuthorizationToken
    - ecr:CreateRepository
    - ecr:DescribeRepositories
    - ecr:BatchCheckLayerAvailability
    - ecr:InitiateLayerUpload
    - ecr:UploadLayerPart
    - ecr:CompleteLayerUpload
    - ecr:PutImage
    - ecr:BatchGetImage
    
.PARAMETER Region
    AWS region (default: reads from AWS config or us-east-1)
.PARAMETER FrontendRepo
    ECR repository name for frontend (default: parksmart-frontend)
.PARAMETER BackendRepo
    ECR repository name for backend (default: parksmart-backend)
.PARAMETER Tag
    Docker image tag (default: latest)
.EXAMPLE
    .\scripts\push-to-ecr.ps1
    .\scripts\push-to-ecr.ps1 -Region ap-south-1 -Tag v1.0.0
#>

param(
    [string]$Region = "",
    [string]$FrontendRepo = "parksmart-frontend",
    [string]$BackendRepo = "parksmart-backend",
    [string]$Tag = "latest"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Message) Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Fail { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }

Write-Host "================================================" -ForegroundColor Blue
Write-Host "  ParkSmart — Push to Amazon ECR" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

# Check AWS CLI
Write-Step "Checking prerequisites"
try {
    $awsVersion = aws --version 2>&1
    Write-Success "AWS CLI: $awsVersion"
} catch {
    Write-Fail "AWS CLI not found. Install from https://aws.amazon.com/cli/"
    exit 1
}

# Check Docker
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>&1
    Write-Success "Docker: $dockerVersion"
} catch {
    Write-Fail "Docker not found or not running."
    exit 1
}

# Verify AWS identity (no secrets displayed)
Write-Step "Verifying AWS identity"
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $AccountId = $identity.Account
    $UserArn = $identity.Arn
    Write-Success "Account: $AccountId"
    Write-Success "Identity: $UserArn"
} catch {
    Write-Fail "Could not verify AWS identity. Check your credentials."
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Determine region
if ([string]::IsNullOrEmpty($Region)) {
    $Region = aws configure get region 2>$null
    if ([string]::IsNullOrEmpty($Region)) {
        $Region = $env:AWS_DEFAULT_REGION
    }
    if ([string]::IsNullOrEmpty($Region)) {
        $Region = "us-east-1"
        Write-Host "No region configured, defaulting to: $Region" -ForegroundColor Yellow
    }
}
Write-Success "Region: $Region"

$EcrBase = "$AccountId.dkr.ecr.$Region.amazonaws.com"

# Create ECR repositories if needed
Write-Step "Ensuring ECR repositories exist"
foreach ($RepoName in @($FrontendRepo, $BackendRepo)) {
    try {
        aws ecr describe-repositories --repository-names $RepoName --region $Region | Out-Null
        Write-Success "Repository exists: $RepoName"
    } catch {
        Write-Host "Creating repository: $RepoName" -ForegroundColor Yellow
        aws ecr create-repository --repository-name $RepoName --region $Region --image-scanning-configuration scanOnPush=true | Out-Null
        Write-Success "Created: $RepoName"
    }
}

# Authenticate Docker with ECR
Write-Step "Authenticating Docker with ECR"
try {
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrBase
    Write-Success "Docker authenticated with ECR"
} catch {
    Write-Fail "ECR authentication failed."
    exit 1
}

# Get project root (parent of scripts/)
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Build and push frontend
Write-Step "Building frontend image"
$FrontendImage = "$EcrBase/${FrontendRepo}:${Tag}"
docker build -t $FrontendImage "$ProjectRoot\frontend"
Write-Success "Frontend image built: $FrontendImage"

Write-Step "Pushing frontend image"
docker push $FrontendImage
Write-Success "Frontend pushed"

# Build and push backend
Write-Step "Building backend image"
$BackendImage = "$EcrBase/${BackendRepo}:${Tag}"
docker build -t $BackendImage "$ProjectRoot\backend"
Write-Success "Backend image built: $BackendImage"

Write-Step "Pushing backend image"
docker push $BackendImage
Write-Success "Backend pushed"

# Summary
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  Push Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Frontend: $FrontendImage"
Write-Host "Backend:  $BackendImage"
Write-Host ""
Write-Host "Update k8s manifests with these image URIs, then deploy:" -ForegroundColor Cyan
Write-Host "  kubectl apply -f k8s/"
