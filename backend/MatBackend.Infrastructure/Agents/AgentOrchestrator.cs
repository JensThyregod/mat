using System.Diagnostics;
using Microsoft.Extensions.Logging;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Orchestrates the multi-agent pipeline for terminsprøve generation
/// Using AutoGen-style agent coordination patterns
/// </summary>
public class AgentOrchestrator : IAgentOrchestrator
{
    private readonly IBrainstormAgent _brainstormAgent;
    private readonly IFormatterAgent _formatterAgent;
    private readonly IValidatorAgent _validatorAgent;
    private readonly IVisualizationAgent _visualizationAgent;
    private readonly IImageGenerationAgent _imageGenerationAgent;
    private readonly ITaskRepository _taskRepository;
    private readonly ILogger<AgentOrchestrator> _logger;
    private readonly AgentConfiguration _configuration;
    
    private const int MaxValidationRetries = 3;
    
    public AgentOrchestrator(
        IBrainstormAgent brainstormAgent,
        IFormatterAgent formatterAgent,
        IValidatorAgent validatorAgent,
        IVisualizationAgent visualizationAgent,
        IImageGenerationAgent imageGenerationAgent,
        ITaskRepository taskRepository,
        AgentConfiguration configuration,
        ILogger<AgentOrchestrator> logger)
    {
        _brainstormAgent = brainstormAgent;
        _formatterAgent = formatterAgent;
        _validatorAgent = validatorAgent;
        _visualizationAgent = visualizationAgent;
        _imageGenerationAgent = imageGenerationAgent;
        _taskRepository = taskRepository;
        _configuration = configuration;
        _logger = logger;
    }
    
    public async Task<TerminsproveResult> GenerateTerminsproveAsync(
        TerminsproveRequest request,
        IProgress<GenerationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var result = new TerminsproveResult
        {
            Request = request,
            Metadata = new GenerationMetadata { StartedAt = DateTime.UtcNow }
        };
        
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Starting terminsprøve generation: {TaskCount} tasks for {Level}",
                request.TaskCount, request.Level);
            
            // Phase 1: Brainstorming
            result.Status = GenerationStatus.Brainstorming;
            ReportProgress(progress, result.Status, "Brainstormer opgaveidéer...", 0, request.TaskCount);
            
            var availableTaskTypes = await GetAvailableTaskTypesAsync();
            var taskIdeas = await ExecuteWithLogging(
                () => _brainstormAgent.BrainstormTasksAsync(request, availableTaskTypes, cancellationToken),
                _brainstormAgent.Name,
                result);
            
            _logger.LogInformation("Generated {Count} task ideas", taskIdeas.Count);
            
            // Phase 2-4: Process each task through the full pipeline and emit events
            result.Status = GenerationStatus.Formatting;
            ReportPhaseStarted(progress, GenerationStatus.Formatting, "Starter formatering af opgaver...", taskIdeas.Count);
            
            var completedTasks = new List<GeneratedTask>();
            var taskNumber = 0;
            
            foreach (var idea in taskIdeas)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;
                
                taskNumber++;
                
