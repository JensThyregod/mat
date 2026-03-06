using System.ClientModel;
using System.Security.Claims;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.AzureAIInference;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Scoring;
using MatBackend.Infrastructure.Agents;
using MatBackend.Infrastructure.Repositories;
using MatBackend.Infrastructure.Services;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Keycloak JWT authentication
var keycloakAuthority = builder.Configuration["Keycloak:Authority"] ?? "https://auth.mattutor.dk/realms/mat-tutor";
var keycloakAudience = builder.Configuration["Keycloak:Audience"] ?? "mat-backend";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = keycloakAuthority;
        options.Audience = keycloakAudience;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters.NameClaimType = "preferred_username";
        options.TokenValidationParameters.RoleClaimType = ClaimTypes.Role;
    });
builder.Services.AddAuthorization();
Console.WriteLine($"🔐 Keycloak: authority={keycloakAuthority}, audience={keycloakAudience}");

// Keycloak Admin API (for test-user deletion)
var keycloakBaseUrl = keycloakAuthority.Contains("/realms/")
    ? keycloakAuthority[..keycloakAuthority.IndexOf("/realms/")]
    : keycloakAuthority;
var keycloakRealm = keycloakAuthority.Contains("/realms/")
    ? keycloakAuthority[(keycloakAuthority.LastIndexOf("/realms/") + "/realms/".Length)..]
    : "mat-tutor";
var kcAdminClientId = builder.Configuration["Keycloak:AdminClientId"] ?? "admin-cli";
var kcAdminClientSecret = builder.Configuration["Keycloak:AdminClientSecret"]
                          ?? Environment.GetEnvironmentVariable("KEYCLOAK_ADMIN_CLIENT_SECRET") ?? "";

builder.Services.AddHttpClient("KeycloakAdmin");
builder.Services.AddScoped<IKeycloakAdminService>(provider =>
{
    var httpClient = provider.GetRequiredService<IHttpClientFactory>().CreateClient("KeycloakAdmin");
    var logger = provider.GetRequiredService<ILogger<KeycloakAdminService>>();
    return new KeycloakAdminService(httpClient, keycloakBaseUrl, keycloakRealm, kcAdminClientId, kcAdminClientSecret, logger);
});
Console.WriteLine($"🔑 Keycloak Admin: base={keycloakBaseUrl}, realm={keycloakRealm}, client={kcAdminClientId}");

// Add CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                var host = new Uri(origin).Host;
                return host == "localhost" || host.EndsWith(".scw.cloud") || host == "mattutor.dk" || host.EndsWith(".mattutor.dk");
            })
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Configuration
var dataRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:DataRoot"] ?? "../data");
var tasksRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:TasksRoot"] ?? "../../tasks");
var taskTypesRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:TaskTypesRoot"] ?? "../../curriculum/task-types");

var storageProvider = builder.Configuration["StudentStorage:Provider"] ?? "File";
if (storageProvider.Equals("S3", StringComparison.OrdinalIgnoreCase))
{
    var s3Bucket = builder.Configuration["StudentStorage:S3:BucketName"] ?? "mat-student-data";
    var s3Region = builder.Configuration["StudentStorage:S3:Region"] ?? "fr-par";
    var s3ServiceUrl = builder.Configuration["StudentStorage:S3:ServiceUrl"] ?? $"https://s3.{s3Region}.scw.cloud";
    var s3AccessKey = builder.Configuration["StudentStorage:S3:AccessKey"]
                      ?? Environment.GetEnvironmentVariable("SCW_ACCESS_KEY") ?? "";
    var s3SecretKey = builder.Configuration["StudentStorage:S3:SecretKey"]
                      ?? Environment.GetEnvironmentVariable("SCW_SECRET_KEY") ?? "";

    var s3Config = new AmazonS3Config
    {
        ServiceURL = s3ServiceUrl,
        ForcePathStyle = true
    };
    var s3Client = new AmazonS3Client(s3AccessKey, s3SecretKey, s3Config);

    builder.Services.AddSingleton<IAmazonS3>(s3Client);
    builder.Services.AddScoped<IStudentRepository>(provider =>
        new S3StudentRepository(
            provider.GetRequiredService<IAmazonS3>(),
            s3Bucket,
            provider.GetRequiredService<ILogger<S3StudentRepository>>()));

    Console.WriteLine($"Student storage: S3 (bucket={s3Bucket}, endpoint={s3ServiceUrl})");
}
else
{
    builder.Services.AddScoped<IStudentRepository>(provider => new FileStudentRepository(dataRoot));
    Console.WriteLine($"Student storage: File ({dataRoot})");
}
builder.Services.AddScoped<ITaskRepository>(provider => new YamlTaskRepository(tasksRoot, taskTypesRoot));
builder.Services.AddScoped<ITerminsproveRepository>(provider => new FileTerminsproveRepository(dataRoot));
builder.Services.AddScoped<IEvaluationService, EvaluationService>();
builder.Services.AddScoped<ISkillService, SkillService>();
builder.Services.AddScoped<IAnswerRepository>(provider => new FileAnswerRepository(dataRoot));
builder.Services.AddScoped<ITaskSetService>(provider => new TaskSetService(tasksRoot));

