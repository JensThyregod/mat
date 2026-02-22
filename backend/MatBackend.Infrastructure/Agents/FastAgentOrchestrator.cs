using System.Diagnostics;
using Microsoft.Extensions.Logging;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Agents;
using MatBackend.Core.Models.Curriculum;
using MatBackend.Core.Models.Terminsprove;
using MatBackend.Infrastructure.Repositories;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Orchestrator that generates each task individually in its own LLM call, run in parallel.
/// 
/// Flow: CurriculumSampler → TopicBrainstormAgent → BatchTaskGenerator (per task)
/// Each task gets a unique topic pair and brainstormed concept for maximum diversity.
/// Tasks are generated concurrently (up to MaxParallelTasks) and streamed to the frontend.
/// </summary>
public class FastAgentOrchestrator : IAgentOrchestrator
{
    private readonly IBatchTaskGeneratorAgent _batchGenerator;
    private readonly ITopicBrainstormAgent _topicBrainstormAgent;
    private readonly ICurriculumSampler _curriculumSampler;
    private readonly IVisualizationAgent _visualizationAgent;
    private readonly IImageGenerationAgent _imageGenerationAgent;
    private readonly ITerminsproveRepository _repository;
    private readonly ILogger<FastAgentOrchestrator> _logger;
    
    private const int MaxParallelTasks = 5;
    
    public FastAgentOrchestrator(
        IBatchTaskGeneratorAgent batchGenerator,
        ITopicBrainstormAgent topicBrainstormAgent,
        ICurriculumSampler curriculumSampler,
        IVisualizationAgent visualizationAgent,
        IImageGenerationAgent imageGenerationAgent,
        ITerminsproveRepository repository,
        ILogger<FastAgentOrchestrator> logger)
    {
        _batchGenerator = batchGenerator;
        _topicBrainstormAgent = topicBrainstormAgent;
        _curriculumSampler = curriculumSampler;
        _visualizationAgent = visualizationAgent;
        _imageGenerationAgent = imageGenerationAgent;
        _repository = repository;
        _logger = logger;
    }
    
    public PipelineDescriptor DescribePipeline() => new()
    {
        Name = "Fast Orchestrator",
        Description = "Parallel pipeline with curriculum-based topic sampling and per-task LLM calls.",
        Steps = new List<PipelineStep>
        {
            new()
            {
                AgentName = "CurriculumSampler",
                Description = "Sample unique topic pairs from the curriculum",
                DependsOn = new(),
            },
            new()
            {
                AgentName = "TopicBrainstormAgent",
                Description = "Brainstorm a creative task concept per topic pair",
                DependsOn = new() { "CurriculumSampler" },
                IsParallel = true,
            },
            new()
            {
                AgentName = "BatchTaskGeneratorAgent",
                Description = "Generate a complete task from each brainstormed concept",
                DependsOn = new() { "TopicBrainstormAgent" },
                IsParallel = true,
            },
            new()
            {
                AgentName = "VisualizationAgent",
                Description = "Create SVG/TikZ visualization for geometry/statistics tasks",
                DependsOn = new() { "BatchTaskGeneratorAgent" },
                IsParallel = true,
                IsOptional = true,
            },
            new()
            {
                AgentName = "ImageGenerationAgent",
                Description = "Generate illustrative image via Gemini (background)",
                DependsOn = new() { "BatchTaskGeneratorAgent" },
                IsParallel = true,
                IsOptional = true,
                IsBackground = true,
            },
        }
    };

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
        
