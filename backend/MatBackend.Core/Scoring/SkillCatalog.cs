namespace MatBackend.Core.Scoring;

/// <summary>
/// Defines all known skills and their metadata.
/// This is the backend equivalent of the frontend's skillMap.ts.
/// </summary>
public static class SkillCatalog
{
    public record SkillDefinition(string SkillId, string Name, string Category, string[] Generators);

    public static readonly SkillDefinition[] AllSkills =
    [
        // Tal og Algebra
        new("regnearter", "Regnearter", "tal", ["tal_regnearter"]),
        new("regnehierarki", "Regnehierarki", "tal", ["tal_regnehierarki"]),
        new("broeker", "Brøker", "tal", ["tal_broeker_og_antal"]),
        new("overslag", "Overslag", "tal", ["tal_overslag"]),
        new("ligninger", "Ligninger", "tal", ["tal_ligninger"]),
        new("algebraiske_udtryk", "Algebraiske udtryk", "tal", ["tal_algebraiske_udtryk"]),
        new("lineaere_funktioner", "Lineære funktioner", "tal", ["tal_lineaere_funktioner"]),
        new("pris_rabat", "Pris, rabat & procent", "tal", ["tal_pris_rabat_procent"]),
        new("forholdstalsregning", "Forholdstalsregning", "tal", ["tal_forholdstalsregning"]),
        new("hastighed_tid", "Hastighed & tid", "tal", ["tal_hastighed_tid"]),

        // Geometri og Måling
        new("enhedsomregning", "Enhedsomregning", "geometri", ["geo_enhedsomregning"]),
        new("vinkelsum", "Vinkelsum", "geometri", ["geo_vinkelsum"]),
        new("trekant_elementer", "Trekant-elementer", "geometri", ["geo_trekant_elementer"]),
        new("ligedannethed", "Ligedannethed", "geometri", ["geo_ligedannethed"]),
        new("sammensat_figur", "Sammensat figur", "geometri", ["geo_sammensat_figur"]),
        new("rumfang", "Rumfang", "geometri", ["geo_rumfang"]),
        new("transformationer", "Transformationer", "geometri", ["geo_transformationer"]),
        new("projektioner", "Projektioner", "geometri", ["geo_projektioner"]),

        // Statistik og Sandsynlighed
        new("soejlediagram", "Søjlediagram", "statistik", ["stat_soejlediagram"]),
        new("statistiske_maal", "Statistiske mål", "statistik", ["stat_statistiske_maal"]),
        new("boksplot", "Boksplot", "statistik", ["stat_boksplot"]),
        new("sandsynlighed", "Sandsynlighed", "statistik", ["stat_sandsynlighed"]),
    ];

    private static readonly Dictionary<string, SkillDefinition> _byId =
        AllSkills.ToDictionary(s => s.SkillId);

    public static SkillDefinition? GetById(string skillId) =>
        _byId.GetValueOrDefault(skillId);

    public static IEnumerable<string> AllSkillIds => _byId.Keys;

    public static IEnumerable<SkillDefinition> GetByCategory(string category) =>
        AllSkills.Where(s => s.Category == category);
}
