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
