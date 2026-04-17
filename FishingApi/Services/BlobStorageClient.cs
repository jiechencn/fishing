using Azure.Core;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace FishingApi.Services;

public interface IBlobStorageClient
{
    Task<string> UploadAsync(Stream content, string contentType, string? fileName = null);
    Task DeleteAsync(string blobUrl);
}

public class BlobStorageClient : IBlobStorageClient
{
    private readonly BlobContainerClient containerClient;
    private bool containerEnsured;

    public BlobStorageClient(Uri accountUri, string containerName, TokenCredential credential)
    {
        var serviceClient = new BlobServiceClient(accountUri, credential);
        containerClient = serviceClient.GetBlobContainerClient(containerName);
    }

    public BlobStorageClient(string connectionString, string containerName)
    {
        var serviceClient = new BlobServiceClient(connectionString);
        containerClient = serviceClient.GetBlobContainerClient(containerName);
    }

    private async Task EnsureContainerAsync()
    {
        if (containerEnsured) return;
        await containerClient.CreateIfNotExistsAsync();
        containerEnsured = true;
    }

    public async Task<string> UploadAsync(Stream content, string contentType, string? fileName = null)
    {
        await EnsureContainerAsync();
        var blobName = fileName ?? $"{Guid.NewGuid()}{GetExtension(contentType)}";
        var blobClient = containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });

        return blobClient.Uri.ToString();
    }

    public async Task DeleteAsync(string blobUrl)
    {
        var uri = new Uri(blobUrl);
        var blobName = uri.Segments[^1];
        var blobClient = containerClient.GetBlobClient(blobName);
        await blobClient.DeleteIfExistsAsync();
    }

    private static string GetExtension(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/gif" => ".gif",
        "image/webp" => ".webp",
        _ => ""
    };
}