                try
                {
                    // Report task started
                    ReportTaskEvent(progress, ProgressEventType.TaskStarted, 
                        $"Starter opgave {taskNumber}...", taskNumber, taskIdeas.Count, 
                        TaskGenerationPhase.Formatting);
                    
                    // Format task
                    var task = await ExecuteWithLogging(
                        () => _formatterAgent.FormatTaskAsync(idea, cancellationToken),
                        _formatterAgent.Name,
                        result);
                    
                    ReportTaskEvent(progress, ProgressEventType.TaskFormatted,
                        $"Opgave {taskNumber} formateret", taskNumber, taskIdeas.Count,
                        TaskGenerationPhase.Validating, task);
                    
                    // Validate task
                    var validatedTask = await ValidateWithRetryAsync(task, result, cancellationToken);
                    
                    ReportTaskEvent(progress, ProgressEventType.TaskValidated,
                        $"Opgave {taskNumber} valideret", taskNumber, taskIdeas.Count,
                        TaskGenerationPhase.Visualizing, validatedTask);
                    
                    // Visualize task
                    var visualization = await ExecuteWithLogging(
                        () => _visualizationAgent.CreateVisualizationAsync(validatedTask, cancellationToken),
                        _visualizationAgent.Name,
                        result);
                    
                    validatedTask.Visualization = visualization;
                    
                    // Generate illustration image if applicable
                    if (await _imageGenerationAgent.ShouldGenerateImageAsync(validatedTask, cancellationToken))
                    {
                        try
                        {
                            var imageUrl = await _imageGenerationAgent.GenerateImageAsync(validatedTask, cancellationToken);
                            if (!string.IsNullOrEmpty(imageUrl))
                            {
                                validatedTask.ImageUrl = imageUrl;
                            }
                        }
                        catch (Exception imgEx)
                        {
                            _logger.LogWarning(imgEx, "Image generation failed for task {TaskId}", validatedTask.Id);
                        }
                    }
                    
                    // Task is fully complete - emit with full task data
                    ReportTaskCompleted(progress, validatedTask, taskNumber, taskIdeas.Count);
                    
                    completedTasks.Add(validatedTask);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process task {TaskNumber}", taskNumber);
                    ReportTaskEvent(progress, ProgressEventType.TaskFailed,
                        $"Opgave {taskNumber} fejlede: {ex.Message}", taskNumber, taskIdeas.Count,
                        TaskGenerationPhase.Complete);
                }
            }
            
            var validatedTasks = completedTasks;
            
            // Finalize
            result.Tasks = validatedTasks;
            result.Status = GenerationStatus.Completed;
            result.Metadata.CompletedAt = DateTime.UtcNow;
            
            // Calculate statistics
            CalculateMetadataStatistics(result);
            
            _logger.LogInformation("Terminsprøve generation completed: {ValidTasks}/{TotalTasks} valid tasks in {Duration}ms",
                result.Tasks.Count(t => t.Validation.IsValid),
                result.Tasks.Count,
                stopwatch.ElapsedMilliseconds);
            
            ReportProgress(progress, result.Status, "Generering afsluttet!", result.Tasks.Count, result.Tasks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Terminsprøve generation failed");
            result.Status = GenerationStatus.Failed;
            result.ErrorMessage = ex.Message;
            result.Metadata.CompletedAt = DateTime.UtcNow;
        }
        
        return result;
    }
    
    public async Task<GeneratedTask> RegenerateTaskAsync(
        GeneratedTask failedTask,
        ValidationResult validationResult,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Regenerating task {TaskId} due to validation failure", failedTask.Id);
        
        // Create a new idea based on the failed task
        var idea = new TaskIdea
        {
            TaskTypeId = failedTask.TaskTypeId,
            Category = failedTask.Category,
            Difficulty = failedTask.Difficulty,
            QuestionConcept = $"Regenereret: {failedTask.QuestionText}",
            SuggestedVariables = failedTask.Variables,
            RequiresVisualization = failedTask.Visualization != null,
            Rationale = $"Regenereret pga: {string.Join(", ", validationResult.Issues)}"
        };
        
        var newTask = await _formatterAgent.FormatTaskAsync(idea, cancellationToken);
        newTask.Validation = await _validatorAgent.ValidateTaskAsync(newTask, cancellationToken);
        
        if (await _visualizationAgent.NeedsVisualizationAsync(newTask, cancellationToken))
        {
            newTask.Visualization = await _visualizationAgent.CreateVisualizationAsync(newTask, cancellationToken);
        }
        
        return newTask;
    }
    
    private async Task<GeneratedTask> ValidateWithRetryAsync(
        GeneratedTask task,
        TerminsproveResult result,
        CancellationToken cancellationToken)
    {
        var currentTask = task;
        
        for (int attempt = 0; attempt < MaxValidationRetries; attempt++)
        {
            var validation = await ExecuteWithLogging(
                () => _validatorAgent.ValidateTaskAsync(currentTask, cancellationToken),
                _validatorAgent.Name,
                result);
            
            currentTask.Validation = validation;
            
            if (validation.IsValid && validation.IsSolvable && validation.HasCorrectAnswer)
            {
                _logger.LogDebug("Task {TaskId} validated successfully on attempt {Attempt}", 
                    currentTask.Id, attempt + 1);
                return currentTask;
            }
            
            if (attempt < MaxValidationRetries - 1)
            {
                _logger.LogWarning("Task {TaskId} failed validation (attempt {Attempt}): {Issues}",
                    currentTask.Id, attempt + 1, string.Join(", ", validation.Issues));
                
                result.Metadata.RegeneratedTaskCount++;
                currentTask = await RegenerateTaskAsync(currentTask, validation, cancellationToken);
            }
        }
        
        _logger.LogWarning("Task {TaskId} could not be validated after {MaxRetries} attempts",
            currentTask.Id, MaxValidationRetries);
        
        return currentTask;
    }
    
    private async Task<T> ExecuteWithLogging<T>(
        Func<Task<T>> action,
        string agentName,
        TerminsproveResult result)
    {
        var stopwatch = Stopwatch.StartNew();
        var entry = new AgentLogEntry
        {
            Timestamp = DateTime.UtcNow,
            AgentName = agentName,
            Action = "Execute"
        };
        
        try
        {
            var output = await action();
            stopwatch.Stop();
            
            entry.Duration = stopwatch.Elapsed;
            result.AgentLog.Add(entry);
            result.Metadata.TotalIterations++;
            
            return output;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            entry.Duration = stopwatch.Elapsed;
            entry.Output = $"Error: {ex.Message}";
            result.AgentLog.Add(entry);
            throw;
        }
    }
    
    private async Task<IEnumerable<string>> GetAvailableTaskTypesAsync()
    {
        try
        {
            var taskTypes = await _taskRepository.GetTaskTypesAsync();
            return taskTypes.Select(t => t.Id);
        }
        catch
        {
            // Fallback to known task types
            return new[]
            {
                "tal_ligninger", "tal_broeker_og_antal", "tal_regnearter",
                "tal_pris_rabat_procent", "tal_forholdstalsregning",
                "geo_sammensat_figur", "geo_vinkelsum", "geo_projektioner", "geo_enhedsomregning",
                "stat_boksplot", "stat_sandsynlighed", "stat_soejlediagram"
            };
        }
    }
    
    private void CalculateMetadataStatistics(TerminsproveResult result)
    {
        // Category distribution
        result.Metadata.CategoryDistribution = result.Tasks
            .GroupBy(t => t.Category)
            .ToDictionary(g => g.Key, g => g.Count());
        
        // Difficulty distribution
        result.Metadata.DifficultyDistribution = result.Tasks
            .GroupBy(t => t.Difficulty)
            .ToDictionary(g => g.Key, g => g.Count());
    }
    
    private void ReportProgress(
        IProgress<GenerationProgress>? progress,
        GenerationStatus status,
        string message,
        int completed,
        int total)
    {
        progress?.Report(new GenerationProgress
        {
            Status = status,
            Message = message,
            TasksCompleted = completed,
            TotalTasks = total,
            EventType = ProgressEventType.Progress
        });
    }
    
    private void ReportPhaseStarted(
        IProgress<GenerationProgress>? progress,
        GenerationStatus status,
        string message,
        int totalTasks)
    {
        progress?.Report(new GenerationProgress
        {
            Status = status,
            Message = message,
            TasksCompleted = 0,
            TotalTasks = totalTasks,
            EventType = ProgressEventType.PhaseStarted,
            CurrentAgentName = status switch
            {
                GenerationStatus.Brainstorming => "BrainstormAgent",
                GenerationStatus.Formatting => "FormatterAgent",
                GenerationStatus.Validating => "ValidatorAgent",
                GenerationStatus.Visualizing => "VisualizationAgent",
                _ => null
            }
        });
    }
    
    private void ReportTaskEvent(
        IProgress<GenerationProgress>? progress,
        ProgressEventType eventType,
        string message,
        int taskIndex,
        int totalTasks,
        TaskGenerationPhase phase,
        GeneratedTask? task = null)
    {
        progress?.Report(new GenerationProgress
        {
            Status = phase switch
            {
                TaskGenerationPhase.Formatting => GenerationStatus.Formatting,
                TaskGenerationPhase.Validating => GenerationStatus.Validating,
                TaskGenerationPhase.Visualizing => GenerationStatus.Visualizing,
                _ => GenerationStatus.Completed
            },
            Message = message,
            TasksCompleted = eventType == ProgressEventType.TaskCompleted ? taskIndex : taskIndex - 1,
            TotalTasks = totalTasks,
            EventType = eventType,
            TaskIndex = taskIndex,
            TaskPhase = phase,
            CompletedTask = task,
            CurrentAgentName = phase switch
            {
                TaskGenerationPhase.Formatting => "FormatterAgent",
                TaskGenerationPhase.Validating => "ValidatorAgent",
                TaskGenerationPhase.Visualizing => "VisualizationAgent",
                _ => null
            }
        });
    }
    
    private void ReportTaskCompleted(
        IProgress<GenerationProgress>? progress,
        GeneratedTask task,
        int taskIndex,
        int totalTasks)
    {
        progress?.Report(new GenerationProgress
        {
            Status = GenerationStatus.Completed,
            Message = $"Opgave {taskIndex} er klar!",
            TasksCompleted = taskIndex,
            TotalTasks = totalTasks,
            EventType = ProgressEventType.TaskCompleted,
            TaskIndex = taskIndex,
            TaskPhase = TaskGenerationPhase.Complete,
            CompletedTask = task,
            CurrentAgentName = null
        });
    }
}

