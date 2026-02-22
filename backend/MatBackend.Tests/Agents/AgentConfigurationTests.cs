using FluentAssertions;
using MatBackend.Infrastructure.Agents;

namespace MatBackend.Tests.Agents;

/// <summary>
/// Tests for the AgentConfiguration class.
/// Verifies default values and Gemini-specific configuration.
/// </summary>
public class AgentConfigurationTests
{
    [Fact]
    public void DefaultConfiguration_HasExpectedDefaults()
    {
        var config = new AgentConfiguration();

        config.ApiKey.Should().BeEmpty();
        config.ModelId.Should().Be("gpt-4");
        config.MaxTokens.Should().Be(8192);
        config.Temperature.Should().Be(0.7);
        config.MaxRetries.Should().Be(3);
        config.TimeoutSeconds.Should().Be(120);
    }

    [Fact]
    public void DefaultConfiguration_GeminiDisabledByDefault()
    {
        var config = new AgentConfiguration();

        config.ImageGenerationEnabled.Should().BeFalse();
        config.GeminiApiKey.Should().BeEmpty();
    }

    [Fact]
    public void DefaultConfiguration_GeminiModelId()
    {
        var config = new AgentConfiguration();

        config.GeminiModelId.Should().Be("gemini-3-pro-image-preview");
    }

    [Fact]
    public void Configuration_CanEnableImageGeneration()
    {
        var config = new AgentConfiguration
        {
            ImageGenerationEnabled = true,
            GeminiApiKey = "test-key",
            GeminiModelId = "gemini-3-pro-image-preview"
        };

        config.ImageGenerationEnabled.Should().BeTrue();
        config.GeminiApiKey.Should().Be("test-key");
        config.GeminiModelId.Should().Be("gemini-3-pro-image-preview");
    }

    [Fact]
    public void Configuration_CanSetCustomGeminiModel()
    {
        var config = new AgentConfiguration
        {
            GeminiModelId = "gemini-3-pro-image-preview"
        };

        config.GeminiModelId.Should().Be("gemini-3-pro-image-preview");
    }

    [Fact]
    public void Configuration_AzureDefaults()
    {
        var config = new AgentConfiguration();

        config.UseAzure.Should().BeFalse();
        config.AzureEndpoint.Should().BeNull();
    }
}

