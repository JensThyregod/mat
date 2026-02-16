using System.ClientModel;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.AzureAIInference;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Infrastructure.Agents;
using MatBackend.Infrastructure.Repositories;
using MatBackend.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Add CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Configuration
var dataRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:DataRoot"] ?? "../data");
var tasksRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:TasksRoot"] ?? "../../tasks");
var taskTypesRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:TaskTypesRoot"] ?? "../../curriculum/task-types");

builder.Services.AddScoped<IStudentRepository>(provider => new FileStudentRepository(dataRoot));
builder.Services.AddScoped<ITaskRepository>(provider => new YamlTaskRepository(tasksRoot, taskTypesRoot));
builder.Services.AddScoped<ITerminsproveRepository>(provider => new FileTerminsproveRepository(dataRoot));
builder.Services.AddScoped<IEvaluationService, EvaluationService>();
builder.Services.AddScoped<ISkillService, SkillService>();

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

// Register Agents - both legacy and optimized
builder.Services.AddScoped<IBrainstormAgent, BrainstormAgent>();
builder.Services.AddScoped<IFormatterAgent, FormatterAgent>();
builder.Services.AddScoped<IValidatorAgent, ValidatorAgent>();
builder.Services.AddScoped<IVisualizationAgent, VisualizationAgent>();

// Image generation agent (Gemini)
var imageOutputPath = Path.Combine(dataRoot, "generated-images");
builder.Services.AddHttpClient("GeminiImageGeneration", client =>
{
    client.Timeout = TimeSpan.FromSeconds(120);
});
builder.Services.AddScoped<IImageGenerationAgent>(provider =>
{
    var httpClientFactory = provider.GetRequiredService<IHttpClientFactory>();
    var httpClient = httpClientFactory.CreateClient("GeminiImageGeneration");
    var logger = provider.GetRequiredService<ILogger<GeminiImageGenerationAgent>>();
    return new GeminiImageGenerationAgent(httpClient, agentConfig, imageOutputPath, logger);
});

if (agentConfig.ImageGenerationEnabled)
{
    Console.WriteLine($"🎨 Image generation ENABLED (Gemini {agentConfig.GeminiModelId})");
    Console.WriteLine($"   Images saved to: {imageOutputPath}");
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

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();

// Serve generated images as static files at /api/images/{filename}
Directory.CreateDirectory(imageOutputPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(imageOutputPath),
    RequestPath = "/api/images"
});

app.MapControllers();

app.Run();
