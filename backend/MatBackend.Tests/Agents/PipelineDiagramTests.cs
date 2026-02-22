using FluentAssertions;
using MatBackend.Core.Models.Agents;
using MatBackend.Core.Utilities;

namespace MatBackend.Tests.Agents;

/// <summary>
/// Tests that every orchestrator declares a valid pipeline descriptor and that
/// the auto-generated Mermaid diagrams stay in sync with docs/agent-orchestration.md.
///
/// If these tests fail after you changed an orchestration flow, run them with
/// the UPDATE_PIPELINE_DOCS=1 environment variable to regenerate the doc section,
/// then commit the updated file.
/// </summary>
public class PipelineDiagramTests
{
    private static readonly string DocsRoot = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "docs"));

    private static readonly string DocsFile = Path.Combine(DocsRoot, "agent-orchestration.md");

    private const string StartMarker = "<!-- BEGIN AUTO-GENERATED PIPELINE DIAGRAMS -->";
    private const string EndMarker = "<!-- END AUTO-GENERATED PIPELINE DIAGRAMS -->";

    // ----------------------------------------------------------------
    // Descriptor validation
    // ----------------------------------------------------------------

    [Fact]
    public void StandardOrchestrator_DescribePipeline_ReturnsValidDescriptor()
    {
        var descriptor = StandardPipeline();

        descriptor.Name.Should().NotBeNullOrWhiteSpace();
        descriptor.Steps.Should().HaveCountGreaterOrEqualTo(2,
            "an orchestrator must coordinate at least two agents");

        AssertNoDuplicateNames(descriptor);
        AssertDependenciesExist(descriptor);
        AssertNoSelfDependencies(descriptor);
        AssertNoCycles(descriptor);
        AssertHasEntryPoint(descriptor);
    }

    [Fact]
    public void FastOrchestrator_DescribePipeline_ReturnsValidDescriptor()
    {
        var descriptor = FastPipeline();

        descriptor.Name.Should().NotBeNullOrWhiteSpace();
        descriptor.Steps.Should().HaveCountGreaterOrEqualTo(2);

        AssertNoDuplicateNames(descriptor);
        AssertDependenciesExist(descriptor);
        AssertNoSelfDependencies(descriptor);
        AssertNoCycles(descriptor);
        AssertHasEntryPoint(descriptor);
    }

    // ----------------------------------------------------------------
    // Mermaid generation smoke tests
    // ----------------------------------------------------------------

    [Fact]
    public void StandardOrchestrator_GeneratesMermaid_ContainsAllAgents()
    {
        var descriptor = StandardPipeline();
        var mermaid = MermaidDiagramGenerator.Generate(descriptor);

        mermaid.Should().StartWith("flowchart TD");
        foreach (var step in descriptor.Steps)
            mermaid.Should().Contain(step.AgentName);
    }

    [Fact]
    public void FastOrchestrator_GeneratesMermaid_ContainsAllAgents()
    {
        var descriptor = FastPipeline();
        var mermaid = MermaidDiagramGenerator.Generate(descriptor);

        mermaid.Should().StartWith("flowchart TD");
        foreach (var step in descriptor.Steps)
            mermaid.Should().Contain(step.AgentName);
    }

    [Fact]
    public void MermaidOutput_ContainsEdgesForAllDependencies()
    {
        var descriptor = FastPipeline();
        var mermaid = MermaidDiagramGenerator.Generate(descriptor);

        foreach (var step in descriptor.Steps)
        {
            foreach (var dep in step.DependsOn)
            {
                mermaid.Should().Contain(dep.Replace(" ", ""),
                    $"edge from {dep} to {step.AgentName} should be present");
            }
        }
    }

    // ----------------------------------------------------------------
    // Docs sync verification / generation
    // ----------------------------------------------------------------

    [Fact]
    public void GeneratedDiagrams_MatchCommittedDocs()
    {
        var generated = BuildDiagramSection();

        if (!File.Exists(DocsFile))
        {
            WriteDiagramSection(generated);
            return;
        }

        var currentDocs = File.ReadAllText(DocsFile);

        if (!currentDocs.Contains(StartMarker))
        {
            // Markers not yet present -- skip assertion, the update-docs step will add them.
            return;
        }

        var startIdx = currentDocs.IndexOf(StartMarker, StringComparison.Ordinal);
        var endIdx = currentDocs.IndexOf(EndMarker, StringComparison.Ordinal);

        if (startIdx < 0 || endIdx < 0)
            return;

        var committedSection = currentDocs
            .Substring(startIdx, endIdx + EndMarker.Length - startIdx)
            .ReplaceLineEndings("\n")
            .Trim();

        var expectedSection = $"{StartMarker}\n\n{generated}\n\n{EndMarker}"
            .ReplaceLineEndings("\n")
            .Trim();

        if (Environment.GetEnvironmentVariable("UPDATE_PIPELINE_DOCS") == "1")
        {
            WriteDiagramSection(generated);
            return;
        }

        committedSection.Should().Be(expectedSection,
            "the auto-generated pipeline diagrams in docs/agent-orchestration.md are out of date. " +
            "Run tests with UPDATE_PIPELINE_DOCS=1 to regenerate, or update DescribePipeline() in the orchestrator.");
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /// <summary>
    /// Instantiate the Standard orchestrator's pipeline descriptor directly
    /// (avoids needing all DI dependencies).
    /// </summary>
    private static PipelineDescriptor StandardPipeline()
    {
        var orchestrator = new Infrastructure.Agents.AgentOrchestrator(
            null!, null!, null!, null!, null!, null!, null!, null!, null!);
        return orchestrator.DescribePipeline();
    }

    private static PipelineDescriptor FastPipeline()
    {
        var orchestrator = new Infrastructure.Agents.FastAgentOrchestrator(
            null!, null!, null!, null!, null!, null!, null!);
        return orchestrator.DescribePipeline();
    }

    private static string BuildDiagramSection()
    {
        var standard = MermaidDiagramGenerator.GenerateMarkdownSection(StandardPipeline());
        var fast = MermaidDiagramGenerator.GenerateMarkdownSection(FastPipeline());
        return $"{standard}\n\n{fast}";
    }

    private static void WriteDiagramSection(string generated)
    {
        if (!File.Exists(DocsFile))
            return;

        var content = File.ReadAllText(DocsFile);
        var section = $"{StartMarker}\n\n{generated}\n\n{EndMarker}";

        if (content.Contains(StartMarker) && content.Contains(EndMarker))
        {
            var startIdx = content.IndexOf(StartMarker, StringComparison.Ordinal);
            var endIdx = content.IndexOf(EndMarker, StringComparison.Ordinal) + EndMarker.Length;
            content = string.Concat(content.AsSpan(0, startIdx), section, content.AsSpan(endIdx));
        }

        File.WriteAllText(DocsFile, content);
    }

    private static void AssertNoDuplicateNames(PipelineDescriptor descriptor)
    {
        var names = descriptor.Steps.Select(s => s.AgentName).ToList();
        names.Should().OnlyHaveUniqueItems("each step must have a unique AgentName");
    }

    private static void AssertDependenciesExist(PipelineDescriptor descriptor)
    {
        var names = descriptor.Steps.Select(s => s.AgentName).ToHashSet();
        foreach (var step in descriptor.Steps)
        {
            foreach (var dep in step.DependsOn)
            {
                names.Should().Contain(dep,
                    $"step '{step.AgentName}' depends on '{dep}' which is not declared as a step");
            }
        }
    }

    private static void AssertNoSelfDependencies(PipelineDescriptor descriptor)
    {
        foreach (var step in descriptor.Steps)
        {
            step.DependsOn.Should().NotContain(step.AgentName,
                $"step '{step.AgentName}' must not depend on itself");
        }
    }

    private static void AssertNoCycles(PipelineDescriptor descriptor)
    {
        var visited = new HashSet<string>();
        var inStack = new HashSet<string>();
        var adj = descriptor.Steps.ToDictionary(
            s => s.AgentName,
            s => s.DependsOn);

        foreach (var step in descriptor.Steps)
        {
            if (!visited.Contains(step.AgentName))
                HasCycle(step.AgentName, adj, visited, inStack).Should().BeFalse(
                    "the pipeline graph must be a DAG (no cycles)");
        }
    }

    private static bool HasCycle(
        string node,
        Dictionary<string, List<string>> adj,
        HashSet<string> visited,
        HashSet<string> inStack)
    {
        visited.Add(node);
        inStack.Add(node);

        if (adj.TryGetValue(node, out var deps))
        {
            foreach (var dep in deps)
            {
                if (!visited.Contains(dep))
                {
                    if (HasCycle(dep, adj, visited, inStack))
                        return true;
                }
                else if (inStack.Contains(dep))
                {
                    return true;
                }
            }
        }

        inStack.Remove(node);
        return false;
    }

    private static void AssertHasEntryPoint(PipelineDescriptor descriptor)
    {
        descriptor.Steps.Should().Contain(
            s => s.DependsOn.Count == 0,
            "the pipeline must have at least one entry point (step with no dependencies)");
    }
}
