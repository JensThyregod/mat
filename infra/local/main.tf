terraform {
  required_version = ">= 1.0"

  required_providers {
    zitadel = {
      source  = "zitadel/zitadel"
      version = "~> 2.0"
    }
  }
}

provider "zitadel" {
  domain       = var.zitadel_domain
  port         = var.zitadel_port
  insecure     = "true"
  access_token = var.zitadel_admin_token
}

resource "zitadel_org" "mat" {
  name = "Mat Tutor"
}

resource "zitadel_project" "mat" {
  name   = "Mat Tutor"
  org_id = zitadel_org.mat.id
}

resource "zitadel_application_oidc" "frontend" {
  org_id     = zitadel_org.mat.id
  project_id = zitadel_project.mat.id
  name       = "Mat Tutor Frontend"

  redirect_uris = var.frontend_redirect_uris
  post_logout_redirect_uris = var.frontend_post_logout_redirect_uris

  response_types   = ["OIDC_RESPONSE_TYPE_CODE"]
  grant_types      = ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"]
  app_type         = "OIDC_APP_TYPE_USER_AGENT"
  auth_method_type = "OIDC_AUTH_METHOD_TYPE_NONE"

  access_token_type           = "OIDC_TOKEN_TYPE_JWT"
  access_token_role_assertion = true
  id_token_role_assertion     = true
  id_token_userinfo_assertion = true
  dev_mode                    = true
  clock_skew                  = "0s"
}

resource "zitadel_project_role" "student" {
  org_id       = zitadel_org.mat.id
  project_id   = zitadel_project.mat.id
  role_key     = "student"
  display_name = "Student"
}

resource "zitadel_default_label_policy" "mat_branding" {
  primary_color      = "#C2725A"
  background_color   = "#F8F7F4"
  font_color         = "#1A1A1A"
  warn_color         = "#FF3B30"

  primary_color_dark    = "#C2725A"
  background_color_dark = "#1A1A1A"
  font_color_dark       = "#F8F7F4"
  warn_color_dark       = "#FF3B30"

  hide_login_name_suffix = true
  disable_watermark      = true
}

output "frontend_client_id" {
  description = "OIDC client ID for the frontend application"
  value       = zitadel_application_oidc.frontend.client_id
  sensitive   = true
}

output "org_id" {
  description = "Zitadel organization ID"
  value       = zitadel_org.mat.id
}

output "project_id" {
  description = "Zitadel project ID"
  value       = zitadel_project.mat.id
}
