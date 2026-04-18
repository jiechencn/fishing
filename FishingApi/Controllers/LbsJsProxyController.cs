using FishingApi.Options;
using Microsoft.AspNetCore.Mvc;

namespace FishingApi.Controllers;

[Route("/_AMapService")]
public class LbsJsProxyController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly LbsOptions _lbsOptions;

    public LbsJsProxyController(IHttpClientFactory httpClientFactory, LbsOptions lbsOptions)
    {
        _httpClient = httpClientFactory.CreateClient("LbsJsProxy");
        _lbsOptions = lbsOptions;
    }

    [HttpGet("{*path}")]
    public async Task ProxyAsync(string path = "")
    {
        var qs = HttpContext.Request.QueryString.Value ?? "";
        var sep = qs.Length > 0 ? "&" : "?";
        var url = $"{_lbsOptions.JsBaseUrl}{path}{qs}{sep}jscode={Uri.EscapeDataString(_lbsOptions.JsSecurityCode)}";

        using var upstream = await _httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
        Response.StatusCode = (int)upstream.StatusCode;
        var contentType = upstream.Content.Headers.ContentType?.ToString();
        if (contentType != null) Response.ContentType = contentType;
        await upstream.Content.CopyToAsync(Response.Body);
    }
}
