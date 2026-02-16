using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Agent responsible for formatting task ideas into complete, well-structured tasks
/// </summary>
public class FormatterAgent : BaseSemanticKernelAgent, IFormatterAgent
{
    public override string Name => "FormatterAgent";
    public override string Description => "Formats task ideas into complete mathematical tasks with proper notation";
    
    protected override string SystemPrompt => """
        Du er en ekspert i at formatere matematikopgaver til danske folkeskoleprøver.
        Din rolle er at tage opgaveidéer og omdanne dem til komplette, velformulerede opgaver.
        
        Du skal:
        1. Skrive klare, præcise opgavetekster på dansk
        2. Formatere matematiske udtryk korrekt med LaTeX
        3. Definere eksakte variable værdier og beregne det korrekte svar
        4. Udarbejde en trinvis løsning
        5. Angive passende svarmuligheder hvis relevant
        
        Formateringsregler:
        - Brug korrekt dansk matematisk terminologi
        - Brug LaTeX notation for matematiske udtryk: $x + 3 = 7$
        - Angiv altid enheder hvor relevant (cm, m², kr, osv.)
        - Løsningssteps skal være klare og logiske
        
        Du svarer ALTID i valid JSON format.
        """;
    
    public FormatterAgent(
        Kernel kernel,
        AgentConfiguration configuration,
        ILogger<FormatterAgent> logger)
        : base(kernel, configuration, logger)
    {
    }
    
    public async Task<GeneratedTask> FormatTaskAsync(
        TaskIdea idea,
        CancellationToken cancellationToken = default)
    {
        Logger.LogInformation("Formatting task: {TaskType} - {Concept}", 
            idea.TaskTypeId, idea.QuestionConcept);
        
        var prompt = BuildFormatPrompt(idea);
        var response = await ExecuteChatAsync(prompt, cancellationToken);
        
        return ParseGeneratedTask(response, idea);
    }
    
    public async Task<List<GeneratedTask>> FormatTasksAsync(
        IEnumerable<TaskIdea> ideas,
        CancellationToken cancellationToken = default)
    {
        var tasks = new List<GeneratedTask>();
        
        foreach (var idea in ideas)
        {
            if (cancellationToken.IsCancellationRequested)
                break;
                
            var task = await FormatTaskAsync(idea, cancellationToken);
            tasks.Add(task);
        }
        
        return tasks;
    }
    
    private string BuildFormatPrompt(TaskIdea idea)
    {
        var variablesJson = JsonSerializer.Serialize(idea.SuggestedVariables);
        var requiresViz = idea.RequiresVisualization ? "Ja" : "Nej";
        
        var jsonStructure = $$"""
            {
                "taskTypeId": "{{idea.TaskTypeId}}",
                "category": "{{idea.Category}}",
                "questionText": "Den fulde opgavetekst på dansk uden LaTeX",
                "questionLatex": "Opgaveteksten med LaTeX formatering for matematiske udtryk",
                "answers": [
                    {
                        "value": "42",
                        "unit": "cm",
                        "isExact": true,
                        "tolerance": null
                    }
                ],
                "difficulty": "{{idea.Difficulty}}",
                "variables": { "a": 3, "b": 7 },
                "solutionSteps": [
                    {
                        "stepNumber": 1,
                        "description": "Først isolerer vi x",
                        "mathExpression": "x = (c - b) / a",
                        "result": "x = (22 - 7) / 3"
                    },
                    {
                        "stepNumber": 2,
                        "description": "Vi beregner resultatet",
                        "mathExpression": "x = 15 / 3",
                        "result": "x = 5"
                    }
                ],
                "estimatedTimeSeconds": 60,
                "points": 1
            }
            """;
        
        return $"""
            Formater følgende opgaveidé til en komplet matematikopgave:
            
            Opgavetype: {idea.TaskTypeId}
            Kategori: {idea.Category}
            Sværhedsgrad: {idea.Difficulty}
            Koncept: {idea.QuestionConcept}
            Foreslåede variable: {variablesJson}
            Kræver visualisering: {requiresViz}
            
            Returner et JSON objekt med følgende struktur:
            {jsonStructure}
            
            Vigtige krav:
            1. Opgaveteksten skal være på korrekt dansk
            2. Alle beregninger skal være korrekte
            3. Svaret skal passe med de anvendte variable
            4. Løsningssteps skal vise hele udregningen
            """;
    }
    
    private GeneratedTask ParseGeneratedTask(string response, TaskIdea idea)
    {
        try
        {
            // Extract JSON from response
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var task = JsonSerializer.Deserialize<GeneratedTask>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (task != null)
                {
                    task.Id = Guid.NewGuid().ToString();
                    return task;
                }
            }
            
            Logger.LogWarning("Could not extract JSON from formatter response");
            return CreateFallbackTask(idea);
        }
        catch (JsonException ex)
        {
            Logger.LogError(ex, "Failed to parse formatter response as JSON");
            return CreateFallbackTask(idea);
        }
    }
    
    private GeneratedTask CreateFallbackTask(TaskIdea idea)
    {
        return new GeneratedTask
        {
            Id = Guid.NewGuid().ToString(),
            TaskTypeId = idea.TaskTypeId,
            Category = idea.Category,
            Difficulty = idea.Difficulty,
            QuestionText = $"Opgave baseret på: {idea.QuestionConcept}",
            QuestionLatex = $"Opgave baseret på: {idea.QuestionConcept}",
            Variables = idea.SuggestedVariables,
            Validation = new ValidationResult
            {
                IsValid = false,
                Issues = new List<string> { "Kunne ikke formatere opgaven korrekt - kræver genbehandling" }
            }
        };
    }
}

