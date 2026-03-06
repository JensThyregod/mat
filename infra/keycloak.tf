# ===========================================================================
# Keycloak Realm Configuration
#
# Manages both production (mat-tutor) and dev (mat-tutor-dev) realms.
# The Keycloak provider uses initial_login = false so it doesn't attempt
# to authenticate during `terraform plan`. On first-ever apply (new VM),
# run `terraform apply -target=scaleway_instance_server.keycloak` first,
# wait for cloud-init to finish, then run the full `terraform apply`.
# ===========================================================================

# ---------------------------------------------------------------------------
# Local values shared across realms
# ---------------------------------------------------------------------------
locals {
  kc_supported_locales = ["da"]
  kc_default_locale    = "da"

  kc_smtp = {
    host = "smtp.tem.scaleway.com"
    port = "2587"
    from = "noreply@${var.domain_name}"
  }
}

# ---------------------------------------------------------------------------
# Production Realm — mat-tutor
# ---------------------------------------------------------------------------
resource "keycloak_realm" "prod" {
  realm        = "mat-tutor"
  enabled      = true
  display_name = "Mat Tutor"

  login_theme = "mat-tutor"

  registration_allowed           = true
  registration_email_as_username = true
  verify_email                   = true
  login_with_email_allowed       = true
  duplicate_emails_allowed       = false
  reset_password_allowed         = true
  edit_username_allowed          = false

  ssl_required              = "external"
  default_signature_algorithm = "RS256"
  access_token_lifespan     = "5m"
  sso_session_idle_timeout  = "30m"
  sso_session_max_lifespan  = "10h"

  internationalization {
    supported_locales = local.kc_supported_locales
    default_locale    = local.kc_default_locale
  }

  security_defenses {
    brute_force_detection {
      permanent_lockout                = false
      max_login_failures               = 5
      wait_increment_seconds           = 60
      quick_login_check_milli_seconds  = 1000
      minimum_quick_login_wait_seconds = 60
      max_failure_wait_seconds         = 900
      failure_reset_time_seconds       = 43200
    }
  }

  smtp_server {
    host              = local.kc_smtp.host
    port              = local.kc_smtp.port
    from              = local.kc_smtp.from
    from_display_name = "Matematik Tutor"
    starttls          = true

    auth {
      username = var.scw_project_id
      password = var.scw_secret_key
    }
  }
}

# ---------------------------------------------------------------------------
# Dev Realm — mat-tutor-dev (relaxed settings for local development)
# ---------------------------------------------------------------------------
resource "keycloak_realm" "dev" {
  realm        = "mat-tutor-dev"
  enabled      = true
  display_name = "Mat Tutor (Dev)"

  login_theme = "mat-tutor"

  registration_allowed           = true
  registration_email_as_username = true
  verify_email                   = true
  login_with_email_allowed       = true
  duplicate_emails_allowed       = false
  reset_password_allowed         = true
  edit_username_allowed          = false

  ssl_required              = "none"
  default_signature_algorithm = "RS256"
  access_token_lifespan     = "30m"
  sso_session_idle_timeout  = "24h"
  sso_session_max_lifespan  = "24h"

  internationalization {
    supported_locales = local.kc_supported_locales
    default_locale    = local.kc_default_locale
  }

  smtp_server {
    host              = local.kc_smtp.host
    port              = local.kc_smtp.port
    from              = local.kc_smtp.from
    from_display_name = "Matematik Tutor (Dev)"
    starttls          = true

    auth {
      username = var.scw_project_id
      password = var.scw_secret_key
    }
  }
}

# ===========================================================================
# OpenID Connect Clients
# ===========================================================================

# ---------------------------------------------------------------------------
# Production — mat-frontend (public SPA client)
# ---------------------------------------------------------------------------
resource "keycloak_openid_client" "prod_frontend" {
  realm_id  = keycloak_realm.prod.id
  client_id = "mat-frontend"
  name      = "Mat Tutor Frontend"
  enabled   = true

  access_type              = "PUBLIC"
  standard_flow_enabled    = true
  direct_access_grants_enabled = false

  valid_redirect_uris = [
    "https://mattutor.dk/*",
    "http://localhost:5173/*",
  ]
  valid_post_logout_redirect_uris = [
    "https://mattutor.dk/*",
    "http://localhost:5173/*",
  ]
  web_origins = [
    "https://mattutor.dk",
    "http://localhost:5173",
  ]

  pkce_code_challenge_method = "S256"
}

# ---------------------------------------------------------------------------
# Production — mat-backend (bearer-only API client)
# ---------------------------------------------------------------------------
resource "keycloak_openid_client" "prod_backend" {
  realm_id  = keycloak_realm.prod.id
  client_id = "mat-backend"
  name      = "Mat Tutor Backend API"
  enabled   = true

  access_type           = "BEARER-ONLY"
  standard_flow_enabled = false
  direct_access_grants_enabled = false
}

