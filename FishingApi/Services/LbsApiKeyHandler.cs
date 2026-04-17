using FishingApi.Options;
using Microsoft.AspNetCore.WebUtilities;

namespace FishingApi.Services;

public class LbsApiKeyHandler : DelegatingHandler
{
    private readonly LbsOptions options;

    public LbsApiKeyHandler(LbsOptions options)
    {
        this.options = options;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var uri = request.RequestUri!;
        var newUri = QueryHelpers.AddQueryString(uri.ToString(), "key", options.ApiKey);
        request.RequestUri = new Uri(newUri);
        return base.SendAsync(request, cancellationToken);
    }
}
