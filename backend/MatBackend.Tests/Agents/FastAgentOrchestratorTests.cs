using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;
using MatBackend.Infrastructure.Agents;

namespace MatBackend.Tests.Agents;

/// <summary>
/// Tests for the FastAgentOrchestrator.
/// Covers: batch generation, progress reporting, image generation integration,
/// visualization, error handling, and the streaming protocol.
/// </summary>
public class FastAgentOrchestratorTests
{
    private readonly Mock<IBatchTaskGeneratorAgent> _batchGeneratorMock;
    private readonly Mock<IVisualizationAgent> _visualizationAgentMock;
    private readonly Mock<IImageGenerationAgent> _imageGenerationAgentMock;
    private readonly Mock<ILogger<FastAgentOrchestrator>> _loggerMock;

    public FastAgentOrchestratorTests()
    {
        _batchGeneratorMock = new Mock<IBatchTaskGeneratorAgent>();
        _visualizationAgentMock = new Mock<IVisualizationAgent>();
        _imageGenerationAgentMock = new Mock<IImageGenerationAgent>();
        _loggerMock = new Mock<ILogger<FastAgentOrchestrator>>();

        // Default: image generation disabled
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Default: no visualization needed
        _visualizationAgentMock
            .Setup(x => x.CreateVisualizationAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskVisualization?)null);

