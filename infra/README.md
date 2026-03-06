# Infrastructure

All infrastructure is managed with Terraform in a single `terraform apply`.

## Providers

| Provider | Purpose |
|----------|---------|
| `scaleway/scaleway` | VM, managed PostgreSQL, serverless containers, object storage, TEM |
| `cloudflare/cloudflare` | DNS records, firewall rules |
| `keycloak/keycloak` | Realm configuration, OpenID clients, user profile |

## Architecture

```
infra/
  main.tf           # Scaleway + Cloudflare infrastructure
  keycloak.tf       # Keycloak realms, clients, user profile
  variables.tf      # All variable declarations
  terraform.tfvars  # Local overrides (gitignored)
  keycloak/
    cloud-init.yml  # VM bootstrap: installs Docker, starts Keycloak
    docker-compose.yml  # Production Keycloak + Caddy stack
    realm-dev-export.json  # Local dev only (used by root docker-compose.yml)
```

## First-Time Setup

On a brand-new environment (no existing VM), Keycloak isn't running yet so the
Keycloak provider can't connect. Use a targeted apply first:

```bash
cd infra
terraform init \
  -backend-config="access_key=YOUR_SCW_ACCESS_KEY" \
  -backend-config="secret_key=YOUR_SCW_SECRET_KEY"

# Step 1: Provision infrastructure (VM, DB, DNS)
terraform apply -target=scaleway_instance_server.keycloak \
                -target=scaleway_rdb_instance.keycloak \
                -target=cloudflare_record.keycloak

# Step 2: Wait for cloud-init to finish (~2-3 min)
# SSH into the VM and check: cloud-init status --wait

# Step 3: Full apply (now Keycloak is reachable)
terraform apply
```

## Importing Existing Resources

If Keycloak already has realms/clients created outside Terraform, import them
before the first full apply to avoid conflicts:

```bash
# Realms
terraform import keycloak_realm.prod mat-tutor
terraform import keycloak_realm.dev mat-tutor-dev

# Clients (use the Keycloak internal UUID, find via Admin Console > Clients)
terraform import keycloak_openid_client.prod_frontend "mat-tutor/CLIENT_UUID"
terraform import keycloak_openid_client.prod_backend "mat-tutor/CLIENT_UUID"
terraform import keycloak_openid_client.dev_frontend "mat-tutor-dev/CLIENT_UUID"
terraform import keycloak_openid_client.dev_backend "mat-tutor-dev/CLIENT_UUID"

# Audience mappers (realm/client/client_uuid/mapper_uuid)
terraform import keycloak_openid_audience_protocol_mapper.prod_backend_audience "mat-tutor/client/CLIENT_UUID/MAPPER_UUID"
terraform import keycloak_openid_audience_protocol_mapper.dev_backend_audience "mat-tutor-dev/client/CLIENT_UUID/MAPPER_UUID"

# User profiles (don't support import — Terraform will create/update them on first apply)
```

## Day-to-Day Deploys

After the initial setup, every deploy is a single `terraform apply`. The CI
pipeline (`.github/workflows/deploy.yml`) runs this automatically on push to
main. The Keycloak theme JAR is deployed separately via SCP because it's a
filesystem artifact, not an API-managed resource.

## Local Development

Local dev uses the root `docker-compose.yml` which runs Keycloak with
`start-dev --import-realm` and imports `infra/keycloak/realm-dev-export.json`.
This is independent of Terraform and is fine because local dev is ephemeral.
