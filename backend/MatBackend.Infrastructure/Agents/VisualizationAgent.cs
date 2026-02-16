using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Agent responsible for creating visualizations for tasks
/// </summary>
public class VisualizationAgent : BaseSemanticKernelAgent, IVisualizationAgent
{
    public override string Name => "VisualizationAgent";
    public override string Description => "Creates SVG, TikZ, and chart visualizations for mathematical tasks";
    
    protected override string SystemPrompt => """
        Du er en ekspert i at skabe matematiske visualiseringer til danske folkeskoleprøver.
        Din rolle er at generere præcise og klare figurer der understøtter opgaveteksten.
        
        Du kan skabe følgende typer visualiseringer:
        
        1. SVG - For simple geometriske figurer
           - Trekanter, firkanter, cirkler
           - Koordinatsystemer med punkter
           - Simple diagrammer
        
        2. TikZ - For komplekse matematiske figurer
           - Præcise geometriske konstruktioner
           - Grafer og funktioner
           - Enheder og måleangivelser
        
        3. Charts - For statistiske data
           - Søjlediagrammer
           - Boksplot
           - Cirkeldiagrammer
        
        Krav til visualiseringer:
        - Præcise mål og proportioner
        - Klar markering af værdier og enheder
        - Passende størrelse (ikke for stor eller lille)
        - Tilgængelig alt-tekst
        - Danske labels hvor relevant
        
        Du svarer ALTID i valid JSON format.
        """;
    
    public VisualizationAgent(
        Kernel kernel,
        AgentConfiguration configuration,
        ILogger<VisualizationAgent> logger)
        : base(kernel, configuration, logger)
    {
    }
    
    public Task<bool> NeedsVisualizationAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default)
    {
        // Categories that typically need visualizations
        var visualCategories = new[] 
        { 
            "geometri_og_maaling", 
            "statistik_og_sandsynlighed" 
        };
        
        var visualTaskTypes = new[]
        {
            "geo_sammensat_figur",
            "geo_projektioner",
            "geo_vinkelsum",
            "stat_boksplot",
            "stat_soejlediagram"
        };
        
        var needsVisualization = visualCategories.Contains(task.Category) || 
               visualTaskTypes.Contains(task.TaskTypeId);
        
        return Task.FromResult(needsVisualization);
    }
    
    public async Task<TaskVisualization?> CreateVisualizationAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default)
    {
        if (!await NeedsVisualizationAsync(task, cancellationToken))
        {
            Logger.LogDebug("Task {TaskId} does not need visualization", task.Id);
            return null;
        }
        
        Logger.LogInformation("Creating visualization for task: {TaskId} ({TaskType})",
            task.Id, task.TaskTypeId);
        
        var visualizationType = DetermineVisualizationType(task);
        var prompt = BuildVisualizationPrompt(task, visualizationType);
        var response = await ExecuteChatAsync(prompt, cancellationToken);
        
        return ParseVisualization(response, visualizationType);
    }
    
    private string DetermineVisualizationType(GeneratedTask task)
    {
        return task.TaskTypeId switch
        {
            "stat_boksplot" => "chart",
            "stat_soejlediagram" => "chart",
            "stat_sandsynlighed" => "chart",
            "geo_sammensat_figur" => "svg",
            "geo_projektioner" => "tikz",
            "geo_vinkelsum" => "svg",
            _ => task.Category == "statistik_og_sandsynlighed" ? "chart" : "svg"
        };
    }
    
    private string BuildVisualizationPrompt(GeneratedTask task, string visualizationType)
    {
        var variablesJson = JsonSerializer.Serialize(task.Variables);
        var vizTypeUpper = visualizationType.ToUpper();
        
        var typeSpecificInstructions = visualizationType switch
        {
            "svg" => """
                Generer SVG kode for figuren.
                - Brug viewBox for skalerbarhed
                - Tilføj passende stroke og fill attributter
                - Inkluder text elementer for mål og labels
                - Brug danske bogstaver for punktnavne (A, B, C...)
                
                SVG skal være komplet og selvstændig.
                """,
            "tikz" => """
                Generer TikZ kode for figuren.
                - Brug \begin{tikzpicture} og \end{tikzpicture}
                - Tilføj koordinater og labels
                - Brug \draw for linjer og \fill for punkter
                - Inkluder \node for tekst og mål
                
                TikZ koden skal kunne kompileres direkte.
                """,
            "chart" => """
                Generer chart data i JSON format.
                - chartType: "bar", "boxplot", "pie", eller "line"
                - labels: Array af x-akse labels
                - series: Array af dataserier med name, values, og color
                
                Data skal matche opgavens værdier præcist.
                """,
            _ => "Generer passende visualisering."
        };
        
        var jsonExample = $$"""
            {
                "type": "{{visualizationType}}",
                "svgContent": "...",
                "tikzCode": "...",
                "chartData": { "chartType": "bar", "labels": [], "series": [] },
                "altText": "Beskrivelse af figuren for skærmlæsere"
            }
            """;
        
        return $"""
            Opret en visualisering til følgende matematikopgave:
            
            === OPGAVE ===
            Type: {task.TaskTypeId}
            Kategori: {task.Category}
            
            Opgavetekst:
            {task.QuestionText}
            
            Variable: {variablesJson}
            
            === VISUALISERINGSTYPE: {vizTypeUpper} ===
            
            {typeSpecificInstructions}
            
            Returner et JSON objekt (udfyld kun det relevante felt for typen):
            {jsonExample}
            
            Figuren SKAL være præcis og matche opgavens værdier.
            """;
    }
    
    private TaskVisualization? ParseVisualization(string response, string expectedType)
    {
        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var visualization = JsonSerializer.Deserialize<TaskVisualization>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (visualization != null)
                {
                    visualization.Type = expectedType;
                    return visualization;
                }
            }
            
            Logger.LogWarning("Could not extract visualization JSON from response");
            return CreatePlaceholderVisualization(expectedType);
        }
        catch (JsonException ex)
        {
            Logger.LogError(ex, "Failed to parse visualization response as JSON");
            return CreatePlaceholderVisualization(expectedType);
        }
    }
    
    private TaskVisualization CreatePlaceholderVisualization(string type)
    {
        return new TaskVisualization
        {
            Type = type,
            SvgContent = type == "svg" ? CreatePlaceholderSvg() : null,
            TikzCode = type == "tikz" ? CreatePlaceholderTikz() : null,
            ChartData = type == "chart" ? CreatePlaceholderChart() : null,
            AltText = "Visualisering kunne ikke genereres automatisk"
        };
    }
    
    private string CreatePlaceholderSvg()
    {
        return """
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="180" height="180" fill="none" stroke="#ccc" stroke-dasharray="5,5"/>
                <text x="100" y="100" text-anchor="middle" fill="#999">Figur mangler</text>
            </svg>
            """;
    }
    
    private string CreatePlaceholderTikz()
    {
        return """
            \begin{tikzpicture}
                \draw[dashed, gray] (0,0) rectangle (4,4);
                \node at (2,2) {Figur mangler};
            \end{tikzpicture}
            """;
    }
    
    private ChartData CreatePlaceholderChart()
    {
        return new ChartData
        {
            ChartType = "bar",
            Labels = new List<string> { "A", "B", "C" },
            Series = new List<DataSeries>
            {
                new DataSeries
                {
                    Name = "Data",
                    Values = new List<double> { 0, 0, 0 },
                    Color = "#cccccc"
                }
            }
        };
    }
}

