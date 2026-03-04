terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.46"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
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

provider "cloudflare" {
  api_token = var.cloudflare_api_token
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
    "Auth__FrontendUrl"               = "https://${var.domain_name}"
    "ScalewayTem__Region"             = var.scw_region
    "ScalewayTem__SenderEmail"        = "noreply@${var.domain_name}"
    "ScalewayTem__SenderName"         = "Matematik Tutor"
    "SCW_DEFAULT_PROJECT_ID"          = var.scw_project_id
    "StudentStorage__Provider"        = "S3"
    "StudentStorage__S3__BucketName"  = scaleway_object_bucket.student_data.name
    "StudentStorage__S3__Region"      = var.scw_region
    "StudentStorage__S3__ServiceUrl"  = "https://s3.${var.scw_region}.scw.cloud"
  }

  secret_environment_variables = {
    "OpenAI__ApiKey"              = var.openai_api_key
    "Gemini__ApiKey"              = var.gemini_api_key
    "ScalewayTem__SecretKey"      = var.scw_secret_key
    "StudentStorage__S3__AccessKey" = var.scw_access_key
    "StudentStorage__S3__SecretKey" = var.scw_secret_key
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

# ---------------------------------------------------------------------------
# Object Storage — student data bucket (S3-compatible)
# ---------------------------------------------------------------------------
resource "scaleway_object_bucket" "student_data" {
  name   = "${var.app_name}-student-data"
  region = var.scw_region
}

# ---------------------------------------------------------------------------
# Transactional Email (TEM) — domain registration for sending verification emails
# ---------------------------------------------------------------------------
resource "scaleway_tem_domain" "main" {
  name       = var.domain_name
  accept_tos = true
}

# Scaleway requires this TXT record to prove domain ownership before TEM activation
resource "cloudflare_record" "tem_domain_verification" {
  zone_id = var.cloudflare_zone_id
  name    = "_scaleway-challenge"
  type    = "TXT"
  content = var.scw_tem_domain_verification_token
  ttl     = 3600
}

# ---------------------------------------------------------------------------
# Cloudflare DNS records for email authentication (SPF, DKIM, MX, DMARC)
# These ensure verification emails from noreply@mattutor.dk are delivered.
# ---------------------------------------------------------------------------
resource "cloudflare_record" "tem_spf" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  type    = "TXT"
  content = "v=spf1 ${scaleway_tem_domain.main.spf_config} -all"
  ttl     = 3600
}

resource "cloudflare_record" "tem_dkim" {
  zone_id = var.cloudflare_zone_id
  name    = "${scaleway_tem_domain.main.project_id}._domainkey.${var.domain_name}"
  type    = "TXT"
  content = scaleway_tem_domain.main.dkim_config
  ttl     = 3600
}

resource "cloudflare_record" "tem_mx" {
  zone_id  = var.cloudflare_zone_id
  name     = var.domain_name
  type     = "MX"
  content  = "."
  priority = 0
  ttl      = 3600
}

resource "cloudflare_record" "tem_dmarc" {
  zone_id = var.cloudflare_zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  content = "v=DMARC1; p=none;"
  ttl     = 3600
}

# ---------------------------------------------------------------------------
# Cloudflare Firewall — restrict access to allowed IPs during development
# Enable by setting restrict_access = true and providing allowed_ips.
# Uses the legacy Firewall Rules API (works with Zone > Firewall Services).
# ---------------------------------------------------------------------------
locals {
  ip_list = join(" ", var.allowed_ips)
}

resource "cloudflare_filter" "ip_restrict" {
  count = var.restrict_access ? 1 : 0

  zone_id     = var.cloudflare_zone_id
  description = "Match requests NOT from allowed developer IPs"
  expression  = "(not ip.src in {${local.ip_list}})"
}

resource "cloudflare_firewall_rule" "ip_restrict" {
  count = var.restrict_access ? 1 : 0

  zone_id     = var.cloudflare_zone_id
  description = "Block all traffic except allowed developer IPs"
  filter_id   = cloudflare_filter.ip_restrict[0].id
  action      = "block"
  priority    = 1
}