// Bayesian scoring & training
var scoringParams = new ScoringParameters
{
    MaxEvidence = builder.Configuration.GetValue<double?>("Scoring:MaxEvidence") ?? 30.0,
    MinAttempts = builder.Configuration.GetValue<int?>("Scoring:MinAttempts") ?? 3,
    DifficultyWeightMin = builder.Configuration.GetValue<double?>("Scoring:DifficultyWeightMin") ?? 0.5,
    DifficultyWeightMax = builder.Configuration.GetValue<double?>("Scoring:DifficultyWeightMax") ?? 1.0,
    MaxDifficulty = builder.Configuration.GetValue<double?>("Scoring:MaxDifficulty") ?? 5.0,
    PrimarySkillWeightFraction = builder.Configuration.GetValue<double?>("Scoring:PrimarySkillWeightFraction") ?? 0.70,
};
builder.Services.AddSingleton(scoringParams);
builder.Services.AddScoped<ISkillStateRepository>(provider =>
    new FileSkillStateRepository(dataRoot, provider.GetRequiredService<ILogger<FileSkillStateRepository>>()));
builder.Services.AddScoped<ITrainingService, TrainingService>();

var verboseScoring = builder.Configuration.GetValue<bool?>("Scoring:VerboseLogging") ?? false;
Console.WriteLine($"🧠 Bayesian scoring: MaxEvidence={scoringParams.MaxEvidence}, VerboseLogging={verboseScoring}");

// Email verification (Scaleway TEM)
var scwSecretKey = builder.Configuration["ScalewayTem:SecretKey"] ?? Environment.GetEnvironmentVariable("SCW_SECRET_KEY") ?? "";
var scwProjectId = builder.Configuration["ScalewayTem:ProjectId"] ?? Environment.GetEnvironmentVariable("SCW_DEFAULT_PROJECT_ID") ?? "";
var scwRegion = builder.Configuration["ScalewayTem:Region"] ?? "fr-par";
var temSenderEmail = builder.Configuration["ScalewayTem:SenderEmail"] ?? "noreply@mattutor.dk";
var temSenderName = builder.Configuration["ScalewayTem:SenderName"] ?? "Matematik Tutor";
builder.Services.AddHttpClient("ScalewayTem");
builder.Services.AddScoped<IEmailService>(provider =>
{
    var httpClientFactory = provider.GetRequiredService<IHttpClientFactory>();
    var httpClient = httpClientFactory.CreateClient("ScalewayTem");
    var logger = provider.GetRequiredService<ILogger<ScalewayEmailService>>();
    return new ScalewayEmailService(httpClient, scwSecretKey, scwProjectId, scwRegion, temSenderEmail, temSenderName, logger);
});
Console.WriteLine($"📧 Scaleway TEM email: {(string.IsNullOrEmpty(scwSecretKey) ? "(no secret key)" : "configured")}");

// Agent Configuration
var agentConfig = new AgentConfiguration
{
    ApiKey = builder.Configuration["OpenAI:ApiKey"] ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? "",
    ModelId = builder.Configuration["OpenAI:ModelId"] ?? "gpt-4",
    UseAzure = builder.Configuration.GetValue<bool>("OpenAI:UseAzure"),
    AzureEndpoint = builder.Configuration["OpenAI:AzureEndpoint"],
    MaxTokens = builder.Configuration.GetValue<int?>("OpenAI:MaxTokens") ?? 4096,
    Temperature = builder.Configuration.GetValue<double?>("OpenAI:Temperature") ?? 0.7,
    // Gemini image generation
    GeminiApiKey = builder.Configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? "",
    GeminiModelId = builder.Configuration["Gemini:ModelId"] ?? "gemini-3-pro-image-preview",
    ImageGenerationEnabled = builder.Configuration.GetValue<bool?>("Gemini:ImageGenerationEnabled") ?? false
};
builder.Services.AddSingleton(agentConfig);

