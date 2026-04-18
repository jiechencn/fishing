namespace FishingApi.Options;

public class ApiOptions
{
    public CorsOptions Cors { get; set; } = new();
    public DatabaseOptions Database { get; set; } = new();
    public UserMsiOptions UserMsi { get; set; } = new();
    public AzureOpenAIOptions AzureOpenAI { get; set; } = new();
    public BlobStorageOptions BlobStorage { get; set; } = new();
    public LbsOptions Lbs { get; set; } = new();
}

public class CorsOptions
{
    public string[] Origins { get; set; } = [];
}

public class DatabaseOptions
{
    public string Server { get; set; } = string.Empty;
    public string LocalServer { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool UseLocal { get; set; } = false;
}

public class UserMsiOptions
{
    public string Id { get; set; } = string.Empty;
}

public class AzureOpenAIOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string DeploymentName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}

public class LbsOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public string JsBaseUrl { get; set; } = string.Empty;
    public string JsApiKey { get; set; } = string.Empty;
    public string JsSecurityCode { get; set; } = string.Empty;
}

public class BlobStorageOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public string AccountUri { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;
}