        var imageOutputPath = _repository.GetImagesFolderPath(result);
        var terminsproveFolderName = FileTerminsproveRepository.BuildFolderName(result);
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Parallel generation: {TaskCount} individual tasks for {Level}", 
                request.TaskCount, request.Level);
            
            // Phase 0: Sample unique topic pairs and brainstorm concepts
            ReportProgress(progress, ProgressEventType.PhaseStarted, GenerationStatus.Formatting,
                "Finder kreative emnepar fra pensum...", 0, request.TaskCount);
            
            var difficulties = DistributeDifficulties(request.TaskCount, request.Difficulty);
            var topicPairs = _curriculumSampler.SampleUniqueTopicPairs(request.TaskCount);
            
            _logger.LogInformation("Sampled {Count} topic pairs, brainstorming concepts in parallel...", topicPairs.Count);
            
            // Brainstorm all concepts in parallel
            var brainstormSw = Stopwatch.StartNew();
            var conceptTasks = topicPairs.Select((pair, i) =>
                _topicBrainstormAgent.BrainstormConceptAsync(
                    pair, difficulties[i], request.ExamPart, cancellationToken)
            ).ToList();
            
            var concepts = await Task.WhenAll(conceptTasks);
            brainstormSw.Stop();
            
            _logger.LogInformation("Brainstormed {Count} concepts in {Duration}ms", 
                concepts.Length, brainstormSw.ElapsedMilliseconds);
            
            var resampledCount = concepts.Count(c => c.WasResampled);
            var totalResamples = concepts.Sum(c => c.ResampleCount);
            
            if (resampledCount > 0)
            {
                _logger.LogInformation(
                    "Brainstorm: {Resampled}/{Total} concepts needed resampling ({TotalResamples} total resamples)",
                    resampledCount, concepts.Length, totalResamples);
            }
            
            result.AgentLog.Add(new AgentLogEntry
            {
                Timestamp = DateTime.UtcNow,
                AgentName = "TopicBrainstormAgent",
                Action = $"BrainstormConcepts (count={concepts.Length})",
                Input = string.Join("\n", topicPairs.Select(p => p.ToString())),
                Output = string.Join("\n", concepts.Select(c => 
                    $"[{c.SuggestedTaskTypeId}] {c.ScenarioDescription}" +
                    (c.WasResampled ? $" (resampled {c.ResampleCount}x: {c.ResampleReason})" : ""))),
                Duration = brainstormSw.Elapsed,
                ParsedTaskCount = concepts.Length,
                ParseSuccess = concepts.All(c => !string.IsNullOrEmpty(c.ScenarioDescription))
            });
            
            // Phase 1: Generate tasks from brainstormed concepts
            ReportProgress(progress, ProgressEventType.PhaseStarted, GenerationStatus.Formatting,
                "Genererer opgaver fra kreative koncepter...", 0, request.TaskCount);
            
            // Emit TaskStarted for all tasks up front so the frontend creates placeholder cards
            for (int i = 1; i <= request.TaskCount; i++)
            {
                ReportProgress(progress, ProgressEventType.TaskStarted, GenerationStatus.Formatting,
                    $"Genererer opgave {i}...",
                    0, request.TaskCount, taskIndex: i);
                await Task.Delay(60, cancellationToken);
            }
            
            // Generate all tasks in parallel (throttled by semaphore)
            var semaphore = new SemaphoreSlim(MaxParallelTasks);
            var completedCount = 0;
            var backgroundImageTasks = new List<Task>();
            var imageTaskCount = 0;
            var imgSw = Stopwatch.StartNew();
            var lockObj = new object();
            
            var taskGenerations = Enumerable.Range(0, request.TaskCount).Select(async i =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    var taskIndex = i + 1;
                    var singleRequest = new SingleTaskGenerationRequest
                    {
                        Level = request.Level,
                        ExamPart = request.ExamPart,
                        FocusCategories = request.FocusCategories,
                        Difficulty = difficulties[i],
                        CustomInstructions = request.CustomInstructions,
                        TaskIndex = taskIndex,
                        Concept = concepts[i]
                    };
                    
                    var singleResult = await _batchGenerator.GenerateSingleTaskWithLogAsync(singleRequest, cancellationToken);
                    
                    lock (lockObj)
                    {
                        result.AgentLog.Add(singleResult.LogEntry);
                    }
                    
                    var task = singleResult.Task!;
                    var completed = Interlocked.Increment(ref completedCount);
                    
                    ReportProgress(progress, ProgressEventType.TaskCompleted, GenerationStatus.Completed,
                        $"Opgave {taskIndex} færdig: {task.TaskTypeId.Replace("_", " ")}",
                        completed, request.TaskCount,
                        taskIndex: taskIndex, task: task);
                    
                    // Fire off image generation in the background
                    if (await _imageGenerationAgent.ShouldGenerateImageAsync(task, cancellationToken))
                    {
                        Interlocked.Increment(ref imageTaskCount);
                        var capturedTask = task;
                        var capturedIdx = taskIndex;
                        
                        ReportProgress(progress, ProgressEventType.TaskImageGenerating, GenerationStatus.Formatting,
                            $"Genererer illustration til opgave {capturedIdx}...",
                            completed, request.TaskCount, taskIndex: capturedIdx, taskId: capturedTask.Id);
                        
                        var imgTask = Task.Run(async () =>
                        {
                            var imgItemSw = Stopwatch.StartNew();
                            try
                            {
                                var imageResult = await _imageGenerationAgent.GenerateImageAsync(capturedTask, imageOutputPath, cancellationToken);
                                imgItemSw.Stop();
                                
                                if (imageResult != null)
                                {
                                    var imageUrl = $"/api/terminsprover/{terminsproveFolderName}/images/{imageResult.FileName}";
                                    capturedTask.ImageUrl = imageUrl;
                                    
                                    lock (lockObj)
                                    {
                                        result.AgentLog.Add(new AgentLogEntry
                                        {
                                            Timestamp = DateTime.UtcNow,
                                            AgentName = "GeminiImageGenerationAgent",
                                            Action = $"GenerateImage (task {capturedIdx}: {capturedTask.Id})",
                                            Input = imageResult.Prompt,
                                            Output = $"Generated {imageResult.FileName}",
                                            Duration = imgItemSw.Elapsed
                                        });
                                    }
                                    
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
                        }, cancellationToken);
                        
                        lock (lockObj)
                        {
                            backgroundImageTasks.Add(imgTask);
                        }
                    }
                    
                    return task;
                }
                finally
                {
                    semaphore.Release();
                }
            }).ToList();
            
            var allTasks = (await Task.WhenAll(taskGenerations)).ToList();
            result.Metadata.TotalIterations = request.TaskCount;
            
            _logger.LogInformation("Generated {Count} tasks, now adding visualizations...", allTasks.Count);
            
            // Phase 2: Add visualizations for tasks that need them (parallel)
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
            List<Task> imageTasks;
            lock (lockObj)
            {
                imageTasks = backgroundImageTasks.ToList();
            }
            
            if (imageTasks.Count > 0)
            {
                _logger.LogInformation("Waiting for {Count} background image generations to complete...", imageTasks.Count);
                await Task.WhenAll(imageTasks);
                imgSw.Stop();
                
                var completedImages = allTasks.Count(t => !string.IsNullOrEmpty(t.ImageUrl));
                _logger.LogInformation("Image generation complete: {Completed}/{Total} images", completedImages, imageTaskCount);
                
                result.AgentLog.Add(new AgentLogEntry
                {
                    Timestamp = DateTime.UtcNow,
                    AgentName = "GeminiImageGenerationAgent",
                    Action = $"GenerateImages (count={imageTaskCount})",
                    Input = $"Images generated in parallel with tasks",
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
            _logger.LogInformation("Parallel generation completed: {TaskCount} tasks in {Duration}ms ({PerTask}ms/task)",
                result.Tasks.Count, 
                stopwatch.ElapsedMilliseconds,
                stopwatch.ElapsedMilliseconds / Math.Max(1, result.Tasks.Count));
            
            result.AgentLog.Insert(0, new AgentLogEntry
            {
                Timestamp = DateTime.UtcNow,
                AgentName = "FastAgentOrchestrator",
                Action = "GenerateTerminsprove (summary)",
                Input = $"Request: {request.TaskCount} tasks, level={request.Level}, examPart={request.ExamPart}, " +
                        $"difficulty=({request.Difficulty.Easy:P0}/{request.Difficulty.Medium:P0}/{request.Difficulty.Hard:P0}), " +
                        $"categories=[{string.Join(", ", request.FocusCategories)}]",
                Output = $"Generated {result.Tasks.Count} tasks in {stopwatch.ElapsedMilliseconds}ms " +
                         $"({request.TaskCount} parallel LLM calls, " +
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
            _logger.LogError(ex, "Parallel generation failed");
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
        return Task.FromResult(failedTask);
    }
    
    /// <summary>
    /// Distribute difficulty levels across tasks based on the requested percentages.
    /// </summary>
    private static List<string> DistributeDifficulties(int taskCount, DifficultyDistribution dist)
    {
        var easyCount = (int)Math.Round(taskCount * dist.Easy);
        var hardCount = (int)Math.Round(taskCount * dist.Hard);
        var mediumCount = taskCount - easyCount - hardCount;
        
        var difficulties = new List<string>();
        for (int i = 0; i < easyCount; i++) difficulties.Add("let");
        for (int i = 0; i < mediumCount; i++) difficulties.Add("middel");
        for (int i = 0; i < hardCount; i++) difficulties.Add("svær");
        
        // Shuffle so difficulties are interleaved, not grouped
        var rng = new Random();
        for (int i = difficulties.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (difficulties[i], difficulties[j]) = (difficulties[j], difficulties[i]);
        }
        
        return difficulties;
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

