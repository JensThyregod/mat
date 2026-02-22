using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Interfaces.Agents;
using MatBackend.Core.Models.Curriculum;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Takes a pair of randomly sampled curriculum topics and brainstorms a creative,
/// concrete task concept that weaves them together. Can request a re-sample if the
/// pair is truly incompatible.
/// </summary>
public class TopicBrainstormAgent : BaseSemanticKernelAgent, ITopicBrainstormAgent
{
    private readonly ICurriculumSampler _sampler;
    private const int MaxResampleAttempts = 3;

    public override string Name => "TopicBrainstormAgent";
    public override string Description => "Brainstorms creative task concepts from random curriculum topic pairs";

    protected override string SystemPrompt => """
        Du er en erfaren matematiklærer der designer FP9-prøveopgaver.
        
        Du får to tilfældigt valgte emner fra 9. klasses pensum. Din opgave er at finde en
        SIMPEL, REALISTISK hverdagssituation hvor begge emner naturligt indgår.
        
        VIGTIGSTE REGEL — HOLD DET SIMPELT OG TROVÆRDIGT:
        - Scenariet skal være KORT og PRÆCIST — maks 2-3 sætninger.
        - Scenariet skal være REALISTISK og TROVÆRDIGT. Ingen kunstige konstruktioner
          hvor man tvinger to emner sammen på en måde der ikke giver mening i virkeligheden.
        - Tænk på VIRKELIGE, HVERDAGSAGTIGE situationer — ikke science fiction, VR, 
          eller overdrevent kreative scenarier. En god opgave er kedelig i sin ramme
          men interessant i sin matematik.
        - GODE eksempler: hækle grydelapper og sælge dem, male et værelse, planlægge 
          en cykeltur, bage kager til en fest, spare op til noget, bygge en hylde,
          tælle bolde i en pose, måle en have, sammenligne mobilabonnementer.
        - DÅRLIGE eksempler: VR-zone med skumterninger og løbebaner, YouTube-kanal 
          med avancerede statistikker, escape rooms med matematiske gåder.
        
        KOMPATIBILITETSVURDERING — VÆR KRITISK:
        Svar "compatible": false hvis NOGEN af disse gælder:
        1. Emnerne har INGEN naturlig matematisk forbindelse — de kan kun kombineres
           ved at placere dem i samme fysiske rum (fx "i klassen hænger OGSÅ en plakat").
        2. Scenariet kræver et KUNSTIGT setup for at begge emner indgår (fx en reklame
           der TILFÆLDIGVIS hænger ved siden af et geometrisk mønster).
        3. Delopgaverne ville naturligt falde i to ADSKILTE dele der ikke bygger på hinanden.
           En god opgave har scaffolding hvor svarene fra tidlige delopgaver bruges i senere.
        4. Scenariet er SÅ SØGT at en elev ville studse over det (fx "en fodboldspiller
           der beregner sandsynligheder med en parabel-model").
        
        Det er HELT OK at sige "compatible": false — det sker ofte, og vi finder bare et
        nyt emnepar. Det er MEGET bedre end en dårlig opgave.
        
        OUTPUT FORMAT:
        Svar med ÉT JSON-objekt (ingen markdown, ingen forklaring):
        {
          "compatible": true,
          "scenarioDescription": "1-2 korte sætninger der sætter scenen",
          "mathematicalConnection": "Én sætning om hvordan de to emner hænger MATEMATISK sammen (ikke bare fysisk i samme scenarie)",
          "suggestedTaskTypeId": "en af de tilgængelige opgavetyper",
          "primaryCategory": "tal_og_algebra | geometri_og_maaling | statistik_og_sandsynlighed"
        }
        
        Eller hvis parret ikke kan kombineres naturligt:
        { "compatible": false, "reason": "Kort forklaring af hvorfor parret ikke fungerer" }
        """;

    public TopicBrainstormAgent(
        Kernel kernel,
        AgentConfiguration configuration,
        ICurriculumSampler sampler,
        ILogger<TopicBrainstormAgent> logger)
        : base(kernel, configuration, logger)
    {
        _sampler = sampler;
    }

    public async Task<TaskConcept> BrainstormConceptAsync(
        TopicPair topicPair,
        string difficulty,
        string examPart,
        CancellationToken cancellationToken = default)
    {
        var currentPair = topicPair;
        var resampleCount = 0;
        string? lastRejectReason = null;

        for (int attempt = 0; attempt <= MaxResampleAttempts; attempt++)
        {
            Logger.LogInformation(
                "Brainstorming concept for topic pair: {Topic1} + {Topic2} (attempt {Attempt})",
                currentPair.Topic1.Name, currentPair.Topic2.Name, attempt + 1);

            var prompt = BuildPrompt(currentPair, difficulty, examPart);
            var response = await ExecuteChatAsync(prompt, cancellationToken);
            var result = ParseResponse(response);

            if (result.Compatible)
            {
                return new TaskConcept
                {
                    TopicPair = currentPair,
                    ScenarioDescription = result.ScenarioDescription,
                    MathematicalConnection = result.MathematicalConnection,
                    SuggestedTaskTypeId = result.SuggestedTaskTypeId,
                    PrimaryCategory = result.PrimaryCategory,
                    WasResampled = resampleCount > 0,
                    ResampleCount = resampleCount,
                    ResampleReason = lastRejectReason
                };
            }

            // Incompatible — re-sample
            lastRejectReason = result.Reason;
            resampleCount++;
            Logger.LogInformation(
                "Topic pair rejected (reason: {Reason}), re-sampling... ({Count}/{Max})",
                lastRejectReason ?? "no reason given", resampleCount, MaxResampleAttempts);
            currentPair = _sampler.SampleTopicPair();
        }

        // Exhausted re-sample attempts — fall back to single-topic concept
        Logger.LogWarning(
            "Exhausted {Max} re-sample attempts, generating single-topic fallback concept",
            MaxResampleAttempts);
        return BuildFallbackConcept(currentPair, resampleCount, lastRejectReason);
    }

