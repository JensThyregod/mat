using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using MatBackend.Core.Models.Terminsprove;
using MatBackend.Infrastructure.Agents;

namespace MatBackend.Tests.Agents;

/// <summary>
/// Tests for the GeminiImageGenerationAgent.
/// Covers: ShouldGenerateImageAsync decision logic, prompt building, API interaction,
/// image extraction, and error handling.
/// </summary>
public class GeminiImageGenerationAgentTests : IDisposable
{
    private readonly Mock<ILogger<GeminiImageGenerationAgent>> _loggerMock;
    private readonly string _tempImagePath;

    public GeminiImageGenerationAgentTests()
    {
        _loggerMock = new Mock<ILogger<GeminiImageGenerationAgent>>();
        _tempImagePath = Path.Combine(Path.GetTempPath(), $"mat-test-images-{Guid.NewGuid()}");
        Directory.CreateDirectory(_tempImagePath);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempImagePath))
            Directory.Delete(_tempImagePath, true);
    }

    private GeminiImageGenerationAgent CreateAgent(
        HttpClient? httpClient = null,
        bool imageGenerationEnabled = true,
        string geminiApiKey = "test-api-key")
    {
        var config = new AgentConfiguration
        {
            ImageGenerationEnabled = imageGenerationEnabled,
            GeminiApiKey = geminiApiKey,
            GeminiModelId = "gemini-3-pro-image-preview"
        };

        return new GeminiImageGenerationAgent(
            httpClient ?? new HttpClient(),
            config,
            _tempImagePath,
            _loggerMock.Object);
    }

    private static GeneratedTask CreateTask(
        string contextText = "Test context",
        string category = "tal_og_algebra",
        string taskTypeId = "tal_regnearter",
        TaskVisualization? visualization = null,
        List<SubQuestion>? subQuestions = null)
    {
        return new GeneratedTask
        {
            Id = Guid.NewGuid().ToString(),
            ContextText = contextText,
            Category = category,
            TaskTypeId = taskTypeId,
            Visualization = visualization,
            SubQuestions = subQuestions ?? new List<SubQuestion>
            {
                new SubQuestion
                {
                    Label = "a",
                    QuestionText = "Test question?",
                    Answer = new TaskAnswer { Value = "42", Unit = "kr" }
                }
            }
        };
    }

    #region ShouldGenerateImageAsync — Guard Conditions

    [Fact]
    public async Task ShouldGenerateImage_WhenDisabled_ReturnsFalse()
    {
        var agent = CreateAgent(imageGenerationEnabled: false);
        var task = CreateTask(
            contextText: "Emma og Victor er i caféen. En sandwich koster 35 kr og en juice koster 20 kr. De har 100 kr tilsammen.");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task ShouldGenerateImage_WhenNoApiKey_ReturnsFalse()
    {
        var agent = CreateAgent(geminiApiKey: "");
        var task = CreateTask(
            contextText: "Emma og Victor er i caféen. En sandwich koster 35 kr og en juice koster 20 kr. De har 100 kr tilsammen.");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task ShouldGenerateImage_WhenContextTooShort_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(contextText: "Kort tekst");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task ShouldGenerateImage_PureAlgebra_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Løs følgende ligning for x, hvor x er et positivt heltal. Ligningen har en unik løsning.");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task ShouldGenerateImage_SimpleArithmeticNoContext_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Beregn følgende udtryk og angiv svaret som en brøk. Forenkl så meget som muligt.");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeFalse();
    }

    #endregion

    #region ShouldGenerateImageAsync — Geometry Tasks

    [Fact]
    public async Task ShouldGenerateImage_GeometryWithDimensions_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Ida og Magnus hjælper til med at indrette scenen til en lille musikfestival på skolens sportsplads i Roskilde.",
            category: "geometri",
            taskTypeId: "geo_sammensat_figur",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Scenen består af et rektangel, der er 6 m bredt og 4 m dybt. Hvad er arealet af rektanglet?" },
                new SubQuestion { Label = "b", QuestionText = "Foran rektanglet vil de lave en lille trekantet catwalk ud mod publikum. Trekanten har grundlinje 4 m og højde 3 m. Hvad er arealet af trekanten?" },
                new SubQuestion { Label = "c", QuestionText = "Den samlede scene består nu af rektanglet og trekanten sat sammen. Hvad er det samlede areal af scenen?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        // Geometry task with shapes and dimensions → always generate image
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_GeometryRectangleWithCutout_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Emma og Magnus hjælper til med at indrette en lille udendørs scene til en musikfestival i Roskilde. Gulvet på scenen skal bygges af træplader og har form som et stort rektangel med et mindre rektangel skåret ud i det ene hjørne.",
            category: "geometri",
            taskTypeId: "geo_sammensat_figur",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Det store rektangel er 8 m langt og 6 m bredt. Hvad er arealet?" },
                new SubQuestion { Label = "b", QuestionText = "Det lille rektangel er 2 m langt og 3 m bredt. Hvad er arealet?" },
                new SubQuestion { Label = "c", QuestionText = "Hvad er arealet af selve scenegulvet?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_GeometryWithoutDimensions_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Beskriv hvad en trekant er og nævn tre egenskaber ved trekanter.",
            category: "geometri",
            taskTypeId: "geo_vinkelsum");

        var result = await agent.ShouldGenerateImageAsync(task);

        // Geometry but no concrete dimensions → no image
        result.Should().BeFalse();
    }

    #endregion

    #region ShouldGenerateImageAsync — Probability Tasks

    [Fact]
    public async Task ShouldGenerateImage_ProbabilityWithColoredBalls_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Victor og Emma er til svømmestævne i Aalborg. For at gøre ventetiden sjovere har deres hold lavet en lille konkurrence med farvede plastbolde i en pose.",
            category: "statistik_og_sandsynlighed",
            taskTypeId: "stat_sandsynlighed",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "I posen ligger der 5 røde, 3 blå og 2 grønne bolde. Victor trækker én bold tilfældigt. Hvad er sandsynligheden for, at han trækker en rød bold?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        // Probability with colored physical objects → always generate image
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_ProbabilityWithDice_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Magnus kaster to terninger i et brætspil. Han skal bruge summen af øjnene til at rykke sin brik.",
            category: "statistik_og_sandsynlighed",
            taskTypeId: "stat_sandsynlighed",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Hvad er sandsynligheden for at summen er 7?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_ProbabilityWithKugler_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Noah er med til et svømmestævne i Aalborg, hvor der til sidst er en lille lodtrækning blandt deltagerne. På et bord står en skål med farvede kugler.",
            category: "statistik_og_sandsynlighed",
            taskTypeId: "stat_sandsynlighed",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Der er 5 røde kugler, 7 blå kugler og 8 grønne kugler i skålen. Hvad er sandsynligheden for at trække en rød kugle?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_ProbabilityAbstract_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Beregn sandsynligheden for at en tilfældig hændelse indtræffer givet følgende oplysninger om udfald.",
            category: "statistik_og_sandsynlighed",
            taskTypeId: "stat_sandsynlighed");

        var result = await agent.ShouldGenerateImageAsync(task);

        // Abstract probability without physical objects → no image
        result.Should().BeFalse();
    }

    #endregion

    #region ShouldGenerateImageAsync — Price/Shopping Tasks

    [Fact]
    public async Task ShouldGenerateImage_CafeWithPricesInSubQuestions_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Freja og Oliver er på skoletur til Experimentarium i Hellerup. Efter udstillingerne går de i caféen, hvor der er forskellige tilbud på mad og drikke.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "En sandwich koster 60 kr, og en sodavand koster 24 kr. Freja køber 1 sandwich og 1 sodavand. Hvor meget betaler hun i alt?" },
                new SubQuestion { Label = "b", QuestionText = "Caféen har et tilbud: \"Køb 2 sandwich og få 25% rabat\". Oliver køber 2 sandwich. Hvor meget skal han betale?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        // Prices are in subQuestions, not contextText — should still detect them
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_LoppemarkedWithPricesInSubQuestions_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Sofie og Noah er på loppemarked i Aarhus med deres klasse. De har hver især sparet penge op til at købe brugte bøger og spil på markedet ved Godsbanen.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Sofie har 150 kr med hjemmefra, og hendes mormor giver hende 50 kr ekstra. Hvor mange penge har Sofie nu i alt?" },
                new SubQuestion { Label = "b", QuestionText = "Noah køber et brætspil til 75 kr og tre bøger til 20 kr stykket. Hvor mange penge bruger han i alt?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        // Loppemarked + prices in subQuestions → should generate
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_ShopWithManyPricesInContext_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Sofie er til loppemarked i Aarhus. En bog koster 15 kr, et puslespil koster 25 kr, og en bamse koster 40 kr. Hun har 100 kr.");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_ShopWithoutPrices_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Sofie og Magnus er til loppemarked i Aarhus. De har sparet lommepenge og vil købe bøger og legetøj. Der er gode tilbud og rabatter på mange ting.");

        var result = await agent.ShouldGenerateImageAsync(task);

        // No concrete prices anywhere → no image
        result.Should().BeFalse();
    }

    #endregion

    #region ShouldGenerateImageAsync — Physical Setup / Measurement Tasks

    [Fact]
    public async Task ShouldGenerateImage_GardenWithMeasurements_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Freja skal bygge et hegn rundt om sin have. Haven er rektangulær og måler 12 meter i længde og 8 meter i bredde.");

        var result = await agent.ShouldGenerateImageAsync(task);

        // Physical setup with 2+ measurements → generate diagram
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_PoolWithDimensions_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Oliver skal lægge fliser rundt om et svømmebassin. Bassinet er 10 meter langt og 5 meter bredt. Fliserne er 50 cm brede.");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeTrue();
    }

    #endregion

    #region ShouldGenerateImageAsync — Data Display Tasks

    [Fact]
    public async Task ShouldGenerateImage_ExplicitScoreboard_ReturnsTrue()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Træneren har lavet en resultattavle for turneringen. Hold A har 12 point, Hold B har 9 point, og Hold C har 15 point. Hvem vinder?");

        var result = await agent.ShouldGenerateImageAsync(task);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldGenerateImage_SportWithoutScoreboard_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Oliver spiller fodbold til en turnering. Hans hold har scoret mange mål i kampen. Træneren er glad for resultatet.");

        var result = await agent.ShouldGenerateImageAsync(task);

        // Vague sports scenario without concrete data display → no image
        result.Should().BeFalse();
    }

    #endregion

    #region ShouldGenerateImageAsync — Tasks That Should NOT Get Images

    [Fact]
    public async Task ShouldGenerateImage_CyclingWithFractions_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Emma og Victor planlægger en cykeltur langs Limfjorden med deres klasse. Læreren har lavet en ruteplan med pauser, så alle kan følge med.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Hele ruten er 36 km lang. Klassen cykler 24 km før frokost. Hvor stor en del har de cyklet?" },
                new SubQuestion { Label = "b", QuestionText = "Hvor mange kilometer har de tilbage?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        // Cycling with fractions — no visual objects to show, just arithmetic
        result.Should().BeFalse();
    }

    [Fact]
    public async Task ShouldGenerateImage_BakingWithProportions_ReturnsFalse()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Freja og Oliver er med til at arrangere en stor kagebod til skolens sportsdag. De vil bage muffins efter en opskrift.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Opskriften er til 8 muffins og bruger 200 g mel. De vil bage 24 muffins. Hvor mange gram mel skal de bruge?" }
            });

        var result = await agent.ShouldGenerateImageAsync(task);

        // Baking proportions — no visual benefit, just ratio calculations
        result.Should().BeFalse();
    }

    #endregion

    #region GetFullTaskText Tests

    [Fact]
    public void GetFullTaskText_IncludesContextAndSubQuestions()
    {
        var task = CreateTask(
            contextText: "Emma er i caféen.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "En sandwich koster 60 kr." },
                new SubQuestion { Label = "b", QuestionText = "En sodavand koster 24 kr." }
            });

        var fullText = GeminiImageGenerationAgent.GetFullTaskText(task);

        fullText.Should().Contain("Emma er i caféen.");
        fullText.Should().Contain("En sandwich koster 60 kr.");
        fullText.Should().Contain("En sodavand koster 24 kr.");
    }

    #endregion

    #region ClassifyImageType Tests

    [Fact]
    public void ClassifyImageType_GeometryTask_ReturnsGeometryDiagram()
    {
        var task = CreateTask(
            category: "geometri",
            taskTypeId: "geo_sammensat_figur",
            contextText: "Et rektangel er 6 m bredt.");

        var fullTextLower = GeminiImageGenerationAgent.GetFullTaskText(task).ToLowerInvariant();
        var result = GeminiImageGenerationAgent.ClassifyImageType(task, fullTextLower);

        result.Should().Be(ImageType.GeometryDiagram);
    }

    [Fact]
    public void ClassifyImageType_ProbabilityWithBalls_ReturnsProbabilityObjects()
    {
        var task = CreateTask(
            category: "statistik_og_sandsynlighed",
            taskTypeId: "stat_sandsynlighed",
            contextText: "I en pose ligger der 5 røde bolde og 3 blå bolde.");

        var fullTextLower = GeminiImageGenerationAgent.GetFullTaskText(task).ToLowerInvariant();
        var result = GeminiImageGenerationAgent.ClassifyImageType(task, fullTextLower);

        result.Should().Be(ImageType.ProbabilityObjects);
    }

    [Fact]
    public void ClassifyImageType_CafeWithPrices_ReturnsPriceBoard()
    {
        var task = CreateTask(
            contextText: "I caféen koster en sandwich 35 kr og en juice koster 20 kr.");

        var fullTextLower = GeminiImageGenerationAgent.GetFullTaskText(task).ToLowerInvariant();
        var result = GeminiImageGenerationAgent.ClassifyImageType(task, fullTextLower);

        result.Should().Be(ImageType.PriceBoard);
    }

    [Fact]
    public void ClassifyImageType_GardenWithMeasurements_ReturnsMeasurementDiagram()
    {
        var task = CreateTask(
            contextText: "Haven er 12 meter lang og 8 meter bred. Der skal bygges et hegn.");

        var fullTextLower = GeminiImageGenerationAgent.GetFullTaskText(task).ToLowerInvariant();
        var result = GeminiImageGenerationAgent.ClassifyImageType(task, fullTextLower);

        result.Should().Be(ImageType.MeasurementDiagram);
    }

    [Fact]
    public void ClassifyImageType_Scoreboard_ReturnsDataTable()
    {
        var task = CreateTask(
            contextText: "Træneren har lavet en resultattavle for turneringen.");

        var fullTextLower = GeminiImageGenerationAgent.GetFullTaskText(task).ToLowerInvariant();
        var result = GeminiImageGenerationAgent.ClassifyImageType(task, fullTextLower);

        result.Should().Be(ImageType.DataTable);
    }

    [Fact]
    public void ClassifyImageType_AbstractTask_ReturnsGeneric()
    {
        var task = CreateTask(
            contextText: "Beregn følgende udtryk og angiv svaret som en brøk.");

        var fullTextLower = GeminiImageGenerationAgent.GetFullTaskText(task).ToLowerInvariant();
        var result = GeminiImageGenerationAgent.ClassifyImageType(task, fullTextLower);

        result.Should().Be(ImageType.Generic);
    }

    #endregion

    #region Geometry Reasoning Tests

    [Fact]
    public void GeometryReasoningPrompt_ContainsKeyInstructions()
    {
        // The geometry reasoning prompt should instruct the LLM to:
        var prompt = GeminiImageGenerationAgent.GeometryReasoningPrompt;

        // 1. Compute exact coordinates
        prompt.Should().Contain("COMPUTE EXACT COORDINATES");
        // 2. Handle any math (√2, π, trig)
        prompt.Should().Contain("√2");
        // 3. Specify edges with line styles
        prompt.Should().Contain("EDGES");
        // 4. Only label non-derivable dimensions
        prompt.Should().Contain("MINIMAL DIMENSION LABELS");
        prompt.Should().Contain("Cannot be derived");
        // 5. Be blindfolded-person precise
        prompt.Should().Contain("BLINDFOLDED");
        // 6. Handle mathematical patterns
        prompt.Should().Contain("Theodorus spiral");
    }

    [Fact]
    public void BuildImagePrompt_GeometryTask_ContainsGeometryDiagramInstructions()
    {
        // Even without a live API, the prompt should contain the geometry framing
        var agent = CreateAgent(geminiApiKey: ""); // No API key → geometry reasoning will fall back
        var task = CreateTask(
            contextText: "Ida og Magnus hjælper til med at indrette scenen til en lille musikfestival.",
            category: "geometri",
            taskTypeId: "geo_sammensat_figur",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Scenen består af et rektangel, der er 6 m bredt og 4 m dybt. Hvad er arealet?" },
                new SubQuestion { Label = "b", QuestionText = "Foran er en trekant med grundlinje 4 m og højde 3 m. Hvad er arealet?" }
            });

        var prompt = agent.BuildImagePrompt(task);

        // Should contain geometry diagram framing
        prompt.Should().Contain("GEOMETRIC DIAGRAM");
        // Should contain the task text (fallback since no API key)
        prompt.Should().Contain("6 m");
        prompt.Should().Contain("4 m");
        prompt.Should().Contain("3 m");
        // Should contain drawing style instructions
        prompt.Should().Contain("Bold black outlines");
        prompt.Should().Contain("Right angles");
    }

    #endregion

    #region Data Extraction Tests

    [Fact]
    public void ExtractShapeDescriptions_FindsShapesWithDimensions()
    {
        var text = "Scenen består af et rektangel, der er 6 m bredt og 4 m dybt. Foran rektanglet er en trekant med grundlinje 4 m og højde 3 m.";
        var shapes = GeminiImageGenerationAgent.ExtractShapeDescriptions(text, text.ToLowerInvariant());

        shapes.Should().HaveCountGreaterOrEqualTo(1);
        shapes.Should().Contain(s => s.Contains("rektangel") || s.Contains("trekant"));
    }

    [Fact]
    public void ExtractColoredObjects_FindsColoredBalls()
    {
        var text = "I posen ligger der 5 røde bolde, 3 blå bolde og 2 grønne bolde.";
        var objects = GeminiImageGenerationAgent.ExtractColoredObjects(text, text.ToLowerInvariant());

        objects.Should().HaveCountGreaterOrEqualTo(2);
    }

    [Fact]
    public void ExtractPricedItems_FindsItemsWithPrices()
    {
        var text = "En sandwich koster 60 kr og en sodavand koster 24 kr.";
        var items = GeminiImageGenerationAgent.ExtractPricedItems(text);

        items.Should().HaveCountGreaterOrEqualTo(2);
        items.Should().Contain(i => i.price.Contains("60"));
        items.Should().Contain(i => i.price.Contains("24"));
    }

    [Fact]
    public void ExtractPricedItems_HandlesColonFormat()
    {
        var text = "Sandwich: 35 kr. Juice: 20 kr. Kaffe: 15 kr.";
        var items = GeminiImageGenerationAgent.ExtractPricedItems(text);

        items.Should().HaveCountGreaterOrEqualTo(2);
    }

    [Fact]
    public void ExtractMeasurements_FindsDimensions()
    {
        var text = "Haven er 12 meter lang og 8 meter bred.";
        var measurements = GeminiImageGenerationAgent.ExtractMeasurements(text);

        measurements.Should().HaveCountGreaterOrEqualTo(2);
        measurements.Should().Contain(m => m.Contains("12"));
        measurements.Should().Contain(m => m.Contains("8"));
    }

    #endregion

    #region BuildImagePrompt Integration Tests

    [Fact]
    public void BuildImagePrompt_GeometryTask_ProducesDetailedDiagramPrompt()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Ida og Magnus hjælper til med at indrette scenen til en lille musikfestival.",
            category: "geometri",
            taskTypeId: "geo_sammensat_figur",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Scenen består af et rektangel, der er 6 m bredt og 4 m dybt. Hvad er arealet?" },
                new SubQuestion { Label = "b", QuestionText = "Foran er en trekant med grundlinje 4 m og højde 3 m. Hvad er arealet?" }
            });

        var prompt = agent.BuildImagePrompt(task);

        // Should contain geometry diagram framing
        prompt.Should().Contain("GEOMETRIC DIAGRAM");
        // Should contain the task dimensions (in fallback text or LLM output)
        prompt.Should().Contain("6 m");
        prompt.Should().Contain("4 m");
        prompt.Should().Contain("3 m");
        // Should contain global safety rules
        prompt.Should().Contain("ACCURACY IS EVERYTHING");
        prompt.Should().Contain("FINAL CHECKLIST");
        // Should contain drawing style
        prompt.Should().Contain("Bold black outlines");
    }

    [Fact]
    public void BuildImagePrompt_ProbabilityTask_ProducesObjectPrompt()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Victor og Emma har farvede plastbolde i en pose.",
            category: "statistik_og_sandsynlighed",
            taskTypeId: "stat_sandsynlighed",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "I posen ligger der 5 røde, 3 blå og 2 grønne bolde. Hvad er sandsynligheden for en rød bold?" }
            });

        var prompt = agent.BuildImagePrompt(task);

        prompt.Should().Contain("PHYSICAL OBJECTS");
        prompt.Should().Contain("5 røde");
        prompt.Should().Contain("3 blå");
        prompt.Should().Contain("2 grønne");
        prompt.Should().Contain("container");
    }

    [Fact]
    public void BuildImagePrompt_PriceTask_ProducesPriceBoardPrompt()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Freja og Oliver er i caféen, hvor der er tilbud.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "En sandwich koster 60 kr og en sodavand koster 24 kr. Hvor meget betaler hun?" }
            });

        var prompt = agent.BuildImagePrompt(task);

        prompt.Should().Contain("PRICE DISPLAY");
        prompt.Should().Contain("60");
        prompt.Should().Contain("24");
        prompt.Should().Contain("MENU BOARD");
    }

    [Fact]
    public void BuildImagePrompt_AlwaysIncludesFullTaskText()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "Kontekst her.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Spørgsmål a her." },
                new SubQuestion { Label = "b", QuestionText = "Spørgsmål b her." }
            });

        var prompt = agent.BuildImagePrompt(task);

        prompt.Should().Contain("Kontekst her.");
        prompt.Should().Contain("Spørgsmål a her.");
        prompt.Should().Contain("Spørgsmål b her.");
    }

    [Fact]
    public void BuildImagePrompt_AlwaysContainsSafetyRules()
    {
        var agent = CreateAgent();
        var task = CreateTask(
            contextText: "En simpel opgave med noget kontekst der er lang nok til at blive behandlet.");

        var prompt = agent.BuildImagePrompt(task);

        prompt.Should().Contain("ACCURACY IS EVERYTHING");
        prompt.Should().Contain("Do NOT invent");
        prompt.Should().Contain("FINAL CHECKLIST");
        prompt.Should().Contain("Danish");
    }

    #endregion

    #region GenerateImageAsync Tests

    [Fact]
    public async Task GenerateImage_WhenNoApiKey_ReturnsNull()
    {
        var agent = CreateAgent(geminiApiKey: "");
        var task = CreateTask();

        var result = await agent.GenerateImageAsync(task);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GenerateImage_WhenApiReturnsError_ReturnsNull()
    {
        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("""{"error": {"message": "Internal error"}}""")
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GenerateImage_WhenApiReturnsValidImage_SavesAndReturnsUrl()
    {
        var fakeImageBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47 }; // PNG header
        var base64Image = Convert.ToBase64String(fakeImageBytes);

        var geminiResponse = new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new object[]
                        {
                            new { inlineData = new { mimeType = "image/png", data = base64Image } }
                        }
                    }
                }
            }
        };

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(geminiResponse))
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().NotBeNull();
        result.Should().StartWith("/api/images/");
        result.Should().EndWith(".png");

        // Verify file was saved
        var fileName = result!.Replace("/api/images/", "");
        var filePath = Path.Combine(_tempImagePath, fileName);
        File.Exists(filePath).Should().BeTrue();
        var savedBytes = await File.ReadAllBytesAsync(filePath);
        savedBytes.Should().BeEquivalentTo(fakeImageBytes);
    }

    [Fact]
    public async Task GenerateImage_WhenApiReturnsTextOnly_ReturnsNull()
    {
        var geminiResponse = new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new object[]
                        {
                            new { text = "I cannot generate images" }
                        }
                    }
                }
            }
        };

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(geminiResponse))
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GenerateImage_WhenApiReturnsEmptyCandidates_ReturnsNull()
    {
        var geminiResponse = new { candidates = Array.Empty<object>() };

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(geminiResponse))
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GenerateImage_WhenApiReturnsTextAndImage_ExtractsImage()
    {
        var fakeImageBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A };
        var base64Image = Convert.ToBase64String(fakeImageBytes);

        var geminiResponse = new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new object[]
                        {
                            new { text = "Here is the illustration:" },
                            new { inlineData = new { mimeType = "image/png", data = base64Image } }
                        }
                    }
                }
            }
        };

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(geminiResponse))
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().NotBeNull();
        result.Should().StartWith("/api/images/");
    }

    [Fact]
    public async Task GenerateImage_SendsCorrectApiUrl()
    {
        string? capturedUrl = null;
        var handler = new MockHttpMessageHandler((request) =>
        {
            capturedUrl = request.RequestUri?.ToString();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"candidates": []}""")
            };
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient, geminiApiKey: "test-key-123");
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        await agent.GenerateImageAsync(task);

        capturedUrl.Should().NotBeNull();
        capturedUrl.Should().Contain("generativelanguage.googleapis.com");
        capturedUrl.Should().Contain("gemini-3-pro-image-preview");
        capturedUrl.Should().Contain("key=test-key-123");
    }

    [Fact]
    public async Task GenerateImage_SendsCorrectRequestBody()
    {
        string? capturedBody = null;
        var handler = new MockHttpMessageHandler(async (request) =>
        {
            capturedBody = await request.Content!.ReadAsStringAsync();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"candidates": []}""")
            };
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium i Hellerup.",
            subQuestions: new List<SubQuestion>
            {
                new SubQuestion { Label = "a", QuestionText = "Hvad koster frokosten?" }
            });

        await agent.GenerateImageAsync(task);

        capturedBody.Should().NotBeNull();
        capturedBody.Should().Contain("responseModalities");
        capturedBody.Should().Contain("IMAGE");
        capturedBody.Should().Contain("Experimentarium");
        capturedBody.Should().Contain("ACCURACY IS EVERYTHING");
    }

    [Fact]
    public async Task GenerateImage_WhenMalformedJsonResponse_ReturnsNull()
    {
        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("this is not json at all")
        });
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GenerateImage_WhenHttpClientThrows_ReturnsNull()
    {
        var handler = new ThrowingHttpMessageHandler();
        var httpClient = new HttpClient(handler);
        var agent = CreateAgent(httpClient: httpClient);
        var task = CreateTask(
            contextText: "Emma og Victor er på skoletur til Experimentarium.");

        var result = await agent.GenerateImageAsync(task);

        result.Should().BeNull();
    }

    #endregion

    #region Agent Properties Tests

    [Fact]
    public void Agent_HasCorrectName()
    {
        var agent = CreateAgent();
        agent.Name.Should().Be("GeminiImageGenerationAgent");
    }

    [Fact]
    public void Agent_HasDescription()
    {
        var agent = CreateAgent();
        agent.Description.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Agent_CreatesOutputDirectory()
    {
        var newPath = Path.Combine(Path.GetTempPath(), $"mat-test-new-{Guid.NewGuid()}");
        try
        {
            var agent = new GeminiImageGenerationAgent(
                new HttpClient(),
                new AgentConfiguration { ImageGenerationEnabled = true, GeminiApiKey = "key" },
                newPath,
                _loggerMock.Object);

            Directory.Exists(newPath).Should().BeTrue();
        }
        finally
        {
            if (Directory.Exists(newPath))
                Directory.Delete(newPath, true);
        }
    }

    #endregion

    #region Helper Classes

    /// <summary>
    /// Mock HTTP message handler for testing HTTP calls
    /// </summary>
    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _handler;

        public MockHttpMessageHandler(HttpResponseMessage response)
        {
            _handler = _ => Task.FromResult(response);
        }

        public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = request => Task.FromResult(handler(request));
        }

        public MockHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return _handler(request);
        }
    }

    /// <summary>
    /// HTTP message handler that always throws an exception
    /// </summary>
    private class ThrowingHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            throw new HttpRequestException("Network error");
        }
    }

    #endregion
}