        _batchGeneratorMock.SetupGet(x => x.Name).Returns("BatchTaskGenerator");
        _imageGenerationAgentMock.SetupGet(x => x.Name).Returns("GeminiImageGenerationAgent");
        _visualizationAgentMock.SetupGet(x => x.Name).Returns("VisualizationAgent");
    }

    private FastAgentOrchestrator CreateOrchestrator()
    {
        return new FastAgentOrchestrator(
            _batchGeneratorMock.Object,
            _visualizationAgentMock.Object,
            _imageGenerationAgentMock.Object,
            _loggerMock.Object);
    }

    private static TerminsproveRequest CreateRequest(int taskCount = 5)
    {
        return new TerminsproveRequest
        {
            TaskCount = taskCount,
            Level = "fp9",
            ExamPart = "uden_hjaelpemidler",
            Difficulty = new DifficultyDistribution { Easy = 0.3, Medium = 0.5, Hard = 0.2 }
        };
    }

    private static List<GeneratedTask> CreateTasks(int count)
    {
        return Enumerable.Range(1, count).Select(i => new GeneratedTask
        {
            Id = Guid.NewGuid().ToString(),
            TaskTypeId = "tal_regnearter",
            Category = "tal_og_algebra",
            Difficulty = "let",
            ContextText = $"Test opgave {i}",
            SubQuestions = new List<SubQuestion>
            {
                new SubQuestion
                {
                    Label = "a",
                    QuestionText = $"Hvad er {i} + {i}?",
                    Answer = new TaskAnswer { Value = $"{i * 2}", Unit = "" },
                    Points = 1
                }
            },
            Points = 1,
            EstimatedTimeSeconds = 60
        }).ToList();
    }

    private void SetupBatchGenerator(int batchSize)
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((BatchGenerationRequest req, CancellationToken _) =>
            {
                var tasks = CreateTasks(req.Count);
                return new BatchGenerationResult
                {
                    Tasks = tasks,
                    LogEntry = new AgentLogEntry
                    {
                        AgentName = "BatchTaskGenerator",
                        Action = $"GenerateBatch (count={req.Count})",
                        Duration = TimeSpan.FromMilliseconds(500)
                    }
                };
            });
    }

    #region Basic Generation Tests

    [Fact]
    public async Task GenerateTerminsprove_GeneratesRequestedNumberOfTasks()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().HaveCount(5);
        result.Status.Should().Be(GenerationStatus.Completed);
    }

    [Fact]
    public async Task GenerateTerminsprove_GeneratesMultipleBatches()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 10);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().HaveCount(10);
        _batchGeneratorMock.Verify(
            x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2)); // 10 tasks / 5 per batch = 2 batches
    }

    [Fact]
    public async Task GenerateTerminsprove_SetsMetadata()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Metadata.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.Metadata.CompletedAt.Should().NotBeNull();
        result.Metadata.TotalIterations.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GenerateTerminsprove_SetsRequestOnResult()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Request.Should().BeSameAs(request);
    }

    [Fact]
    public async Task GenerateTerminsprove_CalculatesCategoryDistribution()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Metadata.CategoryDistribution.Should().ContainKey("tal_og_algebra");
    }

    [Fact]
    public async Task GenerateTerminsprove_CalculatesDifficultyDistribution()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Metadata.DifficultyDistribution.Should().ContainKey("let");
    }

    #endregion

    #region Progress Reporting Tests

    [Fact]
    public async Task GenerateTerminsprove_ReportsProgressEvents()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        var result = await orchestrator.GenerateTerminsproveAsync(request, progress);

        // Wait a bit for progress events to be processed (Progress<T> uses SynchronizationContext)
        await Task.Delay(200);

        progressEvents.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateTerminsprove_ReportsPhaseStarted()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        progressEvents.Should().Contain(p => p.EventType == ProgressEventType.PhaseStarted);
    }

    [Fact]
    public async Task GenerateTerminsprove_ReportsTaskStarted()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        progressEvents.Should().Contain(p => p.EventType == ProgressEventType.TaskStarted);
    }

    [Fact]
    public async Task GenerateTerminsprove_ReportsTaskCompleted()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        var completedEvents = progressEvents.Where(p => p.EventType == ProgressEventType.TaskCompleted).ToList();
        completedEvents.Should().HaveCount(5);
    }

    [Fact]
    public async Task GenerateTerminsprove_ReportsCompletedEvent()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        progressEvents.Should().Contain(p => p.EventType == ProgressEventType.Completed);
    }

    [Fact]
    public async Task GenerateTerminsprove_TaskCompletedIncludesTask()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        var completedEvents = progressEvents.Where(p => p.EventType == ProgressEventType.TaskCompleted).ToList();
        completedEvents.Should().AllSatisfy(e => e.CompletedTask.Should().NotBeNull());
    }

    #endregion

    #region Image Generation Integration Tests

    [Fact]
    public async Task GenerateTerminsprove_WhenImageEnabled_CallsShouldGenerate()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        await orchestrator.GenerateTerminsproveAsync(request);

        _imageGenerationAgentMock.Verify(
            x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()),
            Times.Exactly(5));
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageNeeded_CallsGenerateImage()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        _imageGenerationAgentMock.Verify(
            x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()),
            Times.Exactly(5));
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageGenerated_SetsImageUrlOnTask()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().AllSatisfy(t => t.ImageUrl.Should().Be("/api/images/test.png"));
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageFails_DoesNotCrash()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Image generation failed"));

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Status.Should().Be(GenerationStatus.Completed);
        result.Tasks.Should().HaveCount(5);
        result.Tasks.Should().AllSatisfy(t => t.ImageUrl.Should().BeNull());
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageReturnsNull_TaskHasNoImageUrl()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().AllSatisfy(t => t.ImageUrl.Should().BeNull());
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageNeeded_ReportsImageGeneratingEvent()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(500); // Wait for background tasks

        progressEvents.Should().Contain(p => p.EventType == ProgressEventType.TaskImageGenerating);
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageReady_ReportsImageReadyEvent()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(500); // Wait for background tasks

        var imageReadyEvents = progressEvents.Where(p => p.EventType == ProgressEventType.TaskImageReady).ToList();
        imageReadyEvents.Should().HaveCountGreaterThan(0);
        imageReadyEvents.Should().AllSatisfy(e =>
        {
            e.ImageUrl.Should().Be("/api/images/test.png");
            e.TaskId.Should().NotBeNullOrEmpty();
        });
    }

    [Fact]
    public async Task GenerateTerminsprove_ImageGeneratingEventHasTaskId()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(500);

        var imageGenEvents = progressEvents.Where(p => p.EventType == ProgressEventType.TaskImageGenerating).ToList();
        imageGenEvents.Should().AllSatisfy(e => e.TaskId.Should().NotBeNullOrEmpty());
    }

    [Fact]
    public async Task GenerateTerminsprove_OnlySelectiveTasksGetImages()
    {
        SetupBatchGenerator(5);
        var callCount = 0;
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                callCount++;
                return callCount % 2 == 0; // Only even tasks get images
            });
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        var tasksWithImages = result.Tasks.Count(t => !string.IsNullOrEmpty(t.ImageUrl));
        var tasksWithoutImages = result.Tasks.Count(t => string.IsNullOrEmpty(t.ImageUrl));
        tasksWithImages.Should().BeGreaterThan(0);
        tasksWithoutImages.Should().BeGreaterThan(0);
    }

    #endregion

    #region Visualization Tests

    [Fact]
    public async Task GenerateTerminsprove_GeometryTasks_GetVisualization()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((BatchGenerationRequest req, CancellationToken _) =>
            {
                var tasks = new List<GeneratedTask>
                {
                    new GeneratedTask
                    {
                        Id = Guid.NewGuid().ToString(),
                        TaskTypeId = "geo_sammensat_figur",
                        Category = "geometri_og_maaling",
                        ContextText = "Geometry task",
                        SubQuestions = new List<SubQuestion>()
                    }
                };
                return new BatchGenerationResult
                {
                    Tasks = tasks,
                    LogEntry = new AgentLogEntry { AgentName = "BatchTaskGenerator" }
                };
            });

        _visualizationAgentMock
            .Setup(x => x.CreateVisualizationAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskVisualization { Type = "svg", SvgContent = "<svg></svg>" });

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 1);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        _visualizationAgentMock.Verify(
            x => x.CreateVisualizationAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GenerateTerminsprove_AlgebraTasks_SkipVisualization()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        await orchestrator.GenerateTerminsproveAsync(request);

        _visualizationAgentMock.Verify(
            x => x.CreateVisualizationAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task GenerateTerminsprove_WhenBatchGeneratorThrows_ReturnsFailedResult()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("LLM API error"));

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Status.Should().Be(GenerationStatus.Failed);
        result.ErrorMessage.Should().Contain("LLM API error");
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenBatchGeneratorThrows_ReportsErrorEvent()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("LLM API error"));

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        progressEvents.Should().Contain(p => p.EventType == ProgressEventType.Error);
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenVisualizationFails_DoesNotCrash()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((BatchGenerationRequest req, CancellationToken _) =>
            {
                var tasks = new List<GeneratedTask>
                {
                    new GeneratedTask
                    {
                        Id = Guid.NewGuid().ToString(),
                        TaskTypeId = "geo_sammensat_figur",
                        Category = "geometri_og_maaling",
                        ContextText = "Geometry task",
                        SubQuestions = new List<SubQuestion>()
                    }
                };
                return new BatchGenerationResult
                {
                    Tasks = tasks,
                    LogEntry = new AgentLogEntry { AgentName = "BatchTaskGenerator" }
                };
            });

        _visualizationAgentMock
            .Setup(x => x.CreateVisualizationAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Visualization failed"));

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 1);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Status.Should().Be(GenerationStatus.Completed);
        result.Tasks.Should().HaveCount(1);
    }

    [Fact]
    public async Task GenerateTerminsprove_WithCancellation_StopsEarly()
    {
        var cts = new CancellationTokenSource();
        var callCount = 0;

        _batchGeneratorMock
            .Setup(x => x.GenerateBatchWithLogAsync(It.IsAny<BatchGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((BatchGenerationRequest req, CancellationToken ct) =>
            {
                callCount++;
                if (callCount > 1)
                    cts.Cancel();
                return new BatchGenerationResult
                {
                    Tasks = CreateTasks(req.Count),
                    LogEntry = new AgentLogEntry { AgentName = "BatchTaskGenerator" }
                };
            });

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 20); // Would need 4 batches

        var result = await orchestrator.GenerateTerminsproveAsync(request, cancellationToken: cts.Token);

        // Should have completed at least the first batch but not all 4
        result.Tasks.Count.Should().BeLessThan(20);
    }

    #endregion

    #region Agent Log Tests

    [Fact]
    public async Task GenerateTerminsprove_IncludesAgentLog()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateTerminsprove_AgentLogIncludesSummary()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().Contain(e => e.AgentName == "FastAgentOrchestrator");
    }

    [Fact]
    public async Task GenerateTerminsprove_AgentLogIncludesBatchEntries()
    {
        SetupBatchGenerator(5);
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().Contain(e => e.AgentName == "BatchTaskGenerator");
    }

    [Fact]
    public async Task GenerateTerminsprove_WithImages_AgentLogIncludesImageEntry()
    {
        SetupBatchGenerator(5);
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/api/images/test.png");

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().Contain(e => e.AgentName == "GeminiImageGenerationAgent");
    }

    #endregion

    #region RegenerateTask Tests

    [Fact]
    public async Task RegenerateTask_ReturnsOriginalTask()
    {
        var orchestrator = CreateOrchestrator();
        var task = CreateTasks(1).First();
        var validation = new ValidationResult { IsValid = false, Issues = new List<string> { "Bad" } };

        var result = await orchestrator.RegenerateTaskAsync(task, validation);

        result.Should().BeSameAs(task);
    }

    #endregion
}

