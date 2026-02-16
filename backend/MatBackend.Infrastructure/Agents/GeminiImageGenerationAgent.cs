using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Agent that generates illustrative images for math tasks using Google's Gemini API.
/// 
/// Design philosophy:
/// 1. Use an LLM to decide whether an image would help the student understand the task.
///    The question is: "Would a visual depiction of the information in this task help the
///    student understand what they need to solve?" — if yes, generate an image.
/// 2. The image must ONLY depict information that is ALREADY explicitly stated in the task text.
///    Never introduce new numbers, items, or details that aren't in the contextText + subQuestions.
/// 3. For geometry tasks: show the shape with labeled dimensions exactly as described.
/// 4. For price/shopping tasks: show a clear price board or labeled items.
/// 5. For probability/statistics: show the objects described (dice, balls, cards, etc.)
/// 6. The image prompt must be extremely explicit and descriptive — image models need
///    far more detail than text-to-text models.
/// 
/// Uses the Gemini generateContent endpoint with responseModalities: ["TEXT", "IMAGE"].
/// </summary>
public class GeminiImageGenerationAgent : IImageGenerationAgent
{
    private readonly HttpClient _httpClient;
    private readonly AgentConfiguration _configuration;
    private readonly ILogger<GeminiImageGenerationAgent> _logger;
    private readonly string _imageOutputPath;
    
    public string Name => "GeminiImageGenerationAgent";
    public string Description => "Generates illustrative images for math tasks using Google Gemini";
    
    public GeminiImageGenerationAgent(
        HttpClient httpClient,
        AgentConfiguration configuration,
        string imageOutputPath,
        ILogger<GeminiImageGenerationAgent> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _imageOutputPath = imageOutputPath;
        _logger = logger;
        
        // Ensure output directory exists
        Directory.CreateDirectory(_imageOutputPath);
    }
    
