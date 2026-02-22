using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Curriculum;
using MatBackend.Core.Models.Terminsprove;
using MatBackend.Infrastructure.Agents;

// Alias to avoid ambiguity with Xunit's Task
using ImageGenResult = MatBackend.Core.Interfaces.Agents.ImageGenerationResult;

namespace MatBackend.Tests.Agents;

/// <summary>
/// Tests for the FastAgentOrchestrator.
/// Covers: parallel individual task generation, progress reporting, image generation integration,
/// visualization, error handling, and the streaming protocol.
/// </summary>
public class FastAgentOrchestratorTests
{
    private readonly Mock<IBatchTaskGeneratorAgent> _batchGeneratorMock;
    private readonly Mock<ITopicBrainstormAgent> _topicBrainstormAgentMock;
    private readonly Mock<ICurriculumSampler> _curriculumSamplerMock;
    private readonly Mock<IVisualizationAgent> _visualizationAgentMock;
    private readonly Mock<IImageGenerationAgent> _imageGenerationAgentMock;
    private readonly Mock<ITerminsproveRepository> _repositoryMock;
    private readonly Mock<ILogger<FastAgentOrchestrator>> _loggerMock;

    public FastAgentOrchestratorTests()
    {
        _batchGeneratorMock = new Mock<IBatchTaskGeneratorAgent>();
        _topicBrainstormAgentMock = new Mock<ITopicBrainstormAgent>();
        _curriculumSamplerMock = new Mock<ICurriculumSampler>();
        _visualizationAgentMock = new Mock<IVisualizationAgent>();
        _imageGenerationAgentMock = new Mock<IImageGenerationAgent>();
        _repositoryMock = new Mock<ITerminsproveRepository>();
        _loggerMock = new Mock<ILogger<FastAgentOrchestrator>>();

        _repositoryMock
            .Setup(x => x.GetImagesFolderPath(It.IsAny<TerminsproveResult>()))
            .Returns((TerminsproveResult r) => Path.Combine(Path.GetTempPath(), "mat-test", r.Id, "images"));

        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _visualizationAgentMock
            .Setup(x => x.CreateVisualizationAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskVisualization?)null);

        _batchGeneratorMock.SetupGet(x => x.Name).Returns("BatchTaskGenerator");
        _imageGenerationAgentMock.SetupGet(x => x.Name).Returns("GeminiImageGenerationAgent");
        _visualizationAgentMock.SetupGet(x => x.Name).Returns("VisualizationAgent");
        _topicBrainstormAgentMock.SetupGet(x => x.Name).Returns("TopicBrainstormAgent");

        // Default curriculum sampler: returns unique topic pairs
        _curriculumSamplerMock
            .Setup(x => x.SampleUniqueTopicPairs(It.IsAny<int>()))
            .Returns((int count) => Enumerable.Range(0, count).Select(i => CreateTopicPair(i)).ToList());

