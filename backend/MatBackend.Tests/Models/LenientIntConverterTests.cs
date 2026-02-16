using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Tests.Models;

/// <summary>
/// Tests for the LenientIntConverter that handles LLM quirks in JSON number parsing.
/// The LLM sometimes outputs numbers as strings, floats, or other non-standard formats.
/// </summary>
public class LenientIntConverterTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private class TestModel
    {
        [JsonConverter(typeof(LenientIntConverter))]
        public int Value { get; set; }
    }

    [Fact]
    public void Deserialize_NormalInteger_ReturnsValue()
    {
        var json = """{"value": 42}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(42);
    }

    [Fact]
    public void Deserialize_Zero_ReturnsZero()
    {
        var json = """{"value": 0}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(0);
    }

    [Fact]
    public void Deserialize_NegativeInteger_ReturnsValue()
    {
        var json = """{"value": -5}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(-5);
    }

    [Fact]
    public void Deserialize_StringContainingInteger_ReturnsValue()
    {
        var json = """{"value": "3"}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(3);
    }

    [Fact]
    public void Deserialize_StringContainingNegativeInteger_ReturnsValue()
    {
        var json = """{"value": "-7"}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(-7);
    }

    [Fact]
    public void Deserialize_FloatWholeNumber_ReturnsRoundedValue()
    {
        var json = """{"value": 3.0}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(3);
    }

    [Fact]
    public void Deserialize_FloatWithFraction_ReturnsRoundedValue()
    {
        var json = """{"value": 3.7}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(4);
    }

    [Fact]
    public void Deserialize_StringContainingFloat_ReturnsRoundedValue()
    {
        var json = """{"value": "3.0"}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(3);
    }

    [Fact]
    public void Deserialize_EmptyString_ReturnsZero()
    {
        var json = """{"value": ""}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(0);
    }

    [Fact]
    public void Deserialize_NullValue_ReturnsZero()
    {
        var json = """{"value": null}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(0);
    }

    [Fact]
    public void Deserialize_StringWithSpaces_ReturnsValue()
    {
        var json = """{"value": " 5 "}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(5);
    }

    [Fact]
    public void Deserialize_NonNumericString_ReturnsZero()
    {
        var json = """{"value": "abc"}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(0);
    }

    [Fact]
    public void Serialize_WritesAsNumber()
    {
        var model = new TestModel { Value = 42 };
        var json = JsonSerializer.Serialize(model, Options);
        json.Should().Contain("42");
        json.Should().NotContain("\"42\"");
    }

    [Fact]
    public void Deserialize_SolutionStep_HandlesStringStepNumber()
    {
        var json = """{"stepNumber": "2", "description": "Test", "mathExpression": "1+1", "result": "2"}""";
        var step = JsonSerializer.Deserialize<SolutionStep>(json, Options);
        step!.StepNumber.Should().Be(2);
    }

    [Fact]
    public void Deserialize_SolutionStep_HandlesIntStepNumber()
    {
        var json = """{"stepNumber": 1, "description": "Test", "mathExpression": "1+1", "result": "2"}""";
        var step = JsonSerializer.Deserialize<SolutionStep>(json, Options);
        step!.StepNumber.Should().Be(1);
    }

    [Fact]
    public void Deserialize_SubQuestion_HandlesStringPoints()
    {
        var json = """
        {
            "label": "a",
            "questionText": "Test?",
            "answer": {"value": "42", "unit": "kr"},
            "difficulty": "let",
            "points": "2",
            "solutionSteps": []
        }
        """;
        var sq = JsonSerializer.Deserialize<SubQuestion>(json, Options);
        sq!.Points.Should().Be(2);
    }

    [Fact]
    public void Deserialize_GeneratedTask_HandlesStringPoints()
    {
        var json = """
        {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test context",
            "subQuestions": [],
            "points": "3",
            "estimatedTimeSeconds": "120"
        }
        """;
        var task = JsonSerializer.Deserialize<GeneratedTask>(json, Options);
        task!.Points.Should().Be(3);
        task.EstimatedTimeSeconds.Should().Be(120);
    }

    [Fact]
    public void Deserialize_LargeNumber_ReturnsValue()
    {
        var json = """{"value": 999999}""";
        var result = JsonSerializer.Deserialize<TestModel>(json, Options);
        result!.Value.Should().Be(999999);
    }
}

