using MatBackend.Core.Models.Curriculum;

namespace MatBackend.Core.Interfaces;

/// <summary>
/// Samples random topic pairs from the FP9 curriculum to drive creative task generation.
/// </summary>
public interface ICurriculumSampler
{
    /// <summary>
    /// Sample a pair of two random topics from the curriculum.
    /// Tries to pick from different categories for maximum diversity.
    /// </summary>
    TopicPair SampleTopicPair();
    
    /// <summary>
    /// Sample N unique topic pairs, ensuring no duplicate topics across pairs.
    /// </summary>
    List<TopicPair> SampleUniqueTopicPairs(int count);
    
    /// <summary>
    /// Get all available topics (for diagnostics / UI)
    /// </summary>
    List<CurriculumTopic> GetAllTopics();
}