# ---------------------------------------------------------------------------
# Production — audience mapper (mat-backend audience in mat-frontend tokens)
# ---------------------------------------------------------------------------
resource "keycloak_openid_audience_protocol_mapper" "prod_backend_audience" {
  realm_id  = keycloak_realm.prod.id
  client_id = keycloak_openid_client.prod_frontend.id
  name      = "mat-backend-audience"

  included_client_audience = keycloak_openid_client.prod_backend.client_id

  add_to_id_token     = false
  add_to_access_token = true
}

# ---------------------------------------------------------------------------
# Dev — mat-frontend (public SPA client, localhost only)
# ---------------------------------------------------------------------------
resource "keycloak_openid_client" "dev_frontend" {
  realm_id  = keycloak_realm.dev.id
  client_id = "mat-frontend"
  name      = "Mat Tutor Frontend (Dev)"
  enabled   = true

  access_type              = "PUBLIC"
  standard_flow_enabled    = true
  direct_access_grants_enabled = true

  valid_redirect_uris = [
    "http://localhost:5173/*",
    "http://localhost:3000/*",
  ]
  valid_post_logout_redirect_uris = [
    "http://localhost:5173/*",
    "http://localhost:3000/*",
  ]
  web_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
  ]

  pkce_code_challenge_method = "S256"
}

# ---------------------------------------------------------------------------
# Dev — mat-backend (bearer-only API client)
# ---------------------------------------------------------------------------
resource "keycloak_openid_client" "dev_backend" {
  realm_id  = keycloak_realm.dev.id
  client_id = "mat-backend"
  name      = "Mat Tutor Backend API (Dev)"
  enabled   = true

  access_type           = "BEARER-ONLY"
  standard_flow_enabled = false
  direct_access_grants_enabled = false
}

# ---------------------------------------------------------------------------
# Dev — audience mapper
# ---------------------------------------------------------------------------
resource "keycloak_openid_audience_protocol_mapper" "dev_backend_audience" {
  realm_id  = keycloak_realm.dev.id
  client_id = keycloak_openid_client.dev_frontend.id
  name      = "mat-backend-audience"

  included_client_audience = keycloak_openid_client.dev_backend.client_id

  add_to_id_token     = false
  add_to_access_token = true
}

# ===========================================================================
# User Profile — defines registration form fields, order, and validation
# ===========================================================================

resource "keycloak_realm_user_profile" "prod" {
  realm_id = keycloak_realm.prod.id

  attribute {
    name         = "username"
    display_name = "$${username}"

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator {
      name   = "length"
      config = { min = "3", max = "255" }
    }
    validator { name = "username-prohibited-characters" }
    validator { name = "up-username-not-idn-homograph" }
  }

  attribute {
    name         = "email"
    display_name = "$${email}"

    required_for_roles = ["user"]

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator { name = "email" }
    validator {
      name   = "length"
      config = { max = "255" }
    }
  }

  attribute {
    name         = "firstName"
    display_name = "$${firstName}"

    required_for_roles = ["user"]

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator {
      name   = "length"
      config = { max = "255" }
    }
    validator { name = "person-name-prohibited-characters" }
  }

  attribute {
    name         = "lastName"
    display_name = "$${lastName}"

    required_for_roles = ["user"]

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator {
      name   = "length"
      config = { max = "255" }
    }
    validator { name = "person-name-prohibited-characters" }
  }

  group {
    name                = "user-metadata"
    display_header      = "User metadata"
    display_description = "Attributes, which refer to user metadata"
  }
}

resource "keycloak_realm_user_profile" "dev" {
  realm_id = keycloak_realm.dev.id

  attribute {
    name         = "username"
    display_name = "$${username}"

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator {
      name   = "length"
      config = { min = "3", max = "255" }
    }
    validator { name = "username-prohibited-characters" }
    validator { name = "up-username-not-idn-homograph" }
  }

  attribute {
    name         = "email"
    display_name = "$${email}"

    required_for_roles = ["user"]

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator { name = "email" }
    validator {
      name   = "length"
      config = { max = "255" }
    }
  }

  attribute {
    name         = "firstName"
    display_name = "$${firstName}"

    required_for_roles = ["user"]

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator {
      name   = "length"
      config = { max = "255" }
    }
    validator { name = "person-name-prohibited-characters" }
  }

  attribute {
    name         = "lastName"
    display_name = "$${lastName}"

    required_for_roles = ["user"]

    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }

    validator {
      name   = "length"
      config = { max = "255" }
    }
    validator { name = "person-name-prohibited-characters" }
  }

  group {
    name                = "user-metadata"
    display_header      = "User metadata"
    display_description = "Attributes, which refer to user metadata"
  }
}
