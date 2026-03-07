output "registry_endpoint" {
  description = "Scaleway Container Registry endpoint"
  value       = scaleway_registry_namespace.main.endpoint
}

output "backend_url" {
  description = "Public URL of the backend serverless container"
  value       = scaleway_container.backend.domain_name
}

output "frontend_url" {
  description = "Public URL of the frontend serverless container"
  value       = scaleway_container.frontend.domain_name
}

output "backend_container_id" {
  description = "ID of the backend container"
  value       = scaleway_container.backend.id
}

output "frontend_container_id" {
  description = "ID of the frontend container"
  value       = scaleway_container.frontend.id
}

output "frontend_custom_domain" {
  description = "Custom domain for the frontend"
  value       = var.domain_name
}

output "backend_custom_domain" {
  description = "Custom domain for the backend API"
  value       = "${var.api_subdomain}.${var.domain_name}"
}

output "zitadel_url" {
  description = "Public URL of the Zitadel identity provider"
  value       = "https://${var.zitadel_hostname}"
}

output "zitadel_container_url" {
  description = "Scaleway domain of the Zitadel container"
  value       = scaleway_container.zitadel.domain_name
}

output "zitadel_db_endpoint" {
  description = "Endpoint of the Zitadel managed PostgreSQL instance"
  value       = "${scaleway_rdb_instance.zitadel.endpoint_ip}:${scaleway_rdb_instance.zitadel.endpoint_port}"
  sensitive   = true
}
