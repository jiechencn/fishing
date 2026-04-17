namespace FishingApi.Models;

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public List<ChatMessage> History { get; set; } = [];
}

public class ChatMessage
{
    public string Role { get; set; } = string.Empty; // "user" or "assistant"
    public string Content { get; set; } = string.Empty;
}

public class ChatResponse
{
    public string Reply { get; set; } = string.Empty;
}
