# ===========================================================================
# Zitadel Configuration
#
# Manages the organization, project, OIDC applications, branding, and roles.
# The Zitadel provider authenticates with a service account PAT.
#
# TEMPORARILY COMMENTED OUT — uncomment after first deploy and PAT creation.
# ===========================================================================

# resource "zitadel_org" "mat" {
#   name = "Mat Tutor"
# }
#
# resource "zitadel_project" "mat" {
#   name   = "Mat Tutor"
#   org_id = zitadel_org.mat.id
# }
#
# # ---------------------------------------------------------------------------
# # OIDC Application — frontend SPA (public client, PKCE)
# # ---------------------------------------------------------------------------
# resource "zitadel_application_oidc" "frontend" {
#   org_id     = zitadel_org.mat.id
#   project_id = zitadel_project.mat.id
#   name       = "Mat Tutor Frontend"
#
#   redirect_uris = [
#     "https://${var.domain_name}/callback",
#     "http://localhost:5173/callback",
#   ]
#   post_logout_redirect_uris = [
#     "https://${var.domain_name}",
#     "http://localhost:5173",
#   ]
#
#   response_types   = ["OIDC_RESPONSE_TYPE_CODE"]
#   grant_types      = ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"]
#   app_type         = "OIDC_APP_TYPE_USER_AGENT"
#   auth_method_type = "OIDC_AUTH_METHOD_TYPE_NONE"
#
#   access_token_type           = "OIDC_TOKEN_TYPE_JWT"
#   access_token_role_assertion = true
#   id_token_role_assertion     = true
#   id_token_userinfo_assertion = true
#   dev_mode                    = false
#   clock_skew                  = "0s"
# }
#
# # ---------------------------------------------------------------------------
# # Roles
# # ---------------------------------------------------------------------------
# resource "zitadel_project_role" "student" {
#   org_id       = zitadel_org.mat.id
#   project_id   = zitadel_project.mat.id
#   role_key     = "student"
#   display_name = "Student"
# }
#
# # ---------------------------------------------------------------------------
# # Branding — label policy (colors, watermark)
# # ---------------------------------------------------------------------------
# resource "zitadel_default_label_policy" "mat_branding" {
#   primary_color      = "#C2725A"
#   background_color   = "#F8F7F4"
#   font_color         = "#1A1A1A"
#   warn_color         = "#FF3B30"
#
#   primary_color_dark    = "#C2725A"
#   background_color_dark = "#1A1A1A"
#   font_color_dark       = "#F8F7F4"
#   warn_color_dark       = "#FF3B30"
#
#   hide_login_name_suffix = true
#   disable_watermark      = true
# }
#
# # ---------------------------------------------------------------------------
# # Outputs
# # ---------------------------------------------------------------------------
# output "zitadel_frontend_client_id" {
#   description = "OIDC client ID for the frontend application"
#   value       = zitadel_application_oidc.frontend.client_id
# }
#
# output "zitadel_org_id" {
#   description = "Zitadel organization ID"
#   value       = zitadel_org.mat.id
# }
#
# output "zitadel_project_id" {
#   description = "Zitadel project ID"
#   value       = zitadel_project.mat.id
# }
