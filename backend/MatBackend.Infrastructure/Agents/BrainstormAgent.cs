using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Agent responsible for brainstorming task ideas for a terminsprøve
/// </summary>
public class BrainstormAgent : BaseSemanticKernelAgent, IBrainstormAgent
{
    public override string Name => "BrainstormAgent";
    public override string Description => "Generates creative task ideas based on curriculum and difficulty requirements";
    
    protected override string SystemPrompt => """
        Du er en ekspert i at designe matematikopgaver til danske folkeskoleprøver (FP9).
        Din rolle er at brainstorme kreative og pædagogisk velegnede opgaver.
        
        Du skal:
        1. Analysere kravene til terminsprøven
        2. Vælge passende opgavetyper baseret på tilgængelige kategorier
        3. Foreslå konkrete opgaveidéer med passende sværhedsgrad
        4. Sikre variation i opgavetyper og emner
        5. Overveje om opgaven kræver en figur eller visualisering
        
        Du arbejder med følgende kategorier:
        - tal_og_algebra: Tal, brøker, ligninger, procentregning
        - geometri_og_maaling: Areal, rumfang, vinkler, koordinater
        - statistik_og_sandsynlighed: Boksplot, søjlediagrammer, sandsynlighed
        
        Sværhedsgrader:
        - let: Simple opgaver der kan løses med grundlæggende forståelse
        - middel: Opgaver der kræver flere skridt eller kombination af begreber
        - svær: Komplekse opgaver med flere elementer eller uventede vinkler
        
        Du svarer ALTID i valid JSON format.
        """;
    
    public BrainstormAgent(
        Kernel kernel,
        AgentConfiguration configuration,
        ILogger<BrainstormAgent> logger)
        : base(kernel, configuration, logger)
    {
    }
    
    public async Task<List<TaskIdea>> BrainstormTasksAsync(
        TerminsproveRequest request,
        IEnumerable<string> availableTaskTypes,
        CancellationToken cancellationToken = default)
    {
        Logger.LogInformation("Brainstorming {TaskCount} tasks for {Level} {ExamPart}",
            request.TaskCount, request.Level, request.ExamPart);
        
        var prompt = BuildBrainstormPrompt(request, availableTaskTypes);
        var response = await ExecuteChatAsync(prompt, cancellationToken);
        
        return ParseTaskIdeas(response, request.TaskCount);
    }
    
    private string BuildBrainstormPrompt(TerminsproveRequest request, IEnumerable<string> availableTaskTypes)
    {
        var taskTypeList = string.Join(", ", availableTaskTypes);
        var focusAreas = request.FocusCategories.Any() 
            ? string.Join(", ", request.FocusCategories)
            : "alle kategorier (balanceret)";
        
        var jsonExample = """
            {
                "taskTypeId": "tal_ligninger",
                "category": "tal_og_algebra", 
                "difficulty": "middel",
                "questionConcept": "Løs en simpel ligning med én ubekendt hvor x skal isoleres",
                "suggestedVariables": { "a": 3, "b": 7, "c": 22 },
                "requiresVisualization": false,
                "visualizationType": null,
                "rationale": "Grundlæggende ligning der tester forståelse af algebraiske operationer"
            }
            """;
        
        var customInstr = request.CustomInstructions != null 
            ? $"Særlige instruktioner: {request.CustomInstructions}" 
            : "";
        
        return $"""
            Generer {request.TaskCount} opgaveidéer til en terminsprøve.
            
            Krav:
            - Niveau: {request.Level}
            - Prøvedel: {request.ExamPart}
            - Fokusområder: {focusAreas}
            - Sværhedsfordeling: {request.Difficulty.Easy * 100}% let, {request.Difficulty.Medium * 100}% middel, {request.Difficulty.Hard * 100}% svær
            
            Tilgængelige opgavetyper: {taskTypeList}
            
            {customInstr}
            
            Returner et JSON array med følgende struktur for hver opgave:
            {jsonExample}
            
            Husk at:
            1. Variér opgavetyper og kategorier
            2. Følg sværhedsfordelingen
            3. Inkluder visualiseringer hvor relevant (geometri, statistik)
            4. Vælg realistiske variabelværdier der giver pæne svar
            """;
    }
    
    private List<TaskIdea> ParseTaskIdeas(string response, int expectedCount)
    {
        try
        {
            // Extract JSON from response (might be wrapped in markdown)
            var jsonStart = response.IndexOf('[');
            var jsonEnd = response.LastIndexOf(']');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var ideas = JsonSerializer.Deserialize<List<TaskIdea>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                return ideas ?? new List<TaskIdea>();
            }
            
            Logger.LogWarning("Could not extract JSON array from brainstorm response");
            return GenerateFallbackIdeas(expectedCount);
        }
        catch (JsonException ex)
        {
            Logger.LogError(ex, "Failed to parse brainstorm response as JSON");
            return GenerateFallbackIdeas(expectedCount);
        }
    }
    
    private List<TaskIdea> GenerateFallbackIdeas(int count)
    {
        // Generate basic fallback ideas if parsing fails
        var ideas = new List<TaskIdea>();
        var categories = new[] { "tal_og_algebra", "geometri_og_maaling", "statistik_og_sandsynlighed" };
        var difficulties = new[] { "let", "middel", "svær" };
        
        for (int i = 0; i < count; i++)
        {
            ideas.Add(new TaskIdea
            {
                TaskTypeId = "tal_regnearter",
                Category = categories[i % categories.Length],
                Difficulty = difficulties[i % difficulties.Length],
                QuestionConcept = $"Grundlæggende opgave {i + 1}",
                Rationale = "Fallback opgave genereret pga. parsing fejl"
            });
        }
        
        return ideas;
    }
}