        // Default brainstorm agent: returns a concept for any pair
        _topicBrainstormAgentMock
            .Setup(x => x.BrainstormConceptAsync(It.IsAny<TopicPair>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TopicPair pair, string diff, string exam, CancellationToken _) => new TaskConcept
            {
                TopicPair = pair,
                ScenarioDescription = $"Test scenario for {pair.Topic1.Name} + {pair.Topic2.Name}",
                MathematicalConnection = "Test connection",
                SuggestedTaskTypeId = "tal_regnearter",
                PrimaryCategory = "tal_og_algebra"
            });
    }

    private static TopicPair CreateTopicPair(int index)
    {
        return new TopicPair
        {
            Topic1 = new CurriculumTopic
            {
                Id = $"topic_a_{index}",
                Name = $"Topic A {index}",
                CategoryId = "tal_og_algebra",
                CategoryName = "Tal og algebra",
                SubcategoryId = "talforståelse",
                SubcategoryName = "Talforståelse"
            },
            Topic2 = new CurriculumTopic
            {
                Id = $"topic_b_{index}",
                Name = $"Topic B {index}",
                CategoryId = "geometri_og_maaling",
                CategoryName = "Geometri og måling",
                SubcategoryId = "figurer_og_legemer",
                SubcategoryName = "Figurer og legemer"
            }
        };
    }

    private FastAgentOrchestrator CreateOrchestrator()
    {
        return new FastAgentOrchestrator(
            _batchGeneratorMock.Object,
            _topicBrainstormAgentMock.Object,
            _curriculumSamplerMock.Object,
            _visualizationAgentMock.Object,
            _imageGenerationAgentMock.Object,
            _repositoryMock.Object,
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

    private static GeneratedTask CreateSingleTask(int index)
    {
        return new GeneratedTask
        {
            Id = Guid.NewGuid().ToString(),
            TaskTypeId = "tal_regnearter",
            Category = "tal_og_algebra",
            Difficulty = "let",
            ContextText = $"Test opgave {index}",
            SubQuestions = new List<SubQuestion>
            {
                new SubQuestion
                {
                    Label = "a",
                    QuestionText = $"Hvad er {index} + {index}?",
                    Answer = new TaskAnswer { Value = $"{index * 2}", Unit = "" },
                    Points = 1
                }
            },
            Points = 1,
            EstimatedTimeSeconds = 60
        };
    }

    private void SetupSingleTaskGenerator()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateSingleTaskWithLogAsync(It.IsAny<SingleTaskGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SingleTaskGenerationRequest req, CancellationToken _) =>
            {
                var task = CreateSingleTask(req.TaskIndex);
                task.Difficulty = req.Difficulty;
                return new SingleTaskGenerationResult
                {
                    Task = task,
                    LogEntry = new AgentLogEntry
                    {
                        AgentName = "BatchTaskGenerator",
                        Action = $"GenerateSingleTask (index={req.TaskIndex})",
                        Duration = TimeSpan.FromMilliseconds(500)
                    }
                };
            });
    }

    #region Basic Generation Tests

    [Fact]
    public async Task GenerateTerminsprove_GeneratesRequestedNumberOfTasks()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().HaveCount(5);
        result.Status.Should().Be(GenerationStatus.Completed);
    }

    [Fact]
    public async Task GenerateTerminsprove_CallsGenerateSingleTaskForEachTask()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 10);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().HaveCount(10);
        _batchGeneratorMock.Verify(
            x => x.GenerateSingleTaskWithLogAsync(It.IsAny<SingleTaskGenerationRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(10));
    }

    [Fact]
    public async Task GenerateTerminsprove_SetsMetadata()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Metadata.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.Metadata.CompletedAt.Should().NotBeNull();
        result.Metadata.TotalIterations.Should().Be(5);
    }

    [Fact]
    public async Task GenerateTerminsprove_SetsRequestOnResult()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Request.Should().BeSameAs(request);
    }

    [Fact]
    public async Task GenerateTerminsprove_CalculatesCategoryDistribution()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Metadata.CategoryDistribution.Should().ContainKey("tal_og_algebra");
    }

    [Fact]
    public async Task GenerateTerminsprove_CalculatesDifficultyDistribution()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Metadata.DifficultyDistribution.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateTerminsprove_DistributesDifficultiesAcrossTasks()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 10);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        var difficulties = result.Tasks.Select(t => t.Difficulty).ToList();
        difficulties.Should().Contain("let");
        difficulties.Should().Contain("middel");
        difficulties.Should().Contain("svær");
    }

    #endregion

    #region Progress Reporting Tests

    [Fact]
    public async Task GenerateTerminsprove_ReportsProgressEvents()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        var result = await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(200);

        progressEvents.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateTerminsprove_ReportsPhaseStarted()
    {
        SetupSingleTaskGenerator();
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
        SetupSingleTaskGenerator();
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
        SetupSingleTaskGenerator();
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
        SetupSingleTaskGenerator();
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
        SetupSingleTaskGenerator();
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
        SetupSingleTaskGenerator();
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
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        _imageGenerationAgentMock.Verify(
            x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Exactly(5));
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageGenerated_SetsImageUrlOnTask()
    {
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().AllSatisfy(t => t.ImageUrl.Should().Contain("test.png"));
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageFails_DoesNotCrash()
    {
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
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
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ImageGenResult?)null);

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Tasks.Should().AllSatisfy(t => t.ImageUrl.Should().BeNull());
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageNeeded_ReportsImageGeneratingEvent()
    {
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(500);

        progressEvents.Should().Contain(p => p.EventType == ProgressEventType.TaskImageGenerating);
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenImageReady_ReportsImageReadyEvent()
    {
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);
        var progressEvents = new List<GenerationProgress>();
        var progress = new Progress<GenerationProgress>(p => progressEvents.Add(p));

        await orchestrator.GenerateTerminsproveAsync(request, progress);
        await Task.Delay(500);

        var imageReadyEvents = progressEvents.Where(p => p.EventType == ProgressEventType.TaskImageReady).ToList();
        imageReadyEvents.Should().HaveCountGreaterThan(0);
        imageReadyEvents.Should().AllSatisfy(e =>
        {
            e.ImageUrl.Should().Contain("test.png");
            e.TaskId.Should().NotBeNullOrEmpty();
        });
    }

    [Fact]
    public async Task GenerateTerminsprove_ImageGeneratingEventHasTaskId()
    {
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

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
        SetupSingleTaskGenerator();
        var callCount = 0;
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                Interlocked.Increment(ref callCount);
                return callCount % 2 == 0;
            });
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

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
            .Setup(x => x.GenerateSingleTaskWithLogAsync(It.IsAny<SingleTaskGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SingleTaskGenerationRequest req, CancellationToken _) =>
            {
                return new SingleTaskGenerationResult
                {
                    Task = new GeneratedTask
                    {
                        Id = Guid.NewGuid().ToString(),
                        TaskTypeId = "geo_sammensat_figur",
                        Category = "geometri_og_maaling",
                        Difficulty = req.Difficulty,
                        ContextText = "Geometry task",
                        SubQuestions = new List<SubQuestion>()
                    },
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
        SetupSingleTaskGenerator();
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
    public async Task GenerateTerminsprove_WhenGeneratorThrows_ReturnsFailedResult()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateSingleTaskWithLogAsync(It.IsAny<SingleTaskGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("LLM API error"));

        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.Status.Should().Be(GenerationStatus.Failed);
        result.ErrorMessage.Should().Contain("LLM API error");
    }

    [Fact]
    public async Task GenerateTerminsprove_WhenGeneratorThrows_ReportsErrorEvent()
    {
        _batchGeneratorMock
            .Setup(x => x.GenerateSingleTaskWithLogAsync(It.IsAny<SingleTaskGenerationRequest>(), It.IsAny<CancellationToken>()))
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
            .Setup(x => x.GenerateSingleTaskWithLogAsync(It.IsAny<SingleTaskGenerationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SingleTaskGenerationRequest req, CancellationToken _) =>
            {
                return new SingleTaskGenerationResult
                {
                    Task = new GeneratedTask
                    {
                        Id = Guid.NewGuid().ToString(),
                        TaskTypeId = "geo_sammensat_figur",
                        Category = "geometri_og_maaling",
                        Difficulty = req.Difficulty,
                        ContextText = "Geometry task",
                        SubQuestions = new List<SubQuestion>()
                    },
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

    #endregion

    #region Agent Log Tests

    [Fact]
    public async Task GenerateTerminsprove_IncludesAgentLog()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateTerminsprove_AgentLogIncludesSummary()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().Contain(e => e.AgentName == "FastAgentOrchestrator");
    }

    [Fact]
    public async Task GenerateTerminsprove_AgentLogIncludesTaskEntries()
    {
        SetupSingleTaskGenerator();
        var orchestrator = CreateOrchestrator();
        var request = CreateRequest(taskCount: 5);

        var result = await orchestrator.GenerateTerminsproveAsync(request);

        result.AgentLog.Should().Contain(e => e.AgentName == "BatchTaskGenerator");
    }

    [Fact]
    public async Task GenerateTerminsprove_WithImages_AgentLogIncludesImageEntry()
    {
        SetupSingleTaskGenerator();
        _imageGenerationAgentMock
            .Setup(x => x.ShouldGenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _imageGenerationAgentMock
            .Setup(x => x.GenerateImageAsync(It.IsAny<GeneratedTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImageGenResult { FileName = "test.png", Prompt = "test prompt" });

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
        var task = CreateSingleTask(1);
        var validation = new ValidationResult { IsValid = false, Issues = new List<string> { "Bad" } };

        var result = await orchestrator.RegenerateTaskAsync(task, validation);

        result.Should().BeSameAs(task);
    }

    #endregion
}
