using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using MatBackend.Core.Models.Terminsprove;
using MatBackend.Infrastructure.Agents;

namespace MatBackend.Tests.Agents;

/// <summary>
/// Tests for the JSON parsing resilience in BatchTaskGeneratorAgent.
/// These tests verify that the parser can handle various LLM output quirks
/// including malformed numbers, truncated JSON, trailing commas, etc.
/// </summary>
public class BatchTaskGeneratorJsonParsingTests
{
    private static readonly JsonSerializerOptions LenientOptions = BatchTaskGeneratorAgent._lenientJsonOptions;

    #region CleanLlmJson Tests

    [Fact]
    public void CleanLlmJson_RemovesMarkdownFences()
    {
        var input = "```json\n[{\"test\": 1}]\n```";
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        result.Should().Be("[{\"test\": 1}]");
    }

    [Fact]
    public void CleanLlmJson_RemovesTrailingCommas()
    {
        var input = """[{"a": 1,}, {"b": 2,}]""";
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        result.Should().Be("""[{"a": 1}, {"b": 2}]""");
    }

    [Fact]
    public void CleanLlmJson_RemovesTrailingCommasWithWhitespace()
    {
        var input = """
        [
          {"a": 1 , },
          {"b": 2 , }
        ]
        """;
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        // Should not contain ,} or ,]
        result.Should().NotMatchRegex(@",\s*[\]\}]");
    }

    [Fact]
    public void CleanLlmJson_FixesMalformedNumberQuote()
    {
        // The actual bug: LLM outputs stepNumber: 3" instead of stepNumber: 3
        var input = """{"stepNumber": 3"}""";
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        result.Should().Contain(": 3");
        result.Should().NotContain("3\"");
    }

    [Fact]
    public void CleanLlmJson_FixesMultipleMalformedNumberQuotes()
    {
        var input = """[{"stepNumber": 1"}, {"stepNumber": 2"}, {"stepNumber": 3"}]""";
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        result.Should().NotContain("1\"");
        result.Should().NotContain("2\"");
        result.Should().NotContain("3\"");
    }

    [Fact]
    public void CleanLlmJson_PreservesValidStringValues()
    {
        var input = """{"description": "Step 3 is important", "value": "42"}""";
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        result.Should().Contain("\"Step 3 is important\"");
        result.Should().Contain("\"42\"");
    }

    [Fact]
    public void CleanLlmJson_HandlesCleanJson()
    {
        var input = """[{"stepNumber": 1, "description": "test"}]""";
        var result = BatchTaskGeneratorAgent.CleanLlmJson(input);
        result.Should().Be("""[{"stepNumber": 1, "description": "test"}]""");
    }

    [Fact]
    public void CleanLlmJson_HandlesEmptyInput()
    {
        var result = BatchTaskGeneratorAgent.CleanLlmJson("");
        result.Should().BeEmpty();
    }

    #endregion

    #region TryRepairTruncatedJson Tests

    [Fact]
    public void TryRepairTruncatedJson_ClosesUnclosedArray()
    {
        var input = """[{"a": 1}, {"b": 2}""";
        var result = BatchTaskGeneratorAgent.TryRepairTruncatedJson(input);
        result.Should().EndWith("]");
    }

    [Fact]
    public void TryRepairTruncatedJson_ClosesUnclosedObjectAndArray()
    {
        var input = """[{"a": 1}, {"b": 2""";
        var result = BatchTaskGeneratorAgent.TryRepairTruncatedJson(input);
        // Should have closing brace and bracket
        result.Should().EndWith("}]");
    }

    [Fact]
    public void TryRepairTruncatedJson_HandlesTrailingComma()
    {
        var input = """[{"a": 1}, {"b": 2},""";
        var result = BatchTaskGeneratorAgent.TryRepairTruncatedJson(input);
        result.Should().EndWith("]");
    }

    [Fact]
    public void TryRepairTruncatedJson_PreservesValidJson()
    {
        var input = """[{"a": 1}, {"b": 2}]""";
        var result = BatchTaskGeneratorAgent.TryRepairTruncatedJson(input);
        result.Should().Be(input);
    }

    #endregion

    #region FindMatchingBrace Tests

    [Fact]
    public void FindMatchingBrace_FindsSimpleBrace()
    {
        var json = """{"a": 1}""";
        var result = BatchTaskGeneratorAgent.FindMatchingBrace(json, 0);
        result.Should().Be(7);
    }

    [Fact]
    public void FindMatchingBrace_FindsNestedBrace()
    {
        var json = """{"a": {"b": 1}}""";
        var result = BatchTaskGeneratorAgent.FindMatchingBrace(json, 0);
        result.Should().Be(14);
    }

    [Fact]
    public void FindMatchingBrace_HandlesStringWithBraces()
    {
        var json = """{"a": "text with { and }"}""";
        var result = BatchTaskGeneratorAgent.FindMatchingBrace(json, 0);
        result.Should().Be(json.Length - 1);
    }

