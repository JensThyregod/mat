namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Configuration for the AI agents
/// </summary>
public class AgentConfiguration
{
    /// <summary>
    /// OpenAI API key or Azure OpenAI key
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;
    
    /// <summary>
    /// Model deployment name (e.g., "gpt-4", "gpt-4-turbo")
    /// </summary>
    public string ModelId { get; set; } = "gpt-4";
    
    /// <summary>
    /// Azure OpenAI endpoint (if using Azure)
    /// </summary>
    public string? AzureEndpoint { get; set; }
    
    /// <summary>
    /// Whether to use Azure OpenAI instead of OpenAI
    /// </summary>
    public bool UseAzure { get; set; } = false;
    
    /// <summary>
    /// Maximum tokens for responses
    /// </summary>
    public int MaxTokens { get; set; } = 4096;
    
    /// <summary>
    /// Temperature for response generation (0-2)
    /// </summary>
    public double Temperature { get; set; } = 0.7;
    
    /// <summary>
    /// Maximum number of retries for failed agent calls
    /// </summary>
    public int MaxRetries { get; set; } = 3;
    
    /// <summary>
    /// Timeout in seconds for agent calls
    /// </summary>
    public int TimeoutSeconds { get; set; } = 120;
    
    /// <summary>
    /// Google Gemini API key for image generation
    /// </summary>
    public string GeminiApiKey { get; set; } = string.Empty;
    
    /// <summary>
    /// Gemini model ID for image generation (e.g. "gemini-3-pro-image-preview")
    /// </summary>
    public string GeminiModelId { get; set; } = "gemini-3-pro-image-preview";
    
    /// <summary>
    /// Whether image generation is enabled
    /// </summary>
    public bool ImageGenerationEnabled { get; set; } = false;
}