// Log configuration on startup
Console.WriteLine("========================================");
Console.WriteLine($"Environment: {builder.Environment.EnvironmentName}");
Console.WriteLine($"OpenAI UseAzure: {agentConfig.UseAzure}");
Console.WriteLine($"OpenAI Endpoint: {agentConfig.AzureEndpoint}");
Console.WriteLine($"OpenAI ModelId: {agentConfig.ModelId}");
Console.WriteLine($"OpenAI ApiKey: {(string.IsNullOrEmpty(agentConfig.ApiKey) ? "(empty)" : agentConfig.ApiKey[..10] + "...")}");
Console.WriteLine($"Gemini ImageGen: {(agentConfig.ImageGenerationEnabled ? "ENABLED" : "disabled")}");
Console.WriteLine($"Gemini ModelId: {agentConfig.GeminiModelId}");
Console.WriteLine($"Gemini ApiKey: {(string.IsNullOrEmpty(agentConfig.GeminiApiKey) ? "(empty)" : agentConfig.GeminiApiKey[..10] + "...")}");
Console.WriteLine("========================================");

// Configure Semantic Kernel
builder.Services.AddSingleton<Kernel>(provider =>
{
    var kernelBuilder = Kernel.CreateBuilder();
    
    if (agentConfig.UseAzure && !string.IsNullOrEmpty(agentConfig.AzureEndpoint))
    {
        // Use Azure OpenAI through Azure AI Foundry endpoint
        kernelBuilder.AddAzureOpenAIChatCompletion(
            deploymentName: agentConfig.ModelId,
            endpoint: agentConfig.AzureEndpoint,
            apiKey: agentConfig.ApiKey);
    }
    else
    {
        kernelBuilder.AddOpenAIChatCompletion(
            modelId: agentConfig.ModelId,
            apiKey: agentConfig.ApiKey);
    }
    
    return kernelBuilder.Build();
});

// Curriculum sampler — loads FP9 pensum and samples random topic pairs for diverse task generation
var curriculumYamlPath = Path.Combine(builder.Environment.ContentRootPath, 
    builder.Configuration["DataSettings:CurriculumPath"] ?? "../../curriculum/fp9-curriculum.yaml");
builder.Services.AddSingleton<ICurriculumSampler>(new CurriculumSampler(curriculumYamlPath));
Console.WriteLine($"📚 Curriculum loaded from: {curriculumYamlPath}");

// Register Agents - both legacy and optimized
builder.Services.AddScoped<IBrainstormAgent, BrainstormAgent>();
builder.Services.AddScoped<IFormatterAgent, FormatterAgent>();
builder.Services.AddScoped<IValidatorAgent, ValidatorAgent>();
builder.Services.AddScoped<IVisualizationAgent, VisualizationAgent>();
builder.Services.AddScoped<ITopicBrainstormAgent, TopicBrainstormAgent>();

// Image generation agent (Gemini)
builder.Services.AddHttpClient("GeminiImageGeneration", client =>
{
    client.Timeout = TimeSpan.FromSeconds(120);
});
builder.Services.AddScoped<IImageGenerationAgent>(provider =>
{
    var httpClientFactory = provider.GetRequiredService<IHttpClientFactory>();
    var httpClient = httpClientFactory.CreateClient("GeminiImageGeneration");
    var logger = provider.GetRequiredService<ILogger<GeminiImageGenerationAgent>>();
    return new GeminiImageGenerationAgent(httpClient, agentConfig, logger);
});

if (agentConfig.ImageGenerationEnabled)
{
    Console.WriteLine($"🎨 Image generation ENABLED (Gemini {agentConfig.GeminiModelId})");
}

// Fast mode (default) - uses batch generation for 3-5x speed improvement
var useFastMode = builder.Configuration.GetValue<bool?>("Generation:FastMode") ?? true;
builder.Services.AddScoped<IBatchTaskGeneratorAgent, BatchTaskGeneratorAgent>();

if (useFastMode)
{
    Console.WriteLine("🚀 Using FAST generation mode (parallel batches)");
    builder.Services.AddScoped<IAgentOrchestrator, FastAgentOrchestrator>();
}
else
{
    Console.WriteLine("🐢 Using STANDARD generation mode (sequential)");
    builder.Services.AddScoped<IAgentOrchestrator, AgentOrchestrator>();
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Serve terminsprøve content (images, etc.) as static files at /api/terminsprover/{folderName}/images/{file}
var terminsproverPath = Path.Combine(dataRoot, "terminsprover");
Directory.CreateDirectory(terminsproverPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(terminsproverPath),
    RequestPath = "/api/terminsprover"
});

app.MapControllers();

app.Run();
