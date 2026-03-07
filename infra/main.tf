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
    # zitadel = {
    #   source  = "zitadel/zitadel"
    #   version = "~> 2.0"
    # }
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

#provider "zitadel" {
#  domain       = var.zitadel_hostname
#  port         = "443"
#  insecure     = "false"
#  access_token = var.zitadel_admin_token
#}


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
    "Zitadel__Authority"              = "https://${var.zitadel_hostname}"
    "Zitadel__ProjectResourceId"      = var.zitadel_project_resource_id
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

# ===========================================================================
# Zitadel Identity Provider — Serverless Container + Managed PostgreSQL
# ===========================================================================

# ---------------------------------------------------------------------------
# Managed PostgreSQL — dedicated database for Zitadel
# ---------------------------------------------------------------------------
resource "scaleway_rdb_instance" "zitadel" {
  name           = "${var.app_name}-zitadel-db"
  node_type      = var.zitadel_db_node_type
  engine         = "PostgreSQL-16"
  is_ha_cluster  = false
  disable_backup = false
  backup_schedule_frequency = 24
  backup_schedule_retention = 7
  volume_type    = "lssd"
}

resource "scaleway_rdb_database" "zitadel" {
  instance_id = scaleway_rdb_instance.zitadel.id
  name        = "zitadel"
}

resource "scaleway_rdb_user" "zitadel" {
  instance_id = scaleway_rdb_instance.zitadel.id
  name        = "zitadel_app"
  password    = var.zitadel_db_password
  is_admin    = false
}

resource "scaleway_rdb_privilege" "zitadel" {
  instance_id   = scaleway_rdb_instance.zitadel.id
  user_name     = scaleway_rdb_user.zitadel.name
  database_name = scaleway_rdb_database.zitadel.name
  permission    = "all"
}

# ---------------------------------------------------------------------------
# Zitadel — Serverless Container
# ---------------------------------------------------------------------------
resource "scaleway_container" "zitadel" {
  name         = "${var.app_name}-zitadel"
  namespace_id = scaleway_container_namespace.main.id
  description  = "Zitadel identity provider"

  registry_image = "ghcr.io/zitadel/zitadel:${var.zitadel_image_tag}"
  port           = 8080
  cpu_limit      = var.zitadel_cpu_limit
  memory_limit   = var.zitadel_memory_limit
  min_scale      = 1
  max_scale      = 1
  privacy        = "public"
  protocol       = "http1"
  deploy         = true

  environment_variables = {
    "ZITADEL_EXTERNALDOMAIN"                               = var.zitadel_hostname
    "ZITADEL_EXTERNALPORT"                                 = "443"
    "ZITADEL_EXTERNALSECURE"                               = "true"
    "ZITADEL_TLS_ENABLED"                                  = "false"
    "ZITADEL_DATABASE_POSTGRES_HOST"                       = scaleway_rdb_instance.zitadel.endpoint_ip
    "ZITADEL_DATABASE_POSTGRES_PORT"                       = tostring(scaleway_rdb_instance.zitadel.endpoint_port)
    "ZITADEL_DATABASE_POSTGRES_DATABASE"                   = scaleway_rdb_database.zitadel.name
    "ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME"             = "zitadel_app"
    "ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE"             = "require"
    "ZITADEL_DATABASE_POSTGRES_USER_USERNAME"              = "zitadel_app"
    "ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE"              = "require"
    "ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORDCHANGEREQUIRED" = "true"
  }

  secret_environment_variables = {
    "ZITADEL_MASTERKEY"                            = var.zitadel_masterkey
    "ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD"     = var.zitadel_db_password
    "ZITADEL_DATABASE_POSTGRES_USER_PASSWORD"      = var.zitadel_db_password
  }

  timeout = 600
}

# ---------------------------------------------------------------------------
# Custom domain for Zitadel
# ---------------------------------------------------------------------------
resource "scaleway_container_domain" "zitadel" {
  container_id = scaleway_container.zitadel.id
  hostname     = var.zitadel_hostname
}

# ---------------------------------------------------------------------------
# Cloudflare DNS — auth subdomain pointing to Zitadel container
# ---------------------------------------------------------------------------
resource "cloudflare_record" "zitadel" {
  zone_id = var.cloudflare_zone_id
  name    = "auth"
  type    = "CNAME"
  content = scaleway_container.zitadel.domain_name
  ttl     = 1
  proxied = true
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
