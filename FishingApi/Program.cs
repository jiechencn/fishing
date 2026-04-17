using System.ClientModel;
using Azure.AI.OpenAI;
using Azure.Core;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Identity.Web;
using FishingApi.Data;
using FishingApi.Options;
using FishingApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add Azure Key Vault as a configuration source.
var keyVaultUri = builder.Configuration["KeyVault:VaultUri"];
var userMsiId = builder.Configuration["UserMsi:Id"];
TokenCredential credential = builder.Environment.IsDevelopment()
    ? new DefaultAzureCredential()
    : new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(userMsiId!));
if (!string.IsNullOrEmpty(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(
        new SecretClient(new Uri(keyVaultUri), credential),
        new AzureKeyVaultConfigurationOptions
        {
            Manager = new KeyVaultSecretManager(),
            ReloadInterval = TimeSpan.FromMinutes(15),
        });
}

// Bind options
var apiOptions = builder.Configuration.Get<ApiOptions>()!;

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Database
var sqlConnectionBuilder = new SqlConnectionStringBuilder
{
    DataSource = apiOptions.Database.Server,
    InitialCatalog = apiOptions.Database.Name
};
if (builder.Environment.IsDevelopment())
{
    sqlConnectionBuilder.IntegratedSecurity = true;
    sqlConnectionBuilder.TrustServerCertificate = true;
}
else
{
    sqlConnectionBuilder.UserID = apiOptions.UserMsi.Id;
    sqlConnectionBuilder.Authentication = SqlAuthenticationMethod.ActiveDirectoryDefault;
}
builder.Services.AddDbContext<FishingContext>(options =>
    options.UseSqlServer(sqlConnectionBuilder.ConnectionString));

// Azure OpenAI + Microsoft.Extensions.AI
builder.Services.AddChatClient(
    new AzureOpenAIClient(new Uri(apiOptions.AzureOpenAI.Endpoint), new ApiKeyCredential(apiOptions.AzureOpenAI.ApiKey))
        .GetChatClient(apiOptions.AzureOpenAI.DeploymentName)
        .AsIChatClient())
    .UseFunctionInvocation();

// MCP Server — exposes FishingTools via SSE at /mcp
builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.Stateless = true)
    .WithTools<FishingTools>();

// Blob Storage
if (!string.IsNullOrEmpty(apiOptions.BlobStorage.ConnectionString))
    builder.Services.AddSingleton<IBlobStorageClient>(new BlobStorageClient(
        apiOptions.BlobStorage.ConnectionString,
        apiOptions.BlobStorage.ContainerName));
else
    builder.Services.AddSingleton<IBlobStorageClient>(new BlobStorageClient(
        new Uri(apiOptions.BlobStorage.AccountUri),
        apiOptions.BlobStorage.ContainerName,
        credential));

// LBS (Amap)
builder.Services.AddTransient<LbsApiKeyHandler>();
builder.Services.AddSingleton(apiOptions.Lbs);
builder.Services.AddHttpClient<ILbsClient, LbsClient>(httpClient =>
{
    httpClient.BaseAddress = new Uri("https://restapi.amap.com/v3/");
}).AddHttpMessageHandler<LbsApiKeyHandler>();

builder.Services.AddScoped<FishingTools>();
builder.Services.AddScoped<SpeciesService>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<AzureOpenAiService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(apiOptions.Cors.Origins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapMcp("/mcp").RequireAuthorization();

app.Run();
