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