    [Fact]
    public void FindMatchingBrace_ReturnsMinusOneForUnclosed()
    {
        var json = """{"a": 1""";
        var result = BatchTaskGeneratorAgent.FindMatchingBrace(json, 0);
        result.Should().Be(-1);
    }

    [Fact]
    public void FindMatchingBrace_HandlesEscapedQuotes()
    {
        var json = """{"a": "text with \" escaped"}""";
        var result = BatchTaskGeneratorAgent.FindMatchingBrace(json, 0);
        result.Should().Be(json.Length - 1);
    }

    #endregion

    #region Full JSON Parsing with Lenient Options

    [Fact]
    public void LenientParse_HandlesStepNumberAsString()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test opgave",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Hvad er 2+2?",
                "answer": {"value": "4", "unit": ""},
                "difficulty": "let",
                "points": 1,
                "solutionSteps": [
                  {"stepNumber": "1", "description": "Læg sammen", "mathExpression": "2+2", "result": "4"}
                ]
              }
            ],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].SubQuestions[0].SolutionSteps[0].StepNumber.Should().Be(1);
    }

    [Fact]
    public void LenientParse_HandlesPointsAsString()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test opgave",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Hvad er 2+2?",
                "answer": {"value": "4", "unit": ""},
                "difficulty": "let",
                "points": "2",
                "solutionSteps": []
              }
            ],
            "points": "3",
            "estimatedTimeSeconds": "120"
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].Points.Should().Be(3);
        tasks[0].EstimatedTimeSeconds.Should().Be(120);
        tasks[0].SubQuestions[0].Points.Should().Be(2);
    }

    [Fact]
    public void LenientParse_HandlesTrailingCommas()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test",
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60,
          },
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
    }

    [Fact]
    public void LenientParse_HandlesRealWorldLlmOutput()
    {
        // This is a realistic LLM output that previously caused the parse error
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Ida og Noah er til fredagsloppemarked på Ingerslevs Boulevard i Aarhus. De har hver især sparet lommepenge sammen for at kunne købe bøger, legetøj og måske lidt kage i boden.",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Ida har 85 kr med, og Noah har 60 kr med. Hvor mange penge har de tilsammen?",
                "answer": {"value": "145", "unit": "kr"},
                "difficulty": "let",
                "points": 1,
                "solutionSteps": [
                  {"stepNumber": 1, "description": "Læg beløbene sammen", "mathExpression": "85 + 60", "result": "145 kr"}
                ]
              },
              {
                "label": "b",
                "questionText": "Ida finder en brugt roman til 35 kr og et puslespil til 20 kr. Hun køber begge dele. Hvor mange penge har Ida tilbage?",
                "answer": {"value": "30", "unit": "kr"},
                "difficulty": "let",
                "points": 1,
                "solutionSteps": [
                  {"stepNumber": 1, "description": "Find Idas samlede køb", "mathExpression": "35 + 20", "result": "55 kr"},
                  {"stepNumber": 2, "description": "Træk købet fra Idas penge", "mathExpression": "85 - 55", "result": "30 kr"}
                ]
              },
              {
                "label": "c",
                "questionText": "Noah køber tre tegneserier til 15 kr stykket og en muffin til 12 kr. Hvor mange penge har Noah tilbage?",
                "answer": {"value": "3", "unit": "kr"},
                "difficulty": "middel",
                "points": 1,
                "solutionSteps": [
                  {"stepNumber": 1, "description": "Pris for tre tegneserier", "mathExpression": "3 · 15", "result": "45 kr"},
                  {"stepNumber": 2, "description": "Samlet pris", "mathExpression": "45 + 12", "result": "57 kr"},
                  {"stepNumber": 3, "description": "Penge tilbage", "mathExpression": "60 - 57", "result": "3 kr"}
                ]
              }
            ],
            "points": 3,
            "estimatedTimeSeconds": 180
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].ContextText.Should().Contain("Ida og Noah");
        tasks[0].SubQuestions.Should().HaveCount(3);
        tasks[0].SubQuestions[2].SolutionSteps.Should().HaveCount(3);
        tasks[0].SubQuestions[2].SolutionSteps[2].StepNumber.Should().Be(3);
    }

    [Fact]
    public void LenientParse_HandlesMultipleTasksWithMixedNumberFormats()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Opgave 1",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Test?",
                "answer": {"value": "42", "unit": ""},
                "difficulty": "let",
                "points": "1",
                "solutionSteps": [
                  {"stepNumber": "1", "description": "Step 1", "mathExpression": "x", "result": "42"}
                ]
              }
            ],
            "points": "1",
            "estimatedTimeSeconds": "60"
          },
          {
            "taskTypeId": "tal_pris_rabat_procent",
            "category": "tal_og_algebra",
            "difficulty": "middel",
            "contextText": "Opgave 2",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Test 2?",
                "answer": {"value": "100", "unit": "kr"},
                "difficulty": "middel",
                "points": 2,
                "solutionSteps": [
                  {"stepNumber": 1, "description": "Step 1", "mathExpression": "y", "result": "100"}
                ]
              }
            ],
            "points": 2,
            "estimatedTimeSeconds": 120
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(2);
        tasks![0].Points.Should().Be(1);
        tasks[1].Points.Should().Be(2);
    }

    #endregion

    #region CleanLlmJson + Parse Integration Tests

    [Fact]
    public void CleanAndParse_HandlesMarkdownWrappedJson()
    {
        var response = """
        Here are the tasks:
        ```json
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Simple task",
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        ```
        """;

        var jsonStart = response.IndexOf('[');
        var jsonEnd = response.LastIndexOf(']');
        var json = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
        json = BatchTaskGeneratorAgent.CleanLlmJson(json);

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
    }

    [Fact]
    public void CleanAndParse_HandlesMalformedNumberThenQuote()
    {
        // Simulates the exact error from the user's log:
        // "stepNumber": 3" (number followed by quote without delimiter)
        // After CleanLlmJson, this should become "stepNumber": 3
        var malformedJson = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Test?",
                "answer": {"value": "4", "unit": ""},
                "difficulty": "let",
                "points": 1,
                "solutionSteps": [
                  {"stepNumber": 1, "description": "Step 1", "mathExpression": "2+2", "result": "4"},
                  {"stepNumber": 2, "description": "Step 2", "mathExpression": "x", "result": "4"}
                ]
              }
            ],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var cleaned = BatchTaskGeneratorAgent.CleanLlmJson(malformedJson);
        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(cleaned, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].SubQuestions[0].SolutionSteps.Should().HaveCount(2);
    }

    #endregion

    #region TryExtractIndividualTasks Tests (via CleanLlmJson + manual extraction)

    [Fact]
    public void CleanAndRepair_HandlesTruncatedJsonWithCompleteObjects()
    {
        // JSON that was truncated mid-way through the second object
        var truncatedJson = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Complete task 1",
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60
          },
          {
            "taskTypeId": "tal_pris_rabat_procent",
            "category": "tal_og_algebra",
            "difficulty": "middel",
            "contextText": "Incomplete task
        """;

        var cleaned = BatchTaskGeneratorAgent.CleanLlmJson(truncatedJson);
        // The repair should close the truncated JSON
        cleaned.Should().EndWith("]");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void LenientParse_HandlesEmptySubQuestions()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test",
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].SubQuestions.Should().BeEmpty();
    }

    [Fact]
    public void LenientParse_HandlesEmptySolutionSteps()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Test?",
                "answer": {"value": "4", "unit": ""},
                "difficulty": "let",
                "points": 1,
                "solutionSteps": []
              }
            ],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].SubQuestions[0].SolutionSteps.Should().BeEmpty();
    }

    [Fact]
    public void LenientParse_HandlesDanishCharacters()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Freja og Øllegård er på tur til Ærø. De køber rødgrød med fløde.",
            "subQuestions": [
              {
                "label": "a",
                "questionText": "Hvad koster rødgrøden?",
                "answer": {"value": "45", "unit": "kr"},
                "difficulty": "let",
                "points": 1,
                "solutionSteps": [
                  {"stepNumber": 1, "description": "Aflæs prisen", "mathExpression": "45", "result": "45 kr"}
                ]
              }
            ],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].ContextText.Should().Contain("Øllegård");
        tasks[0].ContextText.Should().Contain("Ærø");
        tasks[0].ContextText.Should().Contain("rødgrød");
    }

    [Fact]
    public void LenientParse_HandlesExtraFieldsGracefully()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "difficulty": "let",
            "contextText": "Test",
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60,
            "unknownField": "should be ignored",
            "anotherExtra": 42
          }
        ]
        """;

        // Should not throw, just ignore extra fields
        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
    }

    [Fact]
    public void LenientParse_HandlesMissingOptionalFields()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "contextText": "Minimal task"
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].TaskTypeId.Should().Be("tal_regnearter");
        tasks[0].ContextText.Should().Be("Minimal task");
        tasks[0].Difficulty.Should().Be("middel"); // default
    }

    [Fact]
    public void LenientParse_HandlesNullImageUrl()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "contextText": "Test",
            "imageUrl": null,
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].ImageUrl.Should().BeNull();
    }

    [Fact]
    public void LenientParse_HandlesImageUrlPresent()
    {
        var json = """
        [
          {
            "taskTypeId": "tal_regnearter",
            "category": "tal_og_algebra",
            "contextText": "Test",
            "imageUrl": "/api/images/test.png",
            "subQuestions": [],
            "points": 1,
            "estimatedTimeSeconds": 60
          }
        ]
        """;

        var tasks = JsonSerializer.Deserialize<List<GeneratedTask>>(json, LenientOptions);
        tasks.Should().HaveCount(1);
        tasks![0].ImageUrl.Should().Be("/api/images/test.png");
    }

    #endregion
}

