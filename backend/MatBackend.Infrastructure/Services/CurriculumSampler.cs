using MatBackend.Core.Interfaces;
using MatBackend.Core.Models.Curriculum;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace MatBackend.Infrastructure.Services;

/// <summary>
/// Loads the FP9 curriculum from YAML and samples random topic pairs
/// to drive diverse, creative task generation.
/// </summary>
public class CurriculumSampler : ICurriculumSampler
{
    private readonly List<CurriculumTopic> _topics;
    private readonly HashSet<string> _difficultCombinations;
    private readonly Random _rng = new();

    public CurriculumSampler(string curriculumYamlPath)
    {
        var yaml = File.ReadAllText(curriculumYamlPath);
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        var root = deserializer.Deserialize<CurriculumYaml>(yaml);
        _topics = FlattenTopics(root);
        _difficultCombinations = BuildDifficultCombinationSet(root.DifficultCombinations);
    }

    public TopicPair SampleTopicPair()
    {
        if (_topics.Count < 2)
            throw new InvalidOperationException("Curriculum must have at least 2 topics");

        var first = _topics[_rng.Next(_topics.Count)];

        // Prefer picking from a different category for maximum diversity
        var candidates = _topics
            .Where(t => t.Id != first.Id && t.CategoryId != first.CategoryId)
            .ToList();

        // Fall back to same-category if needed (shouldn't happen with real curriculum)
        if (candidates.Count == 0)
            candidates = _topics.Where(t => t.Id != first.Id).ToList();

        var second = candidates[_rng.Next(candidates.Count)];

        return new TopicPair
        {
            Topic1 = first,
            Topic2 = second,
            IsDifficultCombination = IsDifficultPair(first.Id, second.Id)
        };
    }

    public List<TopicPair> SampleUniqueTopicPairs(int count)
    {
        var pairs = new List<TopicPair>();
        var usedTopicIds = new HashSet<string>();

        for (int i = 0; i < count; i++)
        {
            var available = _topics.Where(t => !usedTopicIds.Contains(t.Id)).ToList();

            // If we've exhausted unique topics, reset and allow reuse
            if (available.Count < 2)
            {
                usedTopicIds.Clear();
                available = _topics.ToList();
            }

            var first = available[_rng.Next(available.Count)];
            usedTopicIds.Add(first.Id);

            var candidates = available
                .Where(t => t.Id != first.Id && t.CategoryId != first.CategoryId)
                .ToList();

            if (candidates.Count == 0)
                candidates = available.Where(t => t.Id != first.Id).ToList();

            var second = candidates[_rng.Next(candidates.Count)];
            usedTopicIds.Add(second.Id);

            pairs.Add(new TopicPair
            {
                Topic1 = first,
                Topic2 = second,
                IsDifficultCombination = IsDifficultPair(first.Id, second.Id)
            });
        }

        return pairs;
    }

    public List<CurriculumTopic> GetAllTopics() => _topics.ToList();

    private bool IsDifficultPair(string id1, string id2)
    {
        var key1 = $"{id1}|{id2}";
        var key2 = $"{id2}|{id1}";
        return _difficultCombinations.Contains(key1) || _difficultCombinations.Contains(key2);
    }

    private static List<CurriculumTopic> FlattenTopics(CurriculumYaml root)
    {
        var topics = new List<CurriculumTopic>();

        foreach (var category in root.Categories)
        {
            foreach (var subcategory in category.Subcategories)
            {
                foreach (var topic in subcategory.Topics)
                {
                    topics.Add(new CurriculumTopic
                    {
                        Id = topic.Id,
                        Name = topic.Name,
                        Keywords = topic.Keywords ?? new List<string>(),
                        CategoryId = category.Id,
                        CategoryName = category.Name,
                        SubcategoryId = subcategory.Id,
                        SubcategoryName = subcategory.Name
                    });
                }
            }
        }

        return topics;
    }

    private static HashSet<string> BuildDifficultCombinationSet(List<List<string>>? combos)
    {
        var set = new HashSet<string>();
        if (combos == null) return set;

        foreach (var pair in combos)
        {
            if (pair.Count == 2)
                set.Add($"{pair[0]}|{pair[1]}");
        }

        return set;
    }

    #region YAML deserialization models

    private class CurriculumYaml
    {
        public List<CategoryYaml> Categories { get; set; } = new();
        public List<List<string>>? DifficultCombinations { get; set; }
    }

    private class CategoryYaml
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<SubcategoryYaml> Subcategories { get; set; } = new();
    }

    private class SubcategoryYaml
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<TopicYaml> Topics { get; set; } = new();
    }

    private class TopicYaml
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<string>? Keywords { get; set; }
    }

    #endregion
}
