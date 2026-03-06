variable "scw_access_key" {
  description = "Scaleway access key"
  type        = string
  sensitive   = true
}

variable "scw_secret_key" {
  description = "Scaleway secret key"
  type        = string
  sensitive   = true
}

variable "scw_project_id" {
  description = "Scaleway project ID"
  type        = string
  default     = "9dc503c8-9b60-4767-89c8-912c90571835"
}

variable "scw_region" {
  description = "Scaleway region"
  type        = string
  default     = "fr-par"
}

variable "scw_zone" {
  description = "Scaleway zone"
  type        = string
  default     = "fr-par-1"
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name used as prefix for resources"
  type        = string
  default     = "mat"
}

# Backend configuration
variable "backend_image_tag" {
  description = "Docker image tag for the backend container"
  type        = string
  default     = "latest"
}

variable "backend_cpu_limit" {
  description = "CPU limit for the backend container (in mVCPU, e.g. 1120 = 1.12 vCPU)"
  type        = number
  default     = 1120
}

variable "backend_memory_limit" {
  description = "Memory limit for the backend container (in MB)"
  type        = number
  default     = 2048
}

variable "backend_min_scale" {
  description = "Minimum number of backend container instances"
  type        = number
  default     = 0
}

variable "backend_max_scale" {
  description = "Maximum number of backend container instances"
  type        = number
  default     = 2
}

# Frontend configuration
variable "frontend_image_tag" {
  description = "Docker image tag for the frontend container"
  type        = string
  default     = "latest"
}

variable "frontend_cpu_limit" {
  description = "CPU limit for the frontend container (in mVCPU)"
  type        = number
  default     = 560
}

variable "frontend_memory_limit" {
  description = "Memory limit for the frontend container (in MB)"
  type        = number
  default     = 560
}

variable "frontend_min_scale" {
  description = "Minimum number of frontend container instances"
  type        = number
  default     = 0
}

variable "frontend_max_scale" {
  description = "Maximum number of frontend container instances"
  type        = number
  default     = 2
}

# API keys (passed as env vars to the backend container)
variable "openai_api_key" {
  description = "OpenAI API key for the backend"
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_api_key" {
  description = "Gemini API key for image generation"
  type        = string
  sensitive   = true
  default     = ""
}

# ---------------------------------------------------------------------------
# Cloudflare — used for IP-based access restriction during development
# ---------------------------------------------------------------------------
variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone.Firewall permissions"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
  default     = "662199342d99eb38732a47dff69e9b94"
}

variable "restrict_access" {
  description = "When true, only IPs in allowed_ips can reach the site (dev lockdown)"
  type        = bool
  default     = true
}

variable "allowed_ips" {
  description = "List of IPv4 addresses allowed to access the site when restrict_access is true"
  type        = list(string)
  default     = ["188.177.32.198"]
}

# Domain configuration
variable "domain_name" {
  description = "Root domain name (e.g. mattutor.dk)"
  type        = string
  default     = "mattutor.dk"
}

variable "api_subdomain" {
  description = "Subdomain for the backend API"
  type        = string
  default     = "api"
}

variable "scw_tem_domain_verification_token" {
  description = "Scaleway TEM domain ownership verification token (from the verification email)"
  type        = string
  default     = "61d72919-6f40-44cb-880d-04ebcda792f5"
}

# ---------------------------------------------------------------------------
# Keycloak — identity provider (VM + managed PostgreSQL)
# ---------------------------------------------------------------------------
variable "keycloak_admin_password" {
  description = "Keycloak admin console password"
  type        = string
  sensitive   = true
}

variable "keycloak_db_password" {
  description = "Password for the Keycloak PostgreSQL database user"
  type        = string
  sensitive   = true
}

variable "keycloak_hostname" {
  description = "Public hostname for Keycloak (e.g. auth.mattutor.dk)"
  type        = string
  default     = "auth.mattutor.dk"
}

variable "keycloak_vm_type" {
  description = "Scaleway instance type for the Keycloak VM"
  type        = string
  default     = "DEV1-S"
}

variable "keycloak_db_node_type" {
  description = "Scaleway managed database node type for Keycloak"
  type        = string
  default     = "DB-DEV-S"
}

variable "keycloak_image_tag" {
  description = "Keycloak Docker image tag"
  type        = string
  default     = "26.0"
}

variable "ssh_public_key" {
  description = "SSH public key for VM access"
  type        = string
  default     = ""
}