    private string BuildPrompt(TopicPair pair, string difficulty, string examPart)
    {
        var difficultyHint = difficulty switch
        {
            "let" => "Scenariet skal være tilgængeligt og konkret — eleven skal kunne komme i gang med det samme.",
            "middel" => "Scenariet skal kræve flere skridt og kombination af de to emner.",
            "svær" => "Scenariet skal være komplekst og kræve at eleven selv finder strategien.",
            _ => ""
        };

        var examPartHint = examPart == "uden_hjaelpemidler"
            ? "Opgaven er UDEN hjælpemidler — tal skal være pæne og regnbare i hovedet."
            : "Opgaven er MED hjælpemidler — mere komplekse tal og beregninger er OK.";

        return $"""
            EMNE 1: {pair.Topic1.Name} ({pair.Topic1.CategoryName} → {pair.Topic1.SubcategoryName})
            Nøgleord: {string.Join(", ", pair.Topic1.Keywords)}
            
            EMNE 2: {pair.Topic2.Name} ({pair.Topic2.CategoryName} → {pair.Topic2.SubcategoryName})
            Nøgleord: {string.Join(", ", pair.Topic2.Keywords)}
            
            Sværhedsgrad: {difficulty}
            {difficultyHint}
            
            Prøvedel: {examPartHint}
            
            Tilgængelige opgavetyper: tal_ligninger, tal_broeker_og_antal, tal_regnearter, 
            tal_pris_rabat_procent, tal_forholdstalsregning, geo_sammensat_figur, geo_vinkelsum, 
            geo_enhedsomregning, stat_boksplot, stat_sandsynlighed, stat_soejlediagram
            
            Find en KREATIV, REALISTISK situation der naturligt kombinerer begge emner.
            Tænk på noget en 15-årig faktisk kunne opleve eller interessere sig for.
            """;
    }

    private BrainstormResponse ParseResponse(string response)
    {
        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}');

            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var parsed = JsonSerializer.Deserialize<BrainstormResponseJson>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (parsed != null)
                {
                    return new BrainstormResponse
                    {
                        Compatible = parsed.Compatible,
                        ScenarioDescription = parsed.ScenarioDescription ?? "",
                        MathematicalConnection = parsed.MathematicalConnection ?? "",
                        SuggestedTaskTypeId = parsed.SuggestedTaskTypeId ?? "tal_regnearter",
                        PrimaryCategory = parsed.PrimaryCategory ?? "tal_og_algebra",
                        Reason = parsed.Reason
                    };
                }
            }
        }
        catch (JsonException ex)
        {
            Logger.LogWarning(ex, "Failed to parse brainstorm response, treating as incompatible to trigger resample");
        }

        // If we can't parse, treat as incompatible so we get a fresh pair
        return new BrainstormResponse { Compatible = false, Reason = "Failed to parse LLM response" };
    }

    /// <summary>
    /// When all resample attempts are exhausted, fall back to a single-topic concept
    /// using only the first topic from the pair. This guarantees a coherent task.
    /// </summary>
    private static TaskConcept BuildFallbackConcept(TopicPair pair, int resampleCount, string? lastRejectReason)
    {
        var topic = pair.Topic1;
        return new TaskConcept
        {
            TopicPair = pair,
            ScenarioDescription = $"En hverdagsopgave om {topic.Name.ToLower()} i en simpel, realistisk kontekst.",
            MathematicalConnection = $"Eleven arbejder med {topic.Name.ToLower()} ({topic.CategoryName}).",
            SuggestedTaskTypeId = InferTaskTypeFromCategory(topic.CategoryId),
            PrimaryCategory = topic.CategoryId,
            WasResampled = resampleCount > 0,
            ResampleCount = resampleCount,
            ResampleReason = lastRejectReason
        };
    }

    private static string InferTaskTypeFromCategory(string categoryId) => categoryId switch
    {
        "geometri_og_maaling" => "geo_sammensat_figur",
        "statistik_og_sandsynlighed" => "stat_soejlediagram",
        _ => "tal_regnearter"
    };

    private class BrainstormResponse
    {
        public bool Compatible { get; set; } = true;
        public string ScenarioDescription { get; set; } = "";
        public string MathematicalConnection { get; set; } = "";
        public string SuggestedTaskTypeId { get; set; } = "tal_regnearter";
        public string PrimaryCategory { get; set; } = "tal_og_algebra";
        public string? Reason { get; set; }
    }

    private class BrainstormResponseJson
    {
        public bool Compatible { get; set; }
        public string? ScenarioDescription { get; set; }
        public string? MathematicalConnection { get; set; }
        public string? SuggestedTaskTypeId { get; set; }
        public string? PrimaryCategory { get; set; }
        public string? Reason { get; set; }
    }
}
