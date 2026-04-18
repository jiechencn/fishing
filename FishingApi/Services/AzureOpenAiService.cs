using System.Reflection;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Server;

namespace FishingApi.Services;

public class AzureOpenAiService
{
    private readonly IChatClient chatClient;
    private readonly FishingTools fishingTools;
    private static readonly string SystemPrompt = LoadSystemPrompt();
    private static readonly System.Text.Json.JsonSerializerOptions AiFunctionJsonOptions = new(System.Text.Json.JsonSerializerDefaults.Web)
    {
        TypeInfoResolver = new System.Text.Json.Serialization.Metadata.DefaultJsonTypeInfoResolver()
    };

    public AzureOpenAiService(IChatClient chatClient, FishingTools fishingTools)
    {
        this.chatClient = chatClient;
        this.fishingTools = fishingTools;
    }

    private static string LoadSystemPrompt()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("FishingApi.Prompts.system-prompt.txt")!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    public async Task<string> ChatAsync(string userMessage, List<Models.ChatMessage> history)
    {
        var tools = typeof(FishingTools)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.GetCustomAttribute<McpServerToolAttribute>() != null)
            .Select(m => AIFunctionFactory.Create(m, fishingTools, serializerOptions: AiFunctionJsonOptions))
            .Cast<AITool>()
            .ToList();

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, SystemPrompt)
        };

        foreach (var msg in history)
        {
            var role = msg.Role == "user" ? ChatRole.User : ChatRole.Assistant;
            messages.Add(new ChatMessage(role, msg.Content));
        }

        messages.Add(new ChatMessage(ChatRole.User, userMessage));

        var options = new ChatOptions
        {
            Tools = [.. tools]
        };

        var response = await chatClient.GetResponseAsync(messages, options);
        return response.Text ?? "No response generated.";
    }
}
