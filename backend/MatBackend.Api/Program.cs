using MatBackend.Core.Interfaces;
using MatBackend.Infrastructure.Repositories;
using MatBackend.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Configuration
var dataRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:DataRoot"] ?? "../data");
var tasksRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:TasksRoot"] ?? "../../tasks");
var taskTypesRoot = Path.Combine(builder.Environment.ContentRootPath, builder.Configuration["DataSettings:TaskTypesRoot"] ?? "../../curriculum/task-types");

builder.Services.AddScoped<IStudentRepository>(provider => new FileStudentRepository(dataRoot));
builder.Services.AddScoped<ITaskRepository>(provider => new YamlTaskRepository(tasksRoot, taskTypesRoot));
builder.Services.AddScoped<IEvaluationService, EvaluationService>();
builder.Services.AddScoped<ISkillService, SkillService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