    /// <summary>
    /// Determine whether this task would benefit from a generated illustration.
    /// 
    /// The logic: an image helps when the task describes concrete, visual things that the
    /// student needs to reason about — shapes with dimensions, items with prices on a board,
    /// colored objects in a bag, a map with distances, etc.
    /// 
    /// An image does NOT help for pure algebra, abstract equations, or tasks where the
    /// text alone is perfectly clear and a picture would just be decorative slop.
    /// </summary>
    public Task<bool> ShouldGenerateImageAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default)
    {
        if (!_configuration.ImageGenerationEnabled || string.IsNullOrEmpty(_configuration.GeminiApiKey))
            return Task.FromResult(false);
        
        // Must have a meaningful context/story
        if (string.IsNullOrWhiteSpace(task.ContextText) || task.ContextText.Length < 30)
            return Task.FromResult(false);
        
        // Gather ALL text the student sees (context + all sub-questions)
        var fullText = GetFullTaskText(task);
        var fullTextLower = fullText.ToLowerInvariant();
        
        // === ALWAYS YES: Geometry tasks with shapes and dimensions ===
        // These ALWAYS benefit from a diagram showing the shape with labeled measurements.
        if (IsGeometryWithDimensions(task, fullTextLower))
        {
            _logger.LogDebug("[{AgentName}] Task {TaskId} → IMAGE (geometry with dimensions)",
                Name, task.Id);
            return Task.FromResult(true);
        }
        
        // === ALWAYS YES: Probability tasks with physical objects ===
        // Colored balls in a bag, dice, cards, spinners — showing the objects helps.
        if (IsProbabilityWithObjects(task, fullTextLower))
        {
            _logger.LogDebug("[{AgentName}] Task {TaskId} → IMAGE (probability with physical objects)",
                Name, task.Id);
            return Task.FromResult(true);
        }
        
        // === YES: Tasks with concrete items and prices/quantities ===
        // Shopping, menus, markets — showing items with their prices/quantities as a visual aid.
        if (HasConcreteItemsWithData(fullTextLower))
        {
            _logger.LogDebug("[{AgentName}] Task {TaskId} → IMAGE (concrete items with prices/data)",
                Name, task.Id);
            return Task.FromResult(true);
        }
        
        // === YES: Tasks describing a physical setup with measurements ===
        // Gardens, rooms, pools, fences, floors — a diagram with dimensions helps.
        if (HasPhysicalSetupWithMeasurements(fullTextLower))
        {
            _logger.LogDebug("[{AgentName}] Task {TaskId} → IMAGE (physical setup with measurements)",
                Name, task.Id);
            return Task.FromResult(true);
        }
        
        // === YES: Tasks with data tables, scoreboards, or timetables ===
        if (HasDataDisplay(fullTextLower))
        {
            _logger.LogDebug("[{AgentName}] Task {TaskId} → IMAGE (data display/table/scoreboard)",
                Name, task.Id);
            return Task.FromResult(true);
        }
        
        // === NO: Pure algebra, equations, fractions without visual context ===
        // If the task is purely computational with no visual scenario, skip.
        _logger.LogDebug("[{AgentName}] Task {TaskId} skipped — no visual benefit detected",
            Name, task.Id);
        return Task.FromResult(false);
    }
    
    public async Task<string?> GenerateImageAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_configuration.GeminiApiKey))
        {
            _logger.LogWarning("Gemini API key not configured, skipping image generation");
            return null;
        }
        
        var sw = Stopwatch.StartNew();
        
        try
        {
            var prompt = BuildImagePrompt(task);
            _logger.LogInformation("[{AgentName}] Generating image for task {TaskId}: {ContextPreview}",
                Name, task.Id, task.ContextText.Length > 80 ? task.ContextText[..80] + "..." : task.ContextText);
            
            var imageBytes = await CallGeminiImageApiAsync(prompt, cancellationToken);
            
            if (imageBytes == null || imageBytes.Length == 0)
            {
                _logger.LogWarning("[{AgentName}] No image data returned for task {TaskId}", Name, task.Id);
                return null;
            }
            
            // Save image to disk
            var fileName = $"{task.Id}.png";
            var filePath = Path.Combine(_imageOutputPath, fileName);
            await File.WriteAllBytesAsync(filePath, imageBytes, cancellationToken);
            
            sw.Stop();
            _logger.LogInformation("[{AgentName}] Image generated for task {TaskId} ({Size} bytes) in {Duration}ms",
                Name, task.Id, imageBytes.Length, sw.ElapsedMilliseconds);
            
            // Return the URL path that the frontend can use
            return $"/api/images/{fileName}";
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "[{AgentName}] Failed to generate image for task {TaskId} after {Duration}ms",
                Name, task.Id, sw.ElapsedMilliseconds);
            return null;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    //  DECISION HELPERS — determine if a task benefits from an image
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Concatenate all text the student sees: contextText + all subQuestion texts.
    /// This is what we analyze to decide if an image helps and what to depict.
    /// </summary>
    internal static string GetFullTaskText(GeneratedTask task)
    {
        var sb = new StringBuilder();
        sb.AppendLine(task.ContextText);
        foreach (var sq in task.SubQuestions)
        {
            sb.AppendLine(sq.QuestionText);
        }
        return sb.ToString();
    }
    
    /// <summary>
    /// Geometry tasks that describe shapes with concrete dimensions.
    /// E.g. "rektangel 6 m bredt og 4 m dybt", "trekant med grundlinje 4 m og højde 3 m"
    /// </summary>
    internal static bool IsGeometryWithDimensions(GeneratedTask task, string fullTextLower)
    {
        var isGeoType = task.TaskTypeId.StartsWith("geo_") || 
                        task.Category.Contains("geometri");
        if (!isGeoType) return false;
        
        // Must mention at least one shape AND at least one dimension
        var hasShape = ContainsAny(fullTextLower,
            "rektangel", "trekant", "cirkel", "firkant", "kvadrat", "trapez",
            "parallelogram", "polygon", "figur", "areal", "omkreds",
            "grundlinje", "diameter", "radius", "diagonal",
            "scene", "gulv", "plads", "bane", "bassin", "have");
        
        var hasDimension = ContainsAny(fullTextLower,
            " m ", " m.", " m,", " cm ", " cm.", " cm,", " km ",
            "meter", "centimeter", "kilometer",
            "bredt", "bred", "lang", "langt", "dybt", "dyb",
            "højde", "bredde", "længde", "grundlinje", "radius", "diameter",
            "sidelængde", "side ");
        
        return hasShape && hasDimension;
    }
    
    /// <summary>
    /// Probability tasks that describe physical objects to draw from.
    /// E.g. "5 røde, 3 blå og 2 grønne bolde i en pose"
    /// </summary>
    internal static bool IsProbabilityWithObjects(GeneratedTask task, string fullTextLower)
    {
        var isProbType = task.TaskTypeId.Contains("sandsynlighed") ||
                         task.Category.Contains("sandsynlighed");
        if (!isProbType) return false;
        
        // Must mention physical objects
        return ContainsAny(fullTextLower,
            "bold", "bolde", "kugle", "kugler", "terning", "terninger",
            "kort", "spillekort", "mønt", "mønter", "pose", "skål",
            "spinner", "lykkehjul", "lodtrækning",
            "rød", "røde", "blå", "grøn", "grønne", "gul", "gule",
            "hvid", "hvide", "sort", "sorte");
    }
    
    /// <summary>
    /// Tasks with multiple concrete items that have prices, quantities, or other data.
    /// The key: at least 2 distinct items with associated numbers in the full task text.
    /// </summary>
    internal static bool HasConcreteItemsWithData(string fullTextLower)
    {
        // Count distinct "X koster/til/for Y kr" patterns across ALL task text
        var pricePatterns = System.Text.RegularExpressions.Regex.Matches(
            fullTextLower, @"\d+(?:[.,]\d+)?\s*(?:kr\.?|kroner)");
        var distinctPrices = pricePatterns
            .Select(m => System.Text.RegularExpressions.Regex.Match(m.Value, @"\d+(?:[.,]\d+)?").Value)
            .Distinct()
            .Count();
        
        // Need a scenario context (not just raw numbers) + enough data points
        var hasScenario = ContainsAny(fullTextLower,
            "køber", "koster", "betaler", "pris", "tilbud", "rabat",
            "butik", "marked", "café", "cafeteria", "kantine", "restaurant",
            "menu", "billet", "entre", "supermarked", "loppemarked",
            "bazar", "bod", "kiosk", "bager");
        
        return hasScenario && distinctPrices >= 2;
    }
    
    /// <summary>
    /// Tasks describing a physical space or object with measurements.
    /// E.g. gardens, rooms, pools, fences, floors — a top-down diagram helps.
    /// </summary>
    internal static bool HasPhysicalSetupWithMeasurements(string fullTextLower)
    {
        var hasPhysicalThing = ContainsAny(fullTextLower,
            "have", "hegn", "gulv", "flise", "værelse", "rum", "stue",
            "bassin", "pool", "svømmebassin", "bane", "legeplads",
            "terrasse", "altan", "garage", "carport", "skur",
            "mark", "grund", "jordstykke", "bygning");
        
        var hasMeasurement = ContainsAny(fullTextLower,
            "meter", " m ", " m.", " m,", "centimeter", " cm ",
            "lang", "bred", "dyb", "høj", "længde", "bredde", "højde");
        
        // Need at least 2 numbers with measurement units
        var measurementCount = System.Text.RegularExpressions.Regex.Matches(
            fullTextLower, @"\d+(?:[.,]\d+)?\s*(?:m|cm|km|meter|centimeter)\b").Count;
        
        return hasPhysicalThing && hasMeasurement && measurementCount >= 2;
    }
    
    /// <summary>
    /// Tasks with explicit data displays: scoreboards, tables, timetables, results.
    /// Only triggers when there's a clear visual data artifact (a table, a scoreboard)
    /// that the student needs to read from — not just a mention of a plan or schedule.
    /// </summary>
    internal static bool HasDataDisplay(string fullTextLower)
    {
        // Explicit visual data artifacts
        var hasDisplay = ContainsAny(fullTextLower,
            "resultattavle", "scoreboard", "pointtavle", "stillingen",
            "tabel", "skema", "oversigt");
        
        if (hasDisplay) return true;
        
        // Multiple named entities with scores/points (at least 3 data points)
        var scoreMatches = System.Text.RegularExpressions.Regex.Matches(
            fullTextLower, @"\d+\s*(?:point|mål|score|sekunder|minutter)", 
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return scoreMatches.Count >= 3;
    }
    
    // ═══════════════════════════════════════════════════════════════
    //  IMAGE PROMPT BUILDING — hyper-explicit, descriptive prompts
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Build an extremely explicit, descriptive prompt for the image model.
    /// 
    /// Image models need FAR more detail than text models. We:
    /// 1. Classify what kind of image to generate (diagram, price board, objects, etc.)
    /// 2. Extract EVERY piece of data from the task text
    /// 3. Describe the image in painstaking detail: layout, colors, labels, positions
    /// 4. Explicitly forbid adding anything not in the task
    /// </summary>
    internal string BuildImagePrompt(GeneratedTask task)
    {
        var fullText = GetFullTaskText(task);
        var fullTextLower = fullText.ToLowerInvariant();
        var imageType = ClassifyImageType(task, fullTextLower);
        
        var sb = new StringBuilder();
        
        // === GLOBAL STYLE RULES ===
        sb.AppendLine("""
            You are generating an illustration for a Danish math exam task (FP9 level, age 15-16).
            The image must help the student understand the problem by showing the key information visually.
            
            ABSOLUTE RULES — FOLLOW EXACTLY:
            
            1. ACCURACY IS EVERYTHING:
               - Include ONLY information that appears in the task text below.
               - Every number, label, name, and unit must match the task text EXACTLY.
               - Do NOT invent, add, or change ANY values. Do NOT add extra items, extra prices,
                 extra labels, or any information not explicitly written in the task.
               - If the task says "6 m bredt og 4 m dybt" then the image must show exactly 6 m and 4 m.
               - This is a math exam — wrong numbers will cause students to get wrong answers.
            
            2. VISUAL STYLE:
               - Clean, professional illustration style — like a high-quality math textbook figure.
               - White or very light background. No busy patterns or textures.
               - Bold, clean lines. High contrast. Easy to read at a glance.
               - All text in Danish. Use æ, ø, å correctly.
               - Numbers and labels must be LARGE and PERFECTLY READABLE (minimum 16pt equivalent).
               - Use a clean sans-serif font style for all text.
               - Use 3-5 flat, distinct colors maximum. No gradients, no shadows, no 3D effects.
            
            3. COMPOSITION:
               - Landscape orientation (roughly 4:3 aspect ratio).
               - The subject should fill 70-80% of the frame. No wasted space.
               - No decorative borders, watermarks, or unnecessary ornaments.
               - No people or characters unless the task specifically requires showing them.
            """);
        
        sb.AppendLine();
        sb.AppendLine("═══════════════════════════════════════");
        sb.AppendLine("TASK TEXT (this is ALL the information that exists — depict ONLY this):");
        sb.AppendLine("═══════════════════════════════════════");
        sb.AppendLine();
        sb.AppendLine($"Context: {task.ContextText}");
        sb.AppendLine();
        foreach (var sq in task.SubQuestions)
        {
            sb.AppendLine($"  {sq.Label}) {sq.QuestionText}");
        }
        sb.AppendLine();
        sb.AppendLine("═══════════════════════════════════════");
        sb.AppendLine("IMAGE DESCRIPTION — what to draw:");
        sb.AppendLine("═══════════════════════════════════════");
        sb.AppendLine();
        
        // === TYPE-SPECIFIC DETAILED INSTRUCTIONS ===
        switch (imageType)
        {
            case ImageType.GeometryDiagram:
                BuildGeometryPrompt(sb, task, fullText, fullTextLower);
                break;
            case ImageType.ProbabilityObjects:
                BuildProbabilityPrompt(sb, task, fullText, fullTextLower);
                break;
            case ImageType.PriceBoard:
                BuildPriceBoardPrompt(sb, task, fullText, fullTextLower);
                break;
            case ImageType.MeasurementDiagram:
                BuildMeasurementPrompt(sb, task, fullText, fullTextLower);
                break;
            case ImageType.DataTable:
                BuildDataTablePrompt(sb, task, fullText, fullTextLower);
                break;
            default:
                BuildGenericPrompt(sb, task, fullText, fullTextLower);
                break;
        }
        
        // === FINAL SAFETY NET ===
        sb.AppendLine();
        sb.AppendLine("""
            ═══════════════════════════════════════
            FINAL CHECKLIST — verify before generating:
            ═══════════════════════════════════════
            
            ✓ Every number in the image matches the task text exactly
            ✓ No extra items, labels, or data that aren't in the task
            ✓ All text is in Danish with correct æ, ø, å
            ✓ Labels and numbers are large, bold, and easy to read
            ✓ Clean white/light background, no clutter
            ✓ No people or characters (unless specifically needed)
            ✓ Landscape orientation, subject fills the frame
            
            Generate ONLY the image. No text response needed.
            """);
        
        return sb.ToString();
    }
    
    // ─── Geometry: shapes with labeled dimensions ───
    
    /// <summary>
    /// Build geometry prompt using a two-phase approach:
    /// Phase 1: Call an LLM (text-only) to reason about the geometry mathematically and produce
    ///          exact vertex coordinates, edge connections, and minimal dimension labels.
    /// Phase 2: Feed those exact coordinates into the image model prompt.
    /// 
    /// This approach handles ANY geometry — simple rectangles, composite figures, Theodorus spirals,
    /// fractal-like constructions, or any creative mathematical shape — because the LLM can reason
    /// about the math and compute coordinates that a hardcoded parser never could.
    /// </summary>
    private async Task BuildGeometryPromptAsync(StringBuilder sb, GeneratedTask task, string fullText)
    {
        sb.AppendLine("Draw a PRECISE GEOMETRIC DIAGRAM viewed from directly above (top-down, 2D, no perspective).");
        sb.AppendLine("This should look like a figure from a Danish math textbook — clean, precise, labeled.");
        sb.AppendLine();
        
        // Phase 1: Ask an LLM to reason about the geometry and produce exact coordinates
        var geometrySpec = await ReasonAboutGeometryAsync(fullText);
        
        if (!string.IsNullOrWhiteSpace(geometrySpec))
        {
            sb.AppendLine("EXACT FIGURE SPECIFICATION (computed by a math engine — follow EXACTLY):");
            sb.AppendLine();
            sb.AppendLine(geometrySpec);
        }
        else
        {
            // Fallback: LLM reasoning failed, give the image model the raw text
            sb.AppendLine("Draw the geometric figure described in this task text.");
            sb.AppendLine("Read it carefully and draw the figure EXACTLY as described.");
            sb.AppendLine();
            sb.AppendLine($"TASK TEXT: \"{TruncateText(fullText, 800)}\"");
        }
        
        sb.AppendLine();
        sb.AppendLine("DRAWING STYLE:");
        sb.AppendLine("  - Bold black outlines (2-3px line weight) for all shape edges.");
        sb.AppendLine("  - Fill each distinct region with a DIFFERENT light pastel color");
        sb.AppendLine("    (e.g. light blue for one shape, light green for another).");
        sb.AppendLine("  - Dimension arrows: thin lines with small arrowheads at both ends,");
        sb.AppendLine("    placed OUTSIDE the shape, connected by thin perpendicular extension lines.");
        sb.AppendLine("  - Dimension text: bold, large, placed next to the arrow (e.g. \"6 m\").");
        sb.AppendLine("  - Label corners with capital letters A, B, C, D, E, F... in order.");
        sb.AppendLine("  - If a region is cut out / removed, show it with a dashed outline and no fill.");
        sb.AppendLine("  - If angles are mentioned, mark them with a small arc and the degree value.");
        sb.AppendLine("  - Right angles (90°) should be marked with a small square in the corner.");
        sb.AppendLine("  - Proportions MUST match the coordinates given above.");
    }
    
    /// <summary>
    /// Synchronous wrapper for BuildGeometryPromptAsync, used by the synchronous BuildImagePrompt.
    /// If the async geometry reasoning fails or times out, falls back to basic text description.
    /// </summary>
    private void BuildGeometryPrompt(StringBuilder sb, GeneratedTask task, string fullText, string fullTextLower)
    {
        try
        {
            // Run the async geometry reasoning with a timeout
            var geometryTask = BuildGeometryPromptAsync(sb, task, fullText);
            if (!geometryTask.Wait(TimeSpan.FromSeconds(30)))
            {
                _logger.LogWarning("[{AgentName}] Geometry reasoning timed out, using fallback", Name);
                BuildGeometryPromptFallback(sb, fullText);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[{AgentName}] Geometry reasoning failed, using fallback", Name);
            BuildGeometryPromptFallback(sb, fullText);
        }
    }
    
    private static void BuildGeometryPromptFallback(StringBuilder sb, string fullText)
    {
        sb.AppendLine("Draw a PRECISE GEOMETRIC DIAGRAM viewed from directly above (top-down, 2D, no perspective).");
        sb.AppendLine("This should look like a figure from a Danish math textbook — clean, precise, labeled.");
        sb.AppendLine();
        sb.AppendLine($"TASK TEXT: \"{TruncateText(fullText, 800)}\"");
        sb.AppendLine();
        sb.AppendLine("CRITICAL RULES:");
        sb.AppendLine("  - Only label dimensions that are EXPLICITLY stated in the text.");
        sb.AppendLine("  - Do NOT label sides whose length can be derived from other given dimensions.");
        sb.AppendLine("  - Proportions must match the given dimensions.");
        sb.AppendLine("  - Bold black outlines, pastel fills, dimension arrows outside the shape.");
        sb.AppendLine("  - Right angles marked with small squares.");
    }
    
    // ═══════════════════════════════════════════════════════════════
    //  LLM-BASED GEOMETRY REASONING
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The geometry reasoning prompt. This is the key to the whole system.
    /// 
    /// We ask an LLM to:
    /// 1. Understand the mathematical structure of the figure
    /// 2. Compute exact vertex coordinates (handling √2, π, trigonometry, etc.)
    /// 3. Determine which edges to draw (solid, dashed, arcs)
    /// 4. Decide the MINIMAL set of dimension labels (only non-derivable ones)
    /// 5. Output a structured specification so precise that a blindfolded person could draw it
    /// </summary>
    internal static string GeometryReasoningPrompt => """
        You are a mathematical geometry engine. Your job is to read a math task description and produce
        an EXACT, UNAMBIGUOUS drawing specification that an image-generation AI can follow perfectly.
        
        Think of it this way: your output must be so precise that a BLINDFOLDED person hearing it
        read aloud could draw the figure correctly on graph paper.
        
        STEP 1 — UNDERSTAND THE MATH:
        Read the task text carefully. Identify:
        - What shapes are described (rectangles, triangles, circles, arcs, spirals, etc.)
        - Their exact dimensions (including computed values like √2, π·r², etc.)
        - How they connect (shared edges, attached sides, cutouts, sequences, spirals)
        - Any mathematical pattern or series (e.g. Theodorus spiral, geometric series, etc.)
        
        STEP 2 — COMPUTE EXACT COORDINATES:
        Place the figure on a coordinate system. For each vertex/point:
        - Compute its (x, y) position to 2 decimal places
        - Use actual math: if a hypotenuse is √2, compute 1.41
        - If shapes are attached, compute where they connect precisely
        - Ensure the figure is PHYSICALLY POSSIBLE at the given dimensions
        
        STEP 3 — SPECIFY EDGES:
        For each edge, specify:
        - Start point and end point (by label or coordinates)
        - Line style: "solid" (visible outline), "dashed" (construction/height line), "arc" (curved)
        - For arcs: center, radius, start angle, end angle
        
        STEP 4 — MINIMAL DIMENSION LABELS:
        This is CRITICAL. Only include labels for dimensions that:
        - Are EXPLICITLY stated in the task text as given information
        - Cannot be derived from other given dimensions
        
        DO NOT label:
        - Shared edges (if shape A is 6m wide and shape B shares that edge, don't label it twice)
        - Opposite sides of rectangles (if width is given, the opposite side is the same)
        - Computed values the student needs to find (that's the exercise!)
        
        STEP 5 — OUTPUT FORMAT:
        Respond with ONLY the drawing specification in this exact format (no other text):
        
        VERTICES:
        A = (x, y) — description
        B = (x, y) — description
        ...
        
        EDGES:
        A → B : solid — description
        B → C : solid
        C → D : dashed — height line
        arc center=(x,y) r=R from A to B counterclockwise : solid
        ...
        
        REGIONS:
        [A, B, C, D] : light blue — "Rectangle (scene)"
        [D, E, F] : light green — "Triangle (catwalk)"
        ...
        
        DIMENSION LABELS (only non-derivable, explicitly given values):
        A → B : "6 m" outside-bottom
        B → C : "4 m" outside-right
        height from F to edge D→E : "3 m" left-of-dashed-line
        ...
        
        RIGHT ANGLE MARKS:
        at B (edges A→B and B→C)
        at D (edges C→D and D→E)
        ...
        
        ANGLE MARKS (if any angles are given in the task):
        at C : 45° (edges B→C and C→D)
        ...
        
        IMPORTANT RULES:
        - Every coordinate must be numerically computed (no symbolic expressions like √2 in coordinates)
        - The figure must be geometrically valid and drawable
        - Proportions must be correct (a 6m side must be 1.5× a 4m side visually)
        - If the task describes a mathematical pattern (spiral, series, fractal), compute ALL vertices
        - Shared/internal edges between attached shapes should be "dashed" not "solid"
        """;
    
    /// <summary>
    /// Call the Gemini text API to reason about geometry and produce exact coordinates.
    /// </summary>
    internal async Task<string?> ReasonAboutGeometryAsync(string fullTaskText, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_configuration.GeminiApiKey))
            return null;
        
        var prompt = $"""
            {GeometryReasoningPrompt}
            
            ═══════════════════════════════════════
            TASK TEXT TO ANALYZE:
            ═══════════════════════════════════════
            
            {fullTaskText}
            
            ═══════════════════════════════════════
            
            Now compute the exact coordinates and produce the drawing specification.
            Remember: ONLY label dimensions that are explicitly given in the task text and cannot be derived.
            """;
        
        try
        {
            var result = await CallGeminiTextApiAsync(prompt, cancellationToken);
            
            if (string.IsNullOrWhiteSpace(result))
            {
                _logger.LogWarning("[{AgentName}] Geometry reasoning returned empty result", Name);
                return null;
            }
            
            _logger.LogDebug("[{AgentName}] Geometry reasoning produced {Length} chars of specification", 
                Name, result.Length);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[{AgentName}] Geometry reasoning failed", Name);
            return null;
        }
    }
    
    /// <summary>
    /// Call the Gemini API for text-only responses (no image generation).
    /// Used for the geometry reasoning step.
    /// </summary>
    private async Task<string?> CallGeminiTextApiAsync(string prompt, CancellationToken cancellationToken)
    {
        var model = _configuration.GeminiModelId.Replace("-image-preview", ""); // Use base model for text
        // If the model doesn't have a text variant, use gemini-2.0-flash for speed
        if (model.Contains("image"))
            model = "gemini-2.0-flash";
            
        var apiKey = _configuration.GeminiApiKey;
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.1, // Low temperature for precise math reasoning
                topP = 0.95,
                topK = 40,
                maxOutputTokens = 4096
            }
        };
        
        var jsonContent = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });
        
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };
        
        var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("[{AgentName}] Gemini text API error {StatusCode}: {Body}",
                Name, response.StatusCode, responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return null;
        }
        
        // Extract text from response
        return ExtractTextFromResponse(responseBody);
    }
    
    /// <summary>
    /// Extract text content from a Gemini API response.
    /// </summary>
    private string? ExtractTextFromResponse(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var root = doc.RootElement;
            
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                return null;
            
            var content = candidates[0].GetProperty("content");
            var parts = content.GetProperty("parts");
            
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement))
                {
                    return textElement.GetString();
                }
            }
            
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{AgentName}] Failed to parse Gemini text response", Name);
            return null;
        }
    }
    
    // ─── Probability: colored objects in containers ───
    
    private void BuildProbabilityPrompt(StringBuilder sb, GeneratedTask task, string fullText, string fullTextLower)
    {
        sb.AppendLine("Draw the PHYSICAL OBJECTS described in this probability task.");
        sb.AppendLine("Show them clearly so the student can see exactly what they're working with.");
        sb.AppendLine();
        
        // Extract colored objects
        var objects = ExtractColoredObjects(fullText, fullTextLower);
        
        if (objects.Count > 0)
        {
            sb.AppendLine("Objects to show:");
            foreach (var obj in objects)
            {
                sb.AppendLine($"  • {obj}");
            }
            sb.AppendLine();
        }
        
        sb.AppendLine("LAYOUT:");
        sb.AppendLine("  - Show a container (bag, bowl, box — whatever the task describes) in the center.");
        sb.AppendLine("  - Arrange ALL the objects visibly — either spread out next to the container,");
        sb.AppendLine("    or visible inside a transparent/open container.");
        sb.AppendLine("  - Each object must be clearly the correct COLOR as described.");
        sb.AppendLine("  - Objects should be clearly countable — the student should be able to count them.");
        sb.AppendLine("  - Add a small label or legend showing: \"5 røde, 3 blå, 2 grønne\" (matching the task).");
        sb.AppendLine("  - Objects should be simple, uniform shapes (circles/spheres for balls, etc.).");
        sb.AppendLine("  - Group objects by color for easy counting.");
        
        sb.AppendLine();
        sb.AppendLine("EXACT TEXT TO BASE THE IMAGE ON:");
        sb.AppendLine($"\"{TruncateText(fullText, 500)}\"");
    }
    
    // ─── Price board: items with prices ───
    
    private void BuildPriceBoardPrompt(StringBuilder sb, GeneratedTask task, string fullText, string fullTextLower)
    {
        sb.AppendLine("Draw a PRICE DISPLAY showing the items and prices from this task.");
        sb.AppendLine();
        
        // Extract items with prices
        var items = ExtractPricedItems(fullText);
        
        if (items.Count > 0)
        {
            sb.AppendLine("Items and prices to display:");
            foreach (var item in items)
            {
                sb.AppendLine($"  • {item.name}: {item.price}");
            }
            sb.AppendLine();
        }
        
        // Determine the best visual format based on context
        if (ContainsAny(fullTextLower, "menu", "café", "cafeteria", "kantine", "restaurant"))
        {
            sb.AppendLine("FORMAT: A MENU BOARD — like a chalkboard or wooden sign at a Danish café.");
            sb.AppendLine("  - Rectangular board, viewed straight-on.");
            sb.AppendLine("  - Header: \"Menu\" or the venue name if mentioned.");
            sb.AppendLine("  - Each item on its own line: item name on the left, price on the right.");
            sb.AppendLine("  - Use dots or a line between name and price for readability.");
            sb.AppendLine("  - Warm, inviting colors (dark board, white/cream text).");
        }
        else if (ContainsAny(fullTextLower, "loppemarked", "marked", "bazar", "bod"))
        {
            sb.AppendLine("FORMAT: ITEMS WITH PRICE TAGS — like items displayed at a flea market.");
            sb.AppendLine("  - Show simple, recognizable icons for each item (book, game, toy, etc.).");
            sb.AppendLine("  - Each item has a clearly visible price tag attached.");
            sb.AppendLine("  - Arrange items in a neat row or grid.");
            sb.AppendLine("  - Price tags should be large, bold, easy to read.");
        }
        else if (ContainsAny(fullTextLower, "billet", "entre", "adgang", "tivoli", "biograf", "zoo"))
        {
            sb.AppendLine("FORMAT: A TICKET PRICE SIGN — like an entrance sign at a venue.");
            sb.AppendLine("  - Clean rectangular sign, viewed straight-on.");
            sb.AppendLine("  - Header with venue name if mentioned.");
            sb.AppendLine("  - Ticket categories and prices in a neat table/list.");
        }
        else
        {
            sb.AppendLine("FORMAT: A clean PRICE LIST or INFO SIGN showing the items and their prices.");
            sb.AppendLine("  - Simple, organized layout. Each item clearly labeled with its price.");
        }
        
        // Add discount info if present
        if (ContainsAny(fullTextLower, "rabat", "tilbud", "% "))
        {
            sb.AppendLine();
            sb.AppendLine("DISCOUNT/OFFER: The task mentions a discount or offer.");
            sb.AppendLine("If a specific percentage is mentioned, show it as a small banner or sticker");
            sb.AppendLine("on the sign (e.g. \"25% RABAT\" or \"TILBUD\"). Only show discounts explicitly");
            sb.AppendLine("mentioned in the task text.");
        }
        
        sb.AppendLine();
        sb.AppendLine("EXACT TEXT TO BASE THE IMAGE ON:");
        sb.AppendLine($"\"{TruncateText(fullText, 500)}\"");
    }
    
    // ─── Measurement diagram: physical spaces with dimensions ───
    
    private void BuildMeasurementPrompt(StringBuilder sb, GeneratedTask task, string fullText, string fullTextLower)
    {
        // Measurement diagrams (gardens, pools, rooms) are really just geometry tasks
        // with a physical context. Use the same LLM-based geometry reasoning.
        BuildGeometryPrompt(sb, task, fullText, fullTextLower);
    }
    
    // ─── Data table: scoreboards, results, timetables ───
    
    private void BuildDataTablePrompt(StringBuilder sb, GeneratedTask task, string fullText, string fullTextLower)
    {
        sb.AppendLine("Draw a clean DATA TABLE or SCOREBOARD showing the information from this task.");
        sb.AppendLine();
        sb.AppendLine("STYLE:");
        sb.AppendLine("  - Clean table with bold headers and clear cell borders.");
        sb.AppendLine("  - Alternating light row colors (white and very light gray) for readability.");
        sb.AppendLine("  - Bold, large text in all cells. Numbers especially must be very clear.");
        sb.AppendLine("  - Include units in the header row where applicable.");
        sb.AppendLine("  - If it's a scoreboard, use a sporty but clean design.");
        sb.AppendLine();
        sb.AppendLine("EXACT TEXT TO BASE THE TABLE ON:");
        sb.AppendLine($"\"{TruncateText(fullText, 500)}\"");
        sb.AppendLine();
        sb.AppendLine("Extract ALL data points from the text above and display them in the table.");
        sb.AppendLine("Include ONLY data that appears in the text. Do NOT add extra rows or columns.");
    }
    
    // ─── Generic: fallback for other visual tasks ───
    
    private void BuildGenericPrompt(StringBuilder sb, GeneratedTask task, string fullText, string fullTextLower)
    {
        sb.AppendLine("Draw a clear, informative illustration that shows the key information from this task.");
        sb.AppendLine("Focus on the CENTRAL DATA the student needs to solve the problem.");
        sb.AppendLine();
        sb.AppendLine("The illustration should be:");
        sb.AppendLine("  - Simple and focused — show only what's in the task text.");
        sb.AppendLine("  - Like a textbook figure — clean, professional, informative.");
        sb.AppendLine("  - All numbers and labels clearly readable.");
        sb.AppendLine();
        sb.AppendLine("EXACT TEXT TO BASE THE IMAGE ON:");
        sb.AppendLine($"\"{TruncateText(fullText, 500)}\"");
        sb.AppendLine();
        sb.AppendLine("Show the key information visually. Do NOT add anything not in the text.");
    }
    
    // ═══════════════════════════════════════════════════════════════
    //  DATA EXTRACTION HELPERS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Classify what type of image best serves this task.
    /// </summary>
    internal static ImageType ClassifyImageType(GeneratedTask task, string fullTextLower)
    {
        // Geometry tasks → geometric diagram
        if (task.TaskTypeId.StartsWith("geo_") || task.Category.Contains("geometri"))
        {
            if (ContainsAny(fullTextLower, "rektangel", "trekant", "cirkel", "firkant", "kvadrat",
                "trapez", "parallelogram", "figur", "sammensat"))
                return ImageType.GeometryDiagram;
        }
        
        // Probability with physical objects → show the objects
        if (task.TaskTypeId.Contains("sandsynlighed") || task.Category.Contains("sandsynlighed"))
        {
            if (ContainsAny(fullTextLower, "bold", "kugle", "terning", "kort", "mønt", "pose", "skål"))
                return ImageType.ProbabilityObjects;
        }
        
        // Scoreboards and data tables
        if (ContainsAny(fullTextLower, "resultattavle", "scoreboard", "pointtavle", "tabel", "skema", "oversigt"))
            return ImageType.DataTable;
        
        // Physical spaces with measurements → floor plan
        if (ContainsAny(fullTextLower, "have", "hegn", "gulv", "flise", "værelse", "bassin", "bane", "terrasse"))
        {
            if (ContainsAny(fullTextLower, "meter", " m ", "lang", "bred", "dyb", "høj"))
                return ImageType.MeasurementDiagram;
        }
        
        // Items with prices → price board
        var priceCount = System.Text.RegularExpressions.Regex.Matches(
            fullTextLower, @"\d+(?:[.,]\d+)?\s*(?:kr\.?|kroner)").Count;
        if (priceCount >= 2 && ContainsAny(fullTextLower, 
            "køber", "koster", "betaler", "pris", "menu", "café", "butik", "marked", "billet"))
            return ImageType.PriceBoard;
        
        return ImageType.Generic;
    }
    
    /// <summary>
    /// Extract shape descriptions from geometry task text.
    /// Returns human-readable descriptions like "Et rektangel, 6 m bredt og 4 m dybt"
    /// </summary>
    internal static List<string> ExtractShapeDescriptions(string fullText, string fullTextLower)
    {
        var shapes = new List<string>();
        var sentences = fullText.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
        
        foreach (var sentence in sentences)
        {
            var lower = sentence.ToLowerInvariant().Trim();
            // If the sentence mentions a shape AND a dimension, include it
            var hasShape = ContainsAny(lower,
                "rektangel", "trekant", "cirkel", "firkant", "kvadrat", "trapez",
                "parallelogram", "grundlinje", "diameter", "radius",
                "scene", "gulv", "catwalk", "trappe", "hjørne");
            var hasDim = System.Text.RegularExpressions.Regex.IsMatch(lower, 
                @"\d+(?:[.,]\d+)?\s*(?:m|cm|km|meter|centimeter)");
            
            if (hasShape && hasDim)
            {
                shapes.Add(sentence.Trim());
            }
        }
        
        return shapes;
    }
    
    /// <summary>
    /// Extract colored objects from probability task text.
    /// Returns descriptions like "5 røde bolde", "3 blå bolde", "2 grønne bolde"
    /// </summary>
    internal static List<string> ExtractColoredObjects(string fullText, string fullTextLower)
    {
        var objects = new List<string>();
        
        // Pattern: "N farve objekt" — e.g. "5 røde bolde", "3 blå kugler"
        var pattern = @"(\d+)\s+(røde?|blå|grønne?|gule?|hvide?|sorte?|lilla|orange)\s+(\w+)";
        var matches = System.Text.RegularExpressions.Regex.Matches(fullText, pattern, 
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        
        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            objects.Add(match.Value);
        }
        
        // Also try "N objekt (farve)" patterns
        if (objects.Count == 0)
        {
            // Fallback: extract sentences mentioning colors and counts
            var sentences = fullText.Split(new[] { '.', ',', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var s in sentences)
            {
                var lower = s.ToLowerInvariant().Trim();
                if (System.Text.RegularExpressions.Regex.IsMatch(lower, @"\d+\s+\w*(?:rød|blå|grøn|gul|hvid|sort)"))
                {
                    objects.Add(s.Trim());
                }
            }
        }
        
        return objects;
    }
    
    /// <summary>
    /// Extract items with prices from task text.
    /// Returns (name, price) pairs like ("Sandwich", "60 kr"), ("Sodavand", "24 kr")
    /// </summary>
    internal static List<(string name, string price)> ExtractPricedItems(string fullText)
    {
        var items = new List<(string name, string price)>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        
        // Pattern: "X koster Y kr"
        var patterns = new[]
        {
            @"(?:en|et|én)?\s*(\w[\w\s]{1,30}?)\s+koster\s+(\d+(?:[.,]\d+)?\s*kr\.?)",
            @"(\w[\w\s]{1,30}?)\s+til\s+(\d+(?:[.,]\d+)?\s*kr\.?)",
            @"(\w[\w\s]{1,30}?)\s+(?:koster|er|à)\s+(\d+(?:[.,]\d+)?\s*kr\.?)",
            @"(\w[\w\s]{1,30}?):\s*(\d+(?:[.,]\d+)?\s*kr\.?)",
        };
        
        foreach (var pattern in patterns)
        {
            foreach (System.Text.RegularExpressions.Match match in 
                System.Text.RegularExpressions.Regex.Matches(fullText, pattern, 
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            {
                var name = match.Groups[1].Value.Trim();
                var price = match.Groups[2].Value.Trim();
                
                // Clean up name — remove leading articles/prepositions
                name = System.Text.RegularExpressions.Regex.Replace(name, 
                    @"^(?:en|et|én|der|som|at|og|i|på|til|med|fra|af)\s+", "", 
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
                
                if (name.Length > 1 && !seen.Contains(name))
                {
                    seen.Add(name);
                    items.Add((CapitalizeFirst(name), price));
                }
            }
        }
        
        return items;
    }
    
    /// <summary>
    /// Extract measurements from task text.
    /// Returns descriptions like "Bredde: 6 m", "Dybde: 4 m", "Grundlinje: 4 m"
    /// </summary>
    internal static List<string> ExtractMeasurements(string fullText)
    {
        var measurements = new List<string>();
        
        // Find all "number + unit" with surrounding context
        var matches = System.Text.RegularExpressions.Regex.Matches(fullText, 
            @"(\w+(?:\s+\w+)?)\s+(?:er\s+)?(\d+(?:[.,]\d+)?)\s*(m|cm|km|meter|centimeter|kilometer)\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        
        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            var context = match.Groups[1].Value.Trim();
            var value = match.Groups[2].Value;
            var unit = match.Groups[3].Value;
            measurements.Add($"{CapitalizeFirst(context)}: {value} {unit}");
        }
        
        return measurements;
    }
    
    // ═══════════════════════════════════════════════════════════════
    //  UTILITY HELPERS
    // ═══════════════════════════════════════════════════════════════
    
    internal static bool ContainsAny(string text, params string[] keywords)
    {
        return keywords.Any(kw => text.Contains(kw));
    }
    
    private static string CapitalizeFirst(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return char.ToUpper(s[0]) + s[1..];
    }
    
    private static string TruncateText(string text, int maxLength)
    {
        if (text.Length <= maxLength) return text;
        return text[..maxLength] + "...";
    }
    
    // ═══════════════════════════════════════════════════════════════
    //  GEMINI API INTERACTION
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Call the Gemini API to generate an image.
    /// Uses the generateContent endpoint with responseModalities: ["IMAGE"]
    /// </summary>
    private async Task<byte[]?> CallGeminiImageApiAsync(string prompt, CancellationToken cancellationToken)
    {
        var model = _configuration.GeminiModelId;
        var apiKey = _configuration.GeminiApiKey;
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                responseModalities = new[] { "TEXT", "IMAGE" },
                temperature = 1.0,
                topP = 0.95,
                topK = 40
            }
        };
        
        var jsonContent = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });
        
        _logger.LogDebug("[{AgentName}] Calling Gemini API: {Url}", Name, url.Replace(apiKey, "***"));
        
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };
        
        var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("[{AgentName}] Gemini API error {StatusCode}: {Body}",
                Name, response.StatusCode, responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return null;
        }
        
        // Parse the response to extract the image data
        return ExtractImageFromResponse(responseBody);
    }
    
    /// <summary>
    /// Extract base64-encoded image data from the Gemini API response.
    /// </summary>
    private byte[]? ExtractImageFromResponse(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var root = doc.RootElement;
            
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            {
                _logger.LogWarning("[{AgentName}] No candidates in Gemini response", Name);
                return null;
            }
            
            var content = candidates[0].GetProperty("content");
            var parts = content.GetProperty("parts");
            
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("inlineData", out var inlineData))
                {
                    var mimeType = inlineData.GetProperty("mimeType").GetString();
                    var base64Data = inlineData.GetProperty("data").GetString();
                    
                    if (!string.IsNullOrEmpty(base64Data))
                    {
                        _logger.LogDebug("[{AgentName}] Extracted image: {MimeType}, {Length} chars base64",
                            Name, mimeType, base64Data.Length);
                        return Convert.FromBase64String(base64Data);
                    }
                }
            }
            
            _logger.LogWarning("[{AgentName}] No inlineData found in Gemini response parts", Name);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{AgentName}] Failed to parse Gemini image response", Name);
            return null;
        }
    }
}

/// <summary>
/// Classification of what type of image to generate for a task.
/// </summary>
public enum ImageType
{
    GeometryDiagram,
    ProbabilityObjects,
    PriceBoard,
    MeasurementDiagram,
    DataTable,
    Generic
}

