using System.Text;
using MatBackend.Core.Models.Agents;

namespace MatBackend.Core.Utilities;

/// <summary>
/// Converts a <see cref="PipelineDescriptor"/> into a Mermaid flowchart string.
/// Node shapes encode step characteristics:
///   - Default rectangle: sequential step
///   - Stadium shape (rounded): parallel step
///   - Dashed border (subgraph note): background step
///   - Dotted edge: optional dependency
/// </summary>
public static class MermaidDiagramGenerator
{
    public static string Generate(PipelineDescriptor pipeline)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"flowchart TD");

        var parallelGroups = pipeline.Steps
            .Where(s => s.IsParallel)
            .GroupBy(s => string.Join(",", s.DependsOn.OrderBy(d => d)))
            .Where(g => g.Count() > 1)
            .ToList();

        var stepsInSubgraph = new HashSet<string>();

        foreach (var step in pipeline.Steps)
        {
            var id = SanitizeId(step.AgentName);
            var label = FormatLabel(step);

            if (step.IsParallel)
                sb.AppendLine($"    {id}([{label}])");
            else
                sb.AppendLine($"    {id}[{label}]");
        }

        sb.AppendLine();

        foreach (var group in parallelGroups)
        {
            var members = group.ToList();
            var subgraphId = "parallel_" + SanitizeId(members[0].AgentName);
            sb.AppendLine($"    subgraph {subgraphId} [\"Parallel\"]");
            foreach (var member in members)
            {
                sb.AppendLine($"        {SanitizeId(member.AgentName)}");
                stepsInSubgraph.Add(member.AgentName);
            }
            sb.AppendLine("    end");
            sb.AppendLine();
        }

        foreach (var step in pipeline.Steps)
        {
            var targetId = SanitizeId(step.AgentName);
            foreach (var dep in step.DependsOn)
            {
                var sourceId = SanitizeId(dep);
                var edgeStyle = step.IsOptional ? "-.->" : "-->";
                if (step.IsBackground)
                    sb.AppendLine($"    {sourceId} {edgeStyle}|\"background\"| {targetId}");
                else
                    sb.AppendLine($"    {sourceId} {edgeStyle} {targetId}");
            }
        }

        return sb.ToString().TrimEnd();
    }

    /// <summary>
    /// Generates a complete Markdown section with a title and fenced mermaid block.
    /// </summary>
    public static string GenerateMarkdownSection(PipelineDescriptor pipeline)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"### {pipeline.Name}");
        sb.AppendLine();
        sb.AppendLine(pipeline.Description);
        sb.AppendLine();
        sb.AppendLine("```mermaid");
        sb.AppendLine(Generate(pipeline));
        sb.AppendLine("```");
        return sb.ToString().TrimEnd();
    }

    private static string SanitizeId(string name) =>
        name.Replace(" ", "").Replace("-", "").Replace(".", "");

    private static string FormatLabel(PipelineStep step)
    {
        var parts = new List<string> { step.AgentName };
        if (!string.IsNullOrEmpty(step.Description))
            parts.Add(step.Description);

        var label = string.Join("<br/>", parts);

        var badges = new List<string>();
        if (step.IsOptional) badges.Add("optional");
        if (step.IsBackground) badges.Add("background");

        if (badges.Count > 0)
            label += $"<br/>({string.Join(", ", badges)})";

        return $"\"{label}\"";
    }
}
