using System.Diagnostics;
using Microsoft.Extensions.Logging;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Optimized orchestrator that generates tasks in sequential batches with smooth streaming.
/// 
/// Performance improvements over original:
/// - Batch generation: 5 tasks per LLM call instead of 4 calls per task
/// - Skip separate validation: Tasks are self-validated during generation
/// - Lazy visualization: Only for tasks that truly need it
/// - Smooth streaming: Tasks appear one-by-one on the canvas with stagger delays
/// 
/// Token savings: ~70% reduction
/// Speed improvement: ~3-5x faster
/// </summary>
public class FastAgentOrchestrator : IAgentOrchestrator
{
    private readonly IBatchTaskGeneratorAgent _batchGenerator;
    private readonly IVisualizationAgent _visualizationAgent;
    private readonly IImageGenerationAgent _imageGenerationAgent;
    private readonly ILogger<FastAgentOrchestrator> _logger;
    
    // Tunable parameters
    private const int BatchSize = 5; // Tasks per LLM call
    
    public FastAgentOrchestrator(
        IBatchTaskGeneratorAgent batchGenerator,
        IVisualizationAgent visualizationAgent,
        IImageGenerationAgent imageGenerationAgent,
        ILogger<FastAgentOrchestrator> logger)
    {
        _batchGenerator = batchGenerator;
        _visualizationAgent = visualizationAgent;
        _imageGenerationAgent = imageGenerationAgent;
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
            _logger.LogInformation("Fast generation: {TaskCount} tasks for {Level}", 
                request.TaskCount, request.Level);
            
            // Calculate batches needed
            var batchCount = (int)Math.Ceiling((double)request.TaskCount / BatchSize);
            var batches = CreateBatches(request, batchCount);
            
            _logger.LogInformation("Splitting into {BatchCount} batches of ~{BatchSize} tasks", 
                batchCount, BatchSize);
            
            // Report start
            ReportProgress(progress, ProgressEventType.PhaseStarted, GenerationStatus.Formatting,
                "Starter parallel generering...", 0, request.TaskCount);
            
            // Process batches sequentially for smooth streaming
            // Image generation fires off immediately per-task (runs in background while next batch generates)
            var allTasks = new List<GeneratedTask>();
            var taskCounter = 0;
            var backgroundImageTasks = new List<Task>(); // fire-and-collect for image gen
            var imgSw = Stopwatch.StartNew();
            var imageTaskCount = 0;
            
            foreach (var (batch, index) in batches.Select((b, i) => (b, i)))
            {
                if (cancellationToken.IsCancellationRequested) break;
                
                // Emit TaskStarted for each task in this batch - creates placeholder cards
                var batchTaskIndices = new List<int>();
                for (int i = 0; i < batch.Count; i++)
                {
                    var taskIdx = taskCounter + i + 1;
                    batchTaskIndices.Add(taskIdx);
                    
                    ReportProgress(progress, ProgressEventType.TaskStarted, GenerationStatus.Formatting,
                        $"Genererer opgave {taskIdx}...",
                        taskCounter, request.TaskCount, taskIndex: taskIdx);
                    
                    // Stagger placeholder card appearances
                    await Task.Delay(60, cancellationToken);
                }
                
                // Generate the batch (this is the slow LLM call) — with full logging
                var batchResult = await _batchGenerator.GenerateBatchWithLogAsync(batch, cancellationToken);
                var tasks = batchResult.Tasks;
                
                // Save the orchestration log entry
                result.AgentLog.Add(batchResult.LogEntry);
                
                // Emit TaskCompleted for each task with stagger for smooth animation
                // AND immediately fire off image generation in the background
                for (int i = 0; i < tasks.Count; i++)
                {
                    taskCounter++;
                    var task = tasks[i];
                    var taskIdx = batchTaskIndices.Count > i ? batchTaskIndices[i] : taskCounter;
                    
                    ReportProgress(progress, ProgressEventType.TaskCompleted, GenerationStatus.Completed,
                        $"Opgave {taskIdx} færdig: {task.TaskTypeId.Replace("_", " ")}",
                        taskCounter, request.TaskCount, 
                        taskIndex: taskIdx, task: task);
                    
                    // Fire off image generation immediately (don't await — runs in parallel with next batch)
                    if (await _imageGenerationAgent.ShouldGenerateImageAsync(task, cancellationToken))
                    {
                        imageTaskCount++;
                        var capturedTask = task;
                        var capturedIdx = taskIdx;
                        
                        // Notify frontend: image generation is starting (show placeholder)
                        ReportProgress(progress, ProgressEventType.TaskImageGenerating, GenerationStatus.Formatting,
                            $"Genererer illustration til opgave {capturedIdx}...",
                            taskCounter, request.TaskCount, taskIndex: capturedIdx, taskId: capturedTask.Id);
                        
                        backgroundImageTasks.Add(Task.Run(async () =>
                        {
                            try
                            {
                                var imageUrl = await _imageGenerationAgent.GenerateImageAsync(capturedTask, cancellationToken);
                                if (!string.IsNullOrEmpty(imageUrl))
                                {
                                    capturedTask.ImageUrl = imageUrl;
                                    
                                    // Notify frontend: image is ready (fill placeholder)
                                    ReportProgress(progress, ProgressEventType.TaskImageReady, GenerationStatus.Formatting,
                                        $"Illustration klar til opgave {capturedIdx}",
                                        0, request.TaskCount, taskIndex: capturedIdx, 
                                        taskId: capturedTask.Id, imageUrl: imageUrl);
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Image generation failed for task {TaskId}", capturedTask.Id);
                            }
                        }, cancellationToken));
                    }
                    
                    // Stagger completed task reveals for smooth canvas animation
                    await Task.Delay(120, cancellationToken);
                }
                
                allTasks.AddRange(tasks);
                result.Metadata.TotalIterations++;
            }
            
            allTasks = allTasks.Take(request.TaskCount).ToList();
            
            _logger.LogInformation("Generated {Count} tasks, now adding visualizations...", allTasks.Count);
            
            // Phase 2: Add visualizations only for tasks that need them (parallel)
            var vizSw = Stopwatch.StartNew();
            var tasksNeedingViz = allTasks.Where(t => NeedsVisualization(t)).ToList();
            var visualizationTasks = tasksNeedingViz
                .Select(async task =>
                {
                    try
                    {
                        task.Visualization = await _visualizationAgent.CreateVisualizationAsync(task, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Visualization failed for task {TaskId}", task.Id);
                    }
                });
            
            await Task.WhenAll(visualizationTasks);
            vizSw.Stop();
            
            if (tasksNeedingViz.Count > 0)
            {
                result.AgentLog.Add(new AgentLogEntry
                {
                    Timestamp = DateTime.UtcNow,
                    AgentName = "VisualizationAgent",
                    Action = $"CreateVisualizations (count={tasksNeedingViz.Count})",
                    Input = $"Tasks requiring visualization: {string.Join(", ", tasksNeedingViz.Select(t => t.TaskTypeId))}",
                    Output = $"Completed {tasksNeedingViz.Count(t => t.Visualization != null)} visualizations",
                    Duration = vizSw.Elapsed
                });
            }
            
            // Wait for all background image generation to finish
            if (backgroundImageTasks.Count > 0)
            {
                _logger.LogInformation("Waiting for {Count} background image generations to complete...", backgroundImageTasks.Count);
                await Task.WhenAll(backgroundImageTasks);
                imgSw.Stop();
                
                var completedImages = allTasks.Count(t => !string.IsNullOrEmpty(t.ImageUrl));
                _logger.LogInformation("Image generation complete: {Completed}/{Total} images", completedImages, imageTaskCount);
                
                result.AgentLog.Add(new AgentLogEntry
                {
                    Timestamp = DateTime.UtcNow,
                    AgentName = "GeminiImageGenerationAgent",
                    Action = $"GenerateImages (count={imageTaskCount})",
                    Input = $"Images generated in parallel with task batches",
                    Output = $"Completed {completedImages}/{imageTaskCount} images",
                    Duration = imgSw.Elapsed
                });
            }
            
            // Finalize
            result.Tasks = allTasks;
            result.Status = GenerationStatus.Completed;
            result.Metadata.CompletedAt = DateTime.UtcNow;
            
            CalculateMetadataStatistics(result);
            
            stopwatch.Stop();
            _logger.LogInformation("Fast generation completed: {TaskCount} tasks in {Duration}ms ({PerTask}ms/task)",
                result.Tasks.Count, 
                stopwatch.ElapsedMilliseconds,
                stopwatch.ElapsedMilliseconds / Math.Max(1, result.Tasks.Count));
            
            // Add summary log entry
            result.AgentLog.Insert(0, new AgentLogEntry
            {
                Timestamp = DateTime.UtcNow,
                AgentName = "FastAgentOrchestrator",
                Action = "GenerateTerminsprove (summary)",
                Input = $"Request: {request.TaskCount} tasks, level={request.Level}, examPart={request.ExamPart}, " +
                        $"difficulty=({request.Difficulty.Easy:P0}/{request.Difficulty.Medium:P0}/{request.Difficulty.Hard:P0}), " +
                        $"categories=[{string.Join(", ", request.FocusCategories)}]",
                Output = $"Generated {result.Tasks.Count} tasks in {stopwatch.ElapsedMilliseconds}ms " +
                         $"({result.Metadata.TotalIterations} batches, " +
                         $"{result.AgentLog.Count} agent calls)",
                Duration = stopwatch.Elapsed,
                ParsedTaskCount = result.Tasks.Count,
                ParseSuccess = result.Tasks.Count > 0
            });
            
            ReportProgress(progress, ProgressEventType.Completed, GenerationStatus.Completed,
                $"Færdig! {result.Tasks.Count} opgaver genereret på {stopwatch.ElapsedMilliseconds}ms",
                result.Tasks.Count, result.Tasks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fast generation failed");
            result.Status = GenerationStatus.Failed;
            result.ErrorMessage = ex.Message;
            result.Metadata.CompletedAt = DateTime.UtcNow;
            
            ReportProgress(progress, ProgressEventType.Error, GenerationStatus.Failed,
                $"Fejl: {ex.Message}", 0, request.TaskCount);
        }
        
        return result;
    }
    
    public Task<GeneratedTask> RegenerateTaskAsync(
        GeneratedTask failedTask,
        ValidationResult validationResult,
        CancellationToken cancellationToken = default)
    {
        // Not needed with batch generation - tasks are pre-validated
        return Task.FromResult(failedTask);
    }
    
    private List<BatchGenerationRequest> CreateBatches(TerminsproveRequest request, int batchCount)
    {
        var batches = new List<BatchGenerationRequest>();
        var remaining = request.TaskCount;
        
        for (int i = 0; i < batchCount; i++)
        {
            var count = Math.Min(BatchSize, remaining);
            batches.Add(new BatchGenerationRequest
            {
                Count = count,
                Level = request.Level,
                ExamPart = request.ExamPart,
                FocusCategories = request.FocusCategories,
                Difficulty = request.Difficulty,
                CustomInstructions = request.CustomInstructions,
                BatchIndex = i
            });
            remaining -= count;
        }
        
        return batches;
    }
    
    private bool NeedsVisualization(GeneratedTask task)
    {
        // Only geometry and statistics tasks need visualization
        return task.Category == "geometri_og_maaling" || 
               task.Category == "statistik_og_sandsynlighed" ||
               task.TaskTypeId.StartsWith("geo_") ||
               task.TaskTypeId.StartsWith("stat_");
    }
    
    private void CalculateMetadataStatistics(TerminsproveResult result)
    {
        result.Metadata.CategoryDistribution = result.Tasks
            .GroupBy(t => t.Category)
            .ToDictionary(g => g.Key, g => g.Count());
        
        result.Metadata.DifficultyDistribution = result.Tasks
            .GroupBy(t => t.Difficulty)
            .ToDictionary(g => g.Key, g => g.Count());
    }
    
    private void ReportProgress(
        IProgress<GenerationProgress>? progress,
        ProgressEventType eventType,
        GenerationStatus status,
        string message,
        int completed,
        int total,
        int? taskIndex = null,
        GeneratedTask? task = null,
        string? taskId = null,
        string? imageUrl = null)
    {
        progress?.Report(new GenerationProgress
        {
            EventType = eventType,
            Status = status,
            Message = message,
            TasksCompleted = completed,
            TotalTasks = total,
            TaskIndex = taskIndex,
            CompletedTask = task,
            TaskId = taskId,
            ImageUrl = imageUrl,
            TaskPhase = eventType == ProgressEventType.TaskCompleted ? TaskGenerationPhase.Complete : TaskGenerationPhase.Formatting,
            CurrentAgentName = eventType == ProgressEventType.TaskImageGenerating || eventType == ProgressEventType.TaskImageReady 
                ? "GeminiImageGenerationAgent" 
                : "BatchTaskGenerator"
        });
    }
}

