FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY backend/MatBackend.Core/MatBackend.Core.csproj MatBackend.Core/
COPY backend/MatBackend.Infrastructure/MatBackend.Infrastructure.csproj MatBackend.Infrastructure/
COPY backend/MatBackend.Api/MatBackend.Api.csproj MatBackend.Api/
RUN dotnet restore MatBackend.Api/MatBackend.Api.csproj

COPY backend/MatBackend.Core/ MatBackend.Core/
COPY backend/MatBackend.Infrastructure/ MatBackend.Infrastructure/
COPY backend/MatBackend.Api/ MatBackend.Api/
RUN dotnet publish MatBackend.Api/MatBackend.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN mkdir -p /app/data/terminsprover /app/data/agent-logs /app/data/generated-images

COPY --from=build /app/publish .
COPY tasks/ /app/tasks/
COPY curriculum/ /app/curriculum/

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "MatBackend.Api.dll"]
