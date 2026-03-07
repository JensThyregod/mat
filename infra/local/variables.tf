variable "zitadel_admin_token" {
  description = "Personal access token for the Zitadel admin service account"
  type        = string
  sensitive   = true
}

variable "zitadel_domain" {
  description = "Domain of the local Zitadel instance"
  type        = string
  default     = "localhost"
}

variable "zitadel_port" {
  description = "Port of the local Zitadel instance"
  type        = string
  default     = "8080"
}

variable "frontend_redirect_uris" {
  description = "OIDC redirect URIs for the frontend application"
  type        = list(string)
  default = [
    "http://localhost:5173/callback",
    "http://localhost:3000/callback",
  ]
}

variable "frontend_post_logout_redirect_uris" {
  description = "Post-logout redirect URIs for the frontend application"
  type        = list(string)
  default = [
    "http://localhost:5173",
    "http://localhost:3000",
  ]
}
