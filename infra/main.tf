terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.46"
    }
  }

  backend "s3" {
    bucket                      = "mat-terraform-state"
    key                         = "production/terraform.tfstate"
    region                      = "fr-par"
    endpoint                    = "https://s3.fr-par.scw.cloud"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}

provider "scaleway" {
  access_key = var.scw_access_key
  secret_key = var.scw_secret_key
  project_id = var.scw_project_id
  region     = var.scw_region
  zone       = var.scw_zone
}

# ---------------------------------------------------------------------------
# Container Registry — stores Docker images for both frontend and backend
# ---------------------------------------------------------------------------
resource "scaleway_registry_namespace" "main" {
  name        = "${var.app_name}-registry"
  description = "Container registry for ${var.app_name}"
  is_public   = false
}

# ---------------------------------------------------------------------------
# Serverless Containers — namespace
# ---------------------------------------------------------------------------
resource "scaleway_container_namespace" "main" {
  name        = "${var.app_name}-containers"
  description = "Serverless container namespace for ${var.app_name}"
}

# ---------------------------------------------------------------------------
# Backend — Serverless Container
# ---------------------------------------------------------------------------
resource "scaleway_container" "backend" {
  name         = "${var.app_name}-backend"
  namespace_id = scaleway_container_namespace.main.id
  description  = "Mat Tutor backend API (.NET 9)"

  registry_image = "${scaleway_registry_namespace.main.endpoint}/${var.app_name}-backend:${var.backend_image_tag}"
  port           = 8080
  cpu_limit      = var.backend_cpu_limit
  memory_limit   = var.backend_memory_limit
  min_scale      = var.backend_min_scale
  max_scale      = var.backend_max_scale
  privacy        = "public"
  protocol       = "http1"
  deploy         = true

  environment_variables = {
    "ASPNETCORE_ENVIRONMENT"          = "Production"
    "DataSettings__DataRoot"          = "/app/data"
    "DataSettings__TasksRoot"         = "/app/tasks"
    "DataSettings__TaskTypesRoot"     = "/app/curriculum/task-types"
    "DataSettings__CurriculumPath"    = "/app/curriculum/fp9-curriculum.yaml"
    "OpenAI__ModelId"                 = "gpt-4"
    "Gemini__ModelId"                 = "gemini-3-pro-image-preview"
    "Gemini__ImageGenerationEnabled"  = "false"
    "Generation__FastMode"            = "true"
  }

  secret_environment_variables = {
    "OpenAI__ApiKey" = var.openai_api_key
    "Gemini__ApiKey" = var.gemini_api_key
  }

  timeout = 600
}

# ---------------------------------------------------------------------------
# Frontend — Serverless Container (nginx serving the SPA)
# ---------------------------------------------------------------------------
resource "scaleway_container" "frontend" {
  name         = "${var.app_name}-frontend"
  namespace_id = scaleway_container_namespace.main.id
  description  = "Mat Tutor frontend (React SPA served by nginx)"

  registry_image = "${scaleway_registry_namespace.main.endpoint}/${var.app_name}-frontend:${var.frontend_image_tag}"
  port           = 80
  cpu_limit      = var.frontend_cpu_limit
  memory_limit   = var.frontend_memory_limit
  min_scale      = var.frontend_min_scale
  max_scale      = var.frontend_max_scale
  privacy        = "public"
  protocol       = "http1"
  deploy         = true

  timeout = 300
}

# ---------------------------------------------------------------------------
# Custom domains — attach domain names to the serverless containers
# DNS is managed externally via Cloudflare (CNAME records pointing here).
# Prerequisite: nameservers at DanDomain must point to Cloudflare.
# ---------------------------------------------------------------------------
resource "scaleway_container_domain" "frontend" {
  container_id = scaleway_container.frontend.id
  hostname     = var.domain_name
}

resource "scaleway_container_domain" "frontend_www" {
  container_id = scaleway_container.frontend.id
  hostname     = "www.${var.domain_name}"
}

resource "scaleway_container_domain" "backend" {
  container_id = scaleway_container.backend.id
  hostname     = "${var.api_subdomain}.${var.domain_name}"
}
