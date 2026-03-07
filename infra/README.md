# Infrastructure

All infrastructure is managed with Terraform in a single `terraform apply`.

## Providers

| Provider | Purpose |
|----------|---------|
| `scaleway/scaleway` | Serverless containers, managed PostgreSQL, object storage, TEM |
| `cloudflare/cloudflare` | DNS records, firewall rules |
| `zitadel/zitadel` | Organization, project, OIDC applications, branding, roles |

## Architecture

```
infra/
  main.tf           # Scaleway + Cloudflare infrastructure + Zitadel container
  zitadel.tf        # Zitadel org, project, apps, branding, roles
  variables.tf      # All variable declarations
  outputs.tf        # Output values
  terraform.tfvars  # Local overrides (gitignored)
  local/
    main.tf         # Local dev Zitadel Terraform config
    variables.tf    # Local dev variable declarations
```

## First-Time Setup

```bash
cd infra
terraform init \
  -backend-config="access_key=YOUR_SCW_ACCESS_KEY" \
  -backend-config="secret_key=YOUR_SCW_SECRET_KEY"

# Step 1: Provision infrastructure (Zitadel container, DB, DNS)
terraform apply -target=scaleway_container.zitadel \
                -target=scaleway_rdb_instance.zitadel \
                -target=cloudflare_record.zitadel

# Step 2: Wait for Zitadel to initialize (~1-2 min)
# Visit https://auth.mattutor.dk and create a service account PAT

# Step 3: Full apply (now Zitadel is reachable)
terraform apply
```

## Day-to-Day Deploys

After the initial setup, every deploy is a single `terraform apply`. The CI
pipeline (`.github/workflows/deploy.yml`) runs this automatically on push to
main. No SSH, no SCP, no JAR files, no container restarts.

## Local Development

Local dev uses the root `docker-compose.yml` which runs Zitadel + Traefik +
Postgres on port 8080. After first start:

1. Visit `http://localhost:8080/ui/console` and log in as `zitadel-admin@zitadel.localhost` / `Password1!`
2. Create a service account with Org Owner role and generate a PAT
3. Run `cd infra/local && terraform init && terraform apply -var="zitadel_admin_token=YOUR_PAT"`
4. The Terraform output includes the `frontend_client_id` to use in `frontend/.env`
