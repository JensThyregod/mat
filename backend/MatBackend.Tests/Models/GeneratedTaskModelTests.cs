using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Tests.Models;

/// <summary>
/// Tests for the GeneratedTask model and related models.
/// Verifies serialization/deserialization, default values, and model integrity.
/// </summary>
public class GeneratedTaskModelTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    #region GeneratedTask Tests

    [Fact]
    public void GeneratedTask_HasDefaultId()
    {
        var task = new GeneratedTask();
        task.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(task.Id, out _).Should().BeTrue();
    }

    [Fact]
    public void GeneratedTask_HasDefaultValues()
    {
        var task = new GeneratedTask();
        task.TaskTypeId.Should().BeEmpty();
        task.Category.Should().BeEmpty();
        task.ContextText.Should().BeEmpty();
        task.Difficulty.Should().Be("middel");
        task.Points.Should().Be(1);
        task.EstimatedTimeSeconds.Should().Be(60);
        task.ImageUrl.Should().BeNull();
        task.Visualization.Should().BeNull();
        task.SubQuestions.Should().BeEmpty();
    }

    [Fact]
    public void GeneratedTask_ImageUrl_CanBeSetAndRead()
    {
        var task = new GeneratedTask { ImageUrl = "/api/images/test.png" };
        task.ImageUrl.Should().Be("/api/images/test.png");
    }

    [Fact]
    public void GeneratedTask_ImageUrl_CanBeNull()
    {
        var task = new GeneratedTask { ImageUrl = null };
        task.ImageUrl.Should().BeNull();
    }

    [Fact]
    public void GeneratedTask_Serialization_IncludesImageUrl()
    {
        var task = new GeneratedTask
        {
            TaskTypeId = "tal_regnearter",
            ContextText = "Test",
            ImageUrl = "/api/images/test.png"
        };

        var json = JsonSerializer.Serialize(task, Options);
        json.Should().Contain("imageUrl");
        json.Should().Contain("/api/images/test.png");
    }

    [Fact]
    public void GeneratedTask_Serialization_OmitsNullImageUrl()
    {
        var task = new GeneratedTask
        {
            TaskTypeId = "tal_regnearter",
            ContextText = "Test"
        };

        var json = JsonSerializer.Serialize(task, Options);
        // ImageUrl should be null, which serializes as null
        var deserialized = JsonSerializer.Deserialize<GeneratedTask>(json, Options);
        deserialized!.ImageUrl.Should().BeNull();
    }

    [Fact]
    public void GeneratedTask_RoundTrip_PreservesAllFields()
    {
        var original = new GeneratedTask
        {
            Id = "test-id-123",
            TaskTypeId = "tal_pris_rabat_procent",
            Category = "tal_og_algebra",
            ContextText = "Emma køber mad i caféen",
            Difficulty = "middel",
            Points = 3,
            EstimatedTimeSeconds = 180,
            ImageUrl = "/api/images/test.png",
            SubQuestions = new List<SubQuestion>
            {
                new SubQuestion
                {
                    Label = "a",
                    QuestionText = "Hvad koster det?",
                    Answer = new TaskAnswer { Value = "72", Unit = "kr" },
                    Difficulty = "let",
                    Points = 1,
                    SolutionSteps = new List<SolutionStep>
                    {
                        new SolutionStep { StepNumber = 1, Description = "Læg sammen", MathExpression = "54 + 18", Result = "72" }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(original, Options);
        var deserialized = JsonSerializer.Deserialize<GeneratedTask>(json, Options);

        deserialized!.Id.Should().Be(original.Id);
        deserialized.TaskTypeId.Should().Be(original.TaskTypeId);
        deserialized.Category.Should().Be(original.Category);
        deserialized.ContextText.Should().Be(original.ContextText);
        deserialized.Difficulty.Should().Be(original.Difficulty);
        deserialized.Points.Should().Be(original.Points);
        deserialized.EstimatedTimeSeconds.Should().Be(original.EstimatedTimeSeconds);
        deserialized.ImageUrl.Should().Be(original.ImageUrl);
        deserialized.SubQuestions.Should().HaveCount(1);
        deserialized.SubQuestions[0].Label.Should().Be("a");
        deserialized.SubQuestions[0].SolutionSteps[0].StepNumber.Should().Be(1);
    }

    #endregion

    #region TaskVisualization Tests

    [Fact]
    public void TaskVisualization_DefaultTypeIsNone()
    {
        var viz = new TaskVisualization();
        viz.Type.Should().Be("none");
    }

    [Fact]
    public void TaskVisualization_SupportsImageType()
    {
        var viz = new TaskVisualization { Type = "image" };
        viz.Type.Should().Be("image");
    }

    [Fact]
    public void TaskVisualization_SupportsSvgType()
    {
        var viz = new TaskVisualization { Type = "svg", SvgContent = "<svg></svg>" };
        viz.Type.Should().Be("svg");
        viz.SvgContent.Should().NotBeNull();
    }

    #endregion

    #region ValidationResult Tests

    [Fact]
    public void ValidationResult_DefaultIsInvalid()
    {
        var result = new ValidationResult();
        result.IsValid.Should().BeFalse();
        result.IsSolvable.Should().BeFalse();
        result.HasCorrectAnswer.Should().BeFalse();
    }

    [Fact]
    public void ValidationResult_CanBeSetToValid()
    {
        var result = new ValidationResult
        {
            IsValid = true,
            IsSolvable = true,
            HasCorrectAnswer = true,
            DifficultyAppropriate = true,
            ValidatorNotes = "Auto-validated"
        };

        result.IsValid.Should().BeTrue();
        result.ValidatorNotes.Should().Be("Auto-validated");
    }

    #endregion

    #region SolutionStep Tests

    [Fact]
    public void SolutionStep_DefaultStepNumberIsZero()
    {
        var step = new SolutionStep();
        step.StepNumber.Should().Be(0);
    }

    [Fact]
    public void SolutionStep_CanSetAllFields()
    {
        var step = new SolutionStep
        {
            StepNumber = 3,
            Description = "Beregn resultatet",
            MathExpression = "120 - 55",
            Result = "65 kr"
        };

        step.StepNumber.Should().Be(3);
        step.Description.Should().Be("Beregn resultatet");
        step.MathExpression.Should().Be("120 - 55");
        step.Result.Should().Be("65 kr");
    }

    #endregion

    #region SubQuestion Tests

    [Fact]
    public void SubQuestion_HasDefaultValues()
    {
        var sq = new SubQuestion();
        sq.Label.Should().BeEmpty();
        sq.QuestionText.Should().BeEmpty();
        sq.Difficulty.Should().Be("let");
        sq.Points.Should().Be(1);
        sq.SolutionSteps.Should().BeEmpty();
    }

    #endregion

    #region TaskAnswer Tests

    [Fact]
    public void TaskAnswer_HasDefaultValues()
    {
        var answer = new TaskAnswer();
        answer.Value.Should().BeEmpty();
        answer.Unit.Should().BeEmpty();
        answer.IsExact.Should().BeTrue();
        answer.Tolerance.Should().BeNull();
    }

    #endregion
}

