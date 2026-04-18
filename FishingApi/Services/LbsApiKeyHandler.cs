using System.Security.Cryptography;
using System.Text;
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
        var uriWithKey = new Uri(QueryHelpers.AddQueryString(uri.ToString(), "key", options.ApiKey));

        if (!string.IsNullOrEmpty(options.SigningKey))
        {
            var query = QueryHelpers.ParseQuery(uriWithKey.Query);
            var sortedParams = query
                .OrderBy(kv => kv.Key, StringComparer.Ordinal)
                .Select(kv => $"{kv.Key}={kv.Value}")
                .ToList();
            var toSign = string.Join("&", sortedParams) + options.SigningKey;
            var hash = MD5.HashData(Encoding.UTF8.GetBytes(toSign));
            var sig = Convert.ToHexString(hash).ToLower();
            request.RequestUri = new Uri(QueryHelpers.AddQueryString(uriWithKey.ToString(), "sig", sig));
        }
        else
        {
            request.RequestUri = uriWithKey;
        }

        return base.SendAsync(request, cancellationToken);
    }
}
