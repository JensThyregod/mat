using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using MatBackend.Core.Interfaces.Agents;

namespace MatBackend.Infrastructure.Agents;

/// <summary>
/// Base class for Semantic Kernel-based agents
/// </summary>
public abstract class BaseSemanticKernelAgent : ITerminsproveAgent
{
    protected readonly Kernel Kernel;
    protected readonly IChatCompletionService ChatService;
    protected readonly ILogger Logger;
    protected readonly AgentConfiguration Configuration;
    
    public abstract string Name { get; }
    public abstract string Description { get; }
    
    /// <summary>
    /// System prompt for the agent
    /// </summary>
    protected abstract string SystemPrompt { get; }
    
    protected BaseSemanticKernelAgent(
        Kernel kernel,
        AgentConfiguration configuration,
        ILogger logger)
    {
        Kernel = kernel;
        Configuration = configuration;
        Logger = logger;
        ChatService = kernel.GetRequiredService<IChatCompletionService>();
    }
    
    /// <summary>
    /// Execute a chat completion with the agent's system prompt
    /// </summary>
    protected async Task<string> ExecuteChatAsync(
        string userMessage,
        CancellationToken cancellationToken = default)
    {
        Logger.LogInformation("[{AgentName}] Processing request", Name);
        
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(SystemPrompt);
        chatHistory.AddUserMessage(userMessage);
        
        var settings = new PromptExecutionSettings
        {
            ExtensionData = new Dictionary<string, object>
            {
                ["max_tokens"] = Configuration.MaxTokens,
                ["temperature"] = Configuration.Temperature
            }
        };
        
        try
        {
            var response = await ChatService.GetChatMessageContentAsync(
                chatHistory,
                settings,
                Kernel,
                cancellationToken);
            
            Logger.LogInformation("[{AgentName}] Response received", Name);
            return response.Content ?? string.Empty;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "[{AgentName}] Error during chat completion", Name);
            throw;
        }
    }
    
    /// <summary>
    /// Execute a chat completion with conversation history
    /// </summary>
    protected async Task<string> ExecuteChatWithHistoryAsync(
        ChatHistory chatHistory,
        CancellationToken cancellationToken = default)
    {
        var settings = new PromptExecutionSettings
        {
            ExtensionData = new Dictionary<string, object>
            {
                ["max_tokens"] = Configuration.MaxTokens,
                ["temperature"] = Configuration.Temperature
            }
        };
        
        var response = await ChatService.GetChatMessageContentAsync(
            chatHistory,
            settings,
            Kernel,
            cancellationToken);
        
        return response.Content ?? string.Empty;
    }
}

