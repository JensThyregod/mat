using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using Microsoft.AspNetCore.Mvc;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Api.Controllers;

/// <summary>
/// API controller for generating terminsprøver (term exams) using AI agents
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TerminsproveController : ControllerBase
{
    private readonly IAgentOrchestrator _orchestrator;
    private readonly ITerminsproveRepository _repository;
    private readonly ILogger<TerminsproveController> _logger;
    
    public TerminsproveController(
        IAgentOrchestrator orchestrator,
        ITerminsproveRepository repository,
        ILogger<TerminsproveController> logger)
    {
        _orchestrator = orchestrator;
        _repository = repository;
        _logger = logger;
    }
    
    /// <summary>
    /// Generate a new terminsprøve with the AI agent pipeline
    /// </summary>
    /// <param name="request">Generation parameters</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The generated terminsprøve with all tasks</returns>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(TerminsproveResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<TerminsproveResult>> GenerateTerminsprove(
        [FromBody] TerminsproveRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Received terminsprøve generation request: {TaskCount} tasks for {Level}",
            request.TaskCount, request.Level);
        
        // Validate request
        if (request.TaskCount < 1 || request.TaskCount > 50)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid task count",
                Detail = "Task count must be between 1 and 50"
            });
        }
        
        if (request.Difficulty.Easy + request.Difficulty.Medium + request.Difficulty.Hard != 1.0)
        {
            // Normalize difficulty distribution
            var total = request.Difficulty.Easy + request.Difficulty.Medium + request.Difficulty.Hard;
            if (total > 0)
            {
                request.Difficulty.Easy /= total;
                request.Difficulty.Medium /= total;
                request.Difficulty.Hard /= total;
            }
            else
            {
                request.Difficulty = new DifficultyDistribution();
            }
        }
        
        try
        {
            var result = await _orchestrator.GenerateTerminsproveAsync(request, null, cancellationToken);
            
            if (result.Status == GenerationStatus.Failed)
            {
                return StatusCode(500, new ProblemDetails
                {
                    Title = "Generation failed",
                    Detail = result.ErrorMessage
                });
            }
            
            // Save the generated terminsprøve
            await _repository.SaveAsync(result);
            _logger.LogInformation("Saved terminsprøve with ID: {Id}", result.Id);
            
            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499, new ProblemDetails
            {
                Title = "Request cancelled",
                Detail = "The generation request was cancelled"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during terminsprøve generation");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal error",
                Detail = "An unexpected error occurred during generation"
            });
        }
    }
    
    // Shared JSON options for SSE serialization - enums as strings, camelCase
    private static readonly JsonSerializerOptions _sseJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    
    /// <summary>
    /// Generate a terminsprøve with streaming progress updates.
    /// Uses a Channel for thread-safe SSE writes from parallel batch generation.
    /// </summary>
    [HttpPost("generate/stream")]
    public async Task GenerateTerminsproveStreaming(
        [FromBody] TerminsproveRequest request,
        CancellationToken cancellationToken = default)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no"; // Disable nginx buffering
        
        // Use a Channel to safely queue SSE events from parallel tasks
        var channel = Channel.CreateUnbounded<GenerationProgress>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false // Multiple batch tasks can write concurrently
        });
        
        // IProgress implementation that writes to the channel (thread-safe)
        var progress = new ChannelProgress(channel.Writer);
        
        // Start generation in background - writes events to channel
        var generationTask = Task.Run(async () =>
        {
            try
            {
                var result = await _orchestrator.GenerateTerminsproveAsync(request, progress, cancellationToken);
                return result;
            }
            finally
            {
                // Signal that no more events will be written
                channel.Writer.Complete();
            }
        }, cancellationToken);
        
        // Read events from channel and write to SSE stream (single writer to Response)
        try
        {
            await foreach (var evt in channel.Reader.ReadAllAsync(cancellationToken))
            {
                var json = JsonSerializer.Serialize(evt, _sseJsonOptions);
                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            
            // Generation is done - get the result
            var result = await generationTask;
            
            // Save the generated terminsprøve
            if (result.Status != GenerationStatus.Failed)
            {
                await _repository.SaveAsync(result);
                _logger.LogInformation("Saved terminsprøve with ID: {Id}", result.Id);
            }
            
            var resultJson = JsonSerializer.Serialize(result, _sseJsonOptions);
            await Response.WriteAsync($"data: {{\"type\":\"result\",\"data\":{resultJson}}}\n\n", cancellationToken);
            await Response.WriteAsync("data: [DONE]\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("SSE stream cancelled by client");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during SSE streaming");
            var error = JsonSerializer.Serialize(new { type = "error", message = ex.Message }, _sseJsonOptions);
            await Response.WriteAsync($"data: {error}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
    
    /// <summary>
    /// Thread-safe IProgress implementation backed by a Channel
    /// </summary>
    private class ChannelProgress : IProgress<GenerationProgress>
    {
        private readonly ChannelWriter<GenerationProgress> _writer;
        
        public ChannelProgress(ChannelWriter<GenerationProgress> writer)
        {
            _writer = writer;
        }
        
        public void Report(GenerationProgress value)
        {
            // TryWrite is thread-safe and non-blocking for unbounded channels
            _writer.TryWrite(value);
        }
    }
    
    /// <summary>
    /// Get all saved terminsprøver
    /// </summary>
    /// <param name="studentId">Optional student ID to filter by</param>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TerminsproveResult>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TerminsproveResult>>> GetAll([FromQuery] string? studentId = null)
    {
        var results = await _repository.GetAllAsync(studentId);
        return Ok(results);
    }
    
    /// <summary>
    /// Get a specific terminsprøve by ID
    /// </summary>
    /// <param name="id">The terminsprøve ID</param>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(TerminsproveResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TerminsproveResult>> GetById(string id)
    {
        var result = await _repository.GetByIdAsync(id);
        
        if (result == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Terminsprøve not found",
                Detail = $"No terminsprøve found with ID: {id}"
            });
        }
        
        return Ok(result);
    }
    
    /// <summary>
    /// Delete a terminsprøve by ID
    /// </summary>
    /// <param name="id">The terminsprøve ID</param>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        var deleted = await _repository.DeleteAsync(id);
        
        if (!deleted)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Terminsprøve not found",
                Detail = $"No terminsprøve found with ID: {id}"
            });
        }
        
        _logger.LogInformation("Deleted terminsprøve with ID: {Id}", id);
        return NoContent();
    }
    
    /// <summary>
    /// Get the orchestration log for a specific terminsprøve.
    /// Shows all agent calls, raw prompts, raw LLM responses, and timing.
    /// </summary>
    /// <param name="id">The terminsprøve ID</param>
    [HttpGet("{id}/log")]
    [ProducesResponseType(typeof(OrchestrationLogResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrchestrationLogResponse>> GetOrchestrationLog(string id)
    {
        var result = await _repository.GetByIdAsync(id);
        
        if (result == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Terminsprøve not found",
                Detail = $"No terminsprøve found with ID: {id}"
            });
        }
        
        return Ok(new OrchestrationLogResponse
        {
            TerminsproveId = result.Id,
            Status = result.Status,
            Metadata = result.Metadata,
            AgentLog = result.AgentLog,
            TaskCount = result.Tasks.Count,
            TaskSummaries = result.Tasks.Select(t => new TaskSummary
            {
                Id = t.Id,
                TaskTypeId = t.TaskTypeId,
                Category = t.Category,
                Difficulty = t.Difficulty,
                ContextPreview = t.ContextText.Length > 100 ? t.ContextText[..100] + "..." : t.ContextText,
                SubQuestionCount = t.SubQuestions.Count,
                IsValid = t.Validation.IsValid
            }).ToList()
        });
    }
    
    /// <summary>
    /// Get available task types for generation
    /// </summary>
    [HttpGet("task-types")]
    [ProducesResponseType(typeof(IEnumerable<TaskTypeDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<TaskTypeDto>> GetTaskTypes()
    {
        // Return predefined task types
        var taskTypes = new List<TaskTypeDto>
        {
            new("tal_ligninger", "Ligninger", "tal_og_algebra", "ligninger"),
            new("tal_broeker_og_antal", "Brøker og antal", "tal_og_algebra", "broeker"),
            new("tal_regnearter", "Regnearter", "tal_og_algebra", "regnearter"),
            new("tal_pris_rabat_procent", "Pris, rabat og procent", "tal_og_algebra", "procent"),
            new("tal_forholdstalsregning", "Forholdstalsregning", "tal_og_algebra", "forhold"),
            new("geo_sammensat_figur", "Sammensat figur", "geometri_og_maaling", "areal"),
            new("geo_vinkelsum", "Vinkelsum", "geometri_og_maaling", "vinkler"),
            new("geo_projektioner", "Projektioner", "geometri_og_maaling", "projektioner"),
            new("geo_enhedsomregning", "Enhedsomregning", "geometri_og_maaling", "enheder"),
            new("stat_boksplot", "Boksplot", "statistik_og_sandsynlighed", "boksplot"),
            new("stat_sandsynlighed", "Sandsynlighed", "statistik_og_sandsynlighed", "sandsynlighed"),
            new("stat_soejlediagram", "Søjlediagram", "statistik_og_sandsynlighed", "diagrammer")
        };
        
        return Ok(taskTypes);
    }
    
    /// <summary>
    /// Health check for the agent system
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(AgentHealthStatus), StatusCodes.Status200OK)]
    public ActionResult<AgentHealthStatus> GetHealth()
    {
        return Ok(new AgentHealthStatus
        {
            Status = "healthy",
            Agents = new[]
            {
                new AgentStatus("BrainstormAgent", true),
                new AgentStatus("FormatterAgent", true),
                new AgentStatus("ValidatorAgent", true),
                new AgentStatus("VisualizationAgent", true),
                new AgentStatus("GeminiImageGenerationAgent", true)
            }
        });
    }
}

public record TaskTypeDto(
    string Id,
    string Name,
    string Category,
    string SubCategory);

public class AgentHealthStatus
{
    public string Status { get; set; } = "unknown";
    public AgentStatus[] Agents { get; set; } = Array.Empty<AgentStatus>();
}

public record AgentStatus(string Name, bool IsAvailable);

/// <summary>
/// Full orchestration log for a terminsprøve generation
/// </summary>
public class OrchestrationLogResponse
{
    public string TerminsproveId { get; set; } = string.Empty;
    public GenerationStatus Status { get; set; }
    public GenerationMetadata Metadata { get; set; } = new();
    public List<AgentLogEntry> AgentLog { get; set; } = new();
    public int TaskCount { get; set; }
    public List<TaskSummary> TaskSummaries { get; set; } = new();
}

public class TaskSummary
{
    public string Id { get; set; } = string.Empty;
    public string TaskTypeId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string ContextPreview { get; set; } = string.Empty;
    public int SubQuestionCount { get; set; }
    public bool IsValid { get; set; }
}

