using System.Text.Json;

namespace FishingApi.Services;

public interface ILbsClient
{
    Task<JsonElement> GetWeatherAsync(string cityCode);
    Task<JsonElement> GetWeatherForecastAsync(string cityCode);
    Task<JsonElement> GetLocationByNameAsync(string address);
    Task<JsonElement> GetNameByLocationAsync(string longitude, string latitude);
    Task<byte[]> GetStaticMapAsync(string longitude, string latitude, int zoom = 14, string size = "400*300", int scale = 2);
}

public class LbsClient : ILbsClient
{
    private readonly HttpClient httpClient;

    public LbsClient(HttpClient httpClient)
    {
        this.httpClient = httpClient;
    }

    public async Task<JsonElement> GetWeatherAsync(string cityCode)
    {
        return await GetJsonAsync($"weather/weatherInfo?city={cityCode}&extensions=base");
    }

    public async Task<JsonElement> GetWeatherForecastAsync(string cityCode)
    {
        return await GetJsonAsync($"weather/weatherInfo?city={cityCode}&extensions=all");
    }

    public async Task<JsonElement> GetLocationByNameAsync(string address)
    {
        return await GetJsonAsync($"geocode/geo?address={Uri.EscapeDataString(address)}");
    }

    public async Task<JsonElement> GetNameByLocationAsync(string longitude, string latitude)
    {
        return await GetJsonAsync($"geocode/regeo?location={longitude},{latitude}");
    }

    public async Task<byte[]> GetStaticMapAsync(string longitude, string latitude, int zoom = 14, string size = "400*300", int scale = 2)
    {
        var location = $"{longitude},{latitude}";
        var path = $"staticmap?location={location}&zoom={zoom}&size={size}&markers=mid,,A:{location}&scale={scale}";
        return await httpClient.GetByteArrayAsync(path);
    }

    private async Task<JsonElement> GetJsonAsync(string path)
    {
        var response = await httpClient.GetStringAsync(path);
        return JsonDocument.Parse(response).RootElement;
    }
}
