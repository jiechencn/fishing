using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FishingApi.Models;
using FishingApi.Services;

namespace FishingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AzureOpenAiService claudeService;
    private readonly IBlobStorageClient blobStorage;
    private readonly ActivityService activityService;

    public ChatController(AzureOpenAiService claudeService, IBlobStorageClient blobStorage, ActivityService activityService)
    {
        this.claudeService = claudeService;
        this.blobStorage = blobStorage;
        this.activityService = activityService;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ChatResponse>> Chat(ChatRequest request)
    {
        var reply = await claudeService.ChatAsync(request.Message, request.History);
        return Ok(new ChatResponse { Reply = reply });
    }

    [HttpPost("upload-image/{activityId}")]
    [Authorize]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadImage(Guid activityId, IFormFile file)
    {
        if (!file.ContentType.StartsWith("image/"))
            return BadRequest("File must be an image.");

        var activity = await activityService.GetAsync(activityId);
        if (activity == null)
            return NotFound();

        using var stream = file.OpenReadStream();
        var extension = file.ContentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            _ => ""
        };
        var blobUrl = await blobStorage.UploadAsync(stream, file.ContentType, $"{activityId}{extension}");
        await activityService.UpdateAsync(activityId, imageLink: blobUrl);

        return Ok(new { activityId, imageLink = blobUrl });
    }
}
