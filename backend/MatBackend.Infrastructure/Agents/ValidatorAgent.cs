using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Agent responsible for validating tasks are solvable and appropriate
/// </summary>
public class ValidatorAgent : BaseSemanticKernelAgent, IValidatorAgent
{
    public override string Name => "ValidatorAgent";
    public override string Description => "Validates that tasks are mathematically correct, solvable, and appropriate for the target level";
    
    protected override string SystemPrompt => """
        Du er en ekspert matematiklærer der validerer opgaver til danske folkeskoleprøver.
        Din rolle er at sikre at opgaver er korrekte, løsbare og pædagogisk egnede.
        
        Du skal verificere:
        1. Matematisk korrekthed: Er beregningerne rigtige?
        2. Løsbarhed: Kan opgaven løses med de givne informationer?
        3. Sværhedsgrad: Passer opgaven til det angivne niveau?
        4. Sproglig klarhed: Er opgaveteksten klar og utvetydig?
        5. Realisme: Er værdier og kontekst realistiske?
        
        Du skal være kritisk men fair - marker kun som ugyldig hvis der er reelle problemer.
        
        Typiske fejl at fange:
        - Regnefejl i løsningen
        - Manglende eller modstridende information
        - Urealistiske værdier (negative arealer, umulige vinkler)
        - Opgaver der kræver for avancerede metoder til niveauet
        - Tvetydige eller forvirrende formuleringer
        
        Du svarer ALTID i valid JSON format.
        """;
    
    public ValidatorAgent(
        Kernel kernel,
        AgentConfiguration configuration,
        ILogger<ValidatorAgent> logger)
        : base(kernel, configuration, logger)
    {
    }
    
    public async Task<ValidationResult> ValidateTaskAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default)
    {
        Logger.LogInformation("Validating task: {TaskId} ({TaskType})", 
            task.Id, task.TaskTypeId);
        
        var prompt = BuildValidationPrompt(task);
        var response = await ExecuteChatAsync(prompt, cancellationToken);
        
        return ParseValidationResult(response);
    }
    
    public async Task<List<(GeneratedTask Task, ValidationResult Result)>> ValidateTasksAsync(
        IEnumerable<GeneratedTask> tasks,
        CancellationToken cancellationToken = default)
    {
        var results = new List<(GeneratedTask, ValidationResult)>();
        
        foreach (var task in tasks)
        {
            if (cancellationToken.IsCancellationRequested)
                break;
                
            var result = await ValidateTaskAsync(task, cancellationToken);
            task.Validation = result;
            results.Add((task, result));
        }
        
        return results;
    }
    
    private string BuildValidationPrompt(GeneratedTask task)
    {
        var variablesJson = JsonSerializer.Serialize(task.Variables);
        var answersJson = JsonSerializer.Serialize(task.Answers);
        var stepsJson = JsonSerializer.Serialize(task.SolutionSteps);
        
        var jsonStructure = """
            {
                "isValid": true,
                "isSolvable": true,
                "hasCorrectAnswer": true,
                "difficultyAppropriate": true,
                "issues": ["liste af problemer hvis nogen"],
                "validatorNotes": "eventuelle bemærkninger eller forslag til forbedringer"
            }
            """;
        
        return $"""
            Valider følgende matematikopgave:
            
            === OPGAVE ===
            Type: {task.TaskTypeId}
            Kategori: {task.Category}
            Sværhedsgrad: {task.Difficulty}
            
            Opgavetekst:
            {task.QuestionText}
            
            LaTeX version:
            {task.QuestionLatex}
            
            Variable anvendt: {variablesJson}
            
            Svar: {answersJson}
            
            Løsningsskridt:
            {stepsJson}
            
            === VALIDER ===
            
            Kontroller grundigt:
            1. Er alle beregninger korrekte? (gennemregn selv)
            2. Giver de anvendte variable det angivne svar?
            3. Er opgaven løsbar med de givne informationer?
            4. Passer sværhedsgraden til FP9 niveau?
            5. Er opgaveteksten klar og præcis?
            6. Er eventuelle enheder korrekte?
            
            Returner et JSON objekt med denne struktur (brug true/false for boolean felter):
            {jsonStructure}
            
            Vær præcis: Kun marker som ugyldig hvis der er konkrete fejl.
            """;
    }
    
    private ValidationResult ParseValidationResult(string response)
    {
        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var result = JsonSerializer.Deserialize<ValidationResult>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                return result ?? CreateDefaultValidationResult();
            }
            
            Logger.LogWarning("Could not extract JSON from validator response");
            return CreateDefaultValidationResult();
        }
        catch (JsonException ex)
        {
            Logger.LogError(ex, "Failed to parse validator response as JSON");
            return CreateDefaultValidationResult();
        }
    }
    
    private ValidationResult CreateDefaultValidationResult()
    {
        return new ValidationResult
        {
            IsValid = false,
            IsSolvable = false,
            HasCorrectAnswer = false,
            DifficultyAppropriate = true,
            Issues = new List<string> { "Kunne ikke validere opgaven - parsing fejl" },
            ValidatorNotes = "Automatisk validering fejlede - manuel gennemgang påkrævet"
        };
    }
}

