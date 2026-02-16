using System.Text.Json;
using FluentAssertions;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Tests.Models;

/// <summary>
/// Tests for the GenerationProgress model and ProgressEventType enum.
/// Verifies the streaming protocol models used for SSE communication.
/// </summary>
public class GenerationProgressTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    #region GenerationProgress Tests

    [Fact]
    public void GenerationProgress_HasDefaultValues()
    {
        var progress = new GenerationProgress();
        progress.Status.Should().Be(GenerationStatus.Pending);
        progress.Message.Should().BeEmpty();
        progress.TasksCompleted.Should().Be(0);
        progress.TotalTasks.Should().Be(0);
        progress.EventType.Should().Be(ProgressEventType.Progress);
        progress.CompletedTask.Should().BeNull();
        progress.TaskIndex.Should().BeNull();
        progress.TaskPhase.Should().BeNull();
        progress.TaskId.Should().BeNull();
        progress.ImageUrl.Should().BeNull();
    }

    [Fact]
    public void GenerationProgress_ProgressPercentage_CalculatesCorrectly()
    {
        var progress = new GenerationProgress
        {
            TasksCompleted = 5,
            TotalTasks = 10
        };

        progress.ProgressPercentage.Should().Be(50.0);
    }

    [Fact]
    public void GenerationProgress_ProgressPercentage_HandlesZeroTotal()
    {
        var progress = new GenerationProgress
        {
            TasksCompleted = 0,
            TotalTasks = 0
        };

        progress.ProgressPercentage.Should().Be(0);
    }

    [Fact]
    public void GenerationProgress_ProgressPercentage_Handles100Percent()
    {
        var progress = new GenerationProgress
        {
            TasksCompleted = 10,
            TotalTasks = 10
        };

        progress.ProgressPercentage.Should().Be(100.0);
    }

    [Fact]
    public void GenerationProgress_TaskImageGenerating_HasTaskId()
    {
        var progress = new GenerationProgress
        {
            EventType = ProgressEventType.TaskImageGenerating,
            TaskId = "task-123",
            Message = "Generating image..."
        };

        progress.TaskId.Should().Be("task-123");
        progress.EventType.Should().Be(ProgressEventType.TaskImageGenerating);
    }

    [Fact]
    public void GenerationProgress_TaskImageReady_HasImageUrl()
    {
        var progress = new GenerationProgress
        {
            EventType = ProgressEventType.TaskImageReady,
            TaskId = "task-123",
            ImageUrl = "/api/images/task-123.png",
            Message = "Image ready"
        };

        progress.ImageUrl.Should().Be("/api/images/task-123.png");
        progress.TaskId.Should().Be("task-123");
    }

    [Fact]
    public void GenerationProgress_Serialization_IncludesAllFields()
    {
        var progress = new GenerationProgress
        {
            EventType = ProgressEventType.TaskImageReady,
            Status = GenerationStatus.Formatting,
            Message = "Image ready",
            TasksCompleted = 3,
            TotalTasks = 10,
            TaskIndex = 3,
            TaskId = "task-123",
            ImageUrl = "/api/images/task-123.png",
            CurrentAgentName = "GeminiImageGenerationAgent"
        };

        var json = JsonSerializer.Serialize(progress, Options);

        json.Should().Contain("TaskImageReady");
        json.Should().Contain("task-123");
        json.Should().Contain("/api/images/task-123.png");
        json.Should().Contain("GeminiImageGenerationAgent");
    }

    [Fact]
    public void GenerationProgress_Deserialization_HandlesAllEventTypes()
    {
        var json = """
        {
            "eventType": "TaskImageReady",
            "status": "Formatting",
            "message": "Image ready",
            "taskId": "task-123",
            "imageUrl": "/api/images/test.png"
        }
        """;

        var progress = JsonSerializer.Deserialize<GenerationProgress>(json, Options);
        progress!.EventType.Should().Be(ProgressEventType.TaskImageReady);
        progress.TaskId.Should().Be("task-123");
        progress.ImageUrl.Should().Be("/api/images/test.png");
    }

    #endregion

    #region ProgressEventType Tests

    [Fact]
    public void ProgressEventType_HasAllExpectedValues()
    {
        var values = Enum.GetValues<ProgressEventType>();
        values.Should().Contain(ProgressEventType.Progress);
        values.Should().Contain(ProgressEventType.PhaseStarted);
        values.Should().Contain(ProgressEventType.TaskStarted);
        values.Should().Contain(ProgressEventType.TaskFormatted);
        values.Should().Contain(ProgressEventType.TaskValidated);
        values.Should().Contain(ProgressEventType.TaskVisualized);
        values.Should().Contain(ProgressEventType.TaskCompleted);
        values.Should().Contain(ProgressEventType.TaskImageGenerating);
        values.Should().Contain(ProgressEventType.TaskImageReady);
        values.Should().Contain(ProgressEventType.TaskFailed);
        values.Should().Contain(ProgressEventType.Completed);
        values.Should().Contain(ProgressEventType.Error);
    }

    [Fact]
    public void ProgressEventType_SerializesAsString()
    {
        var json = JsonSerializer.Serialize(ProgressEventType.TaskImageReady, Options);
        json.Should().Contain("TaskImageReady");
    }

    [Fact]
    public void ProgressEventType_DeserializesFromString()
    {
        var result = JsonSerializer.Deserialize<ProgressEventType>("\"TaskImageGenerating\"", Options);
        result.Should().Be(ProgressEventType.TaskImageGenerating);
    }

    #endregion

    #region TaskGenerationPhase Tests

    [Fact]
    public void TaskGenerationPhase_HasAllExpectedValues()
    {
        var values = Enum.GetValues<TaskGenerationPhase>();
        values.Should().Contain(TaskGenerationPhase.Brainstorming);
        values.Should().Contain(TaskGenerationPhase.Formatting);
        values.Should().Contain(TaskGenerationPhase.Validating);
        values.Should().Contain(TaskGenerationPhase.Visualizing);
        values.Should().Contain(TaskGenerationPhase.Complete);
    }

    [Fact]
    public void TaskGenerationPhase_SerializesAsString()
    {
        var json = JsonSerializer.Serialize(TaskGenerationPhase.Visualizing, Options);
        json.Should().Contain("Visualizing");
    }

    #endregion
}

