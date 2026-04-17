using System.ComponentModel;
using System.Text.Json;
using FishingApi.Models;
using ModelContextProtocol.Server;

namespace FishingApi.Services;

[McpServerToolType]
public class FishingTools
{
    private readonly SpeciesService speciesService;
    private readonly ActivityService activityService;
    private readonly IBlobStorageClient blobStorageClient;
    private readonly ILbsClient lbsClient;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public FishingTools(SpeciesService speciesService, ActivityService activityService, IBlobStorageClient blobStorageClient, ILbsClient lbsClient)
    {
        this.speciesService = speciesService;
        this.activityService = activityService;
        this.blobStorageClient = blobStorageClient;
        this.lbsClient = lbsClient;
    }

    // ---- Species ----

    [McpServerTool, Description("Get all species from the database")]
    public async Task<string> GetAllSpecies()
    {
        var types = await speciesService.GetAllAsync();
        return JsonSerializer.Serialize(types, JsonOptions);
    }

    [McpServerTool, Description("Get a specific species by its type name")]
    public async Task<string> GetSpecies(
        [Description("The species type name")] string type)
    {
        var fish = await speciesService.GetAsync(type);
        return fish == null ? "Not found." : JsonSerializer.Serialize(fish, JsonOptions);
    }

    [McpServerTool, Description("Add a new species")]
    public async Task<string> AddSpecies(
        [Description("The species type name")] string type,
        [Description("Description of the species")] string description)
    {
        await speciesService.AddAsync(type, description);
        return $"Species '{type}' added.";
    }

    [McpServerTool, Description("Update the description of an existing species")]
    public async Task<string> UpdateSpecies(
        [Description("The species type name")] string type,
        [Description("New description")] string description)
    {
        var updated = await speciesService.UpdateAsync(type, description);
        return updated == null ? $"Species '{type}' not found." : $"Species '{type}' updated.";
    }

    [McpServerTool, Description("Delete a species")]
    public async Task<string> DeleteSpecies(
        [Description("The species type name to delete")] string type)
    {
        var deleted = await speciesService.DeleteAsync(type);
        return deleted ? $"Species '{type}' deleted." : $"Species '{type}' not found.";
    }

    // ---- Activities ----

    [McpServerTool, Description("Get all fishing activities")]
    public async Task<string> GetAllActivities()
    {
        var activities = await activityService.GetAllAsync();
        return JsonSerializer.Serialize(activities, JsonOptions);
    }

    [McpServerTool, Description("Get a specific fishing activity by ID")]
    public async Task<string> GetActivity(
        [Description("The activity ID (GUID)")] string id)
    {
        var activity = await activityService.GetAsync(Guid.Parse(id));
        return activity == null ? "Not found." : JsonSerializer.Serialize(activity, JsonOptions);
    }

    [McpServerTool, Description("Add a new fishing activity")]
    public async Task<string> AddActivity(
        [Description("ISO 8601 datetime in UTC")] string datetime,
        [Description("The species type (must exist in species table)")] string fishtype,
        [Description("Fishing location coordinates (longitude,latitude)")] string? location = null,
        [Description("Fishing location name / address")] string? locationname = null,
        [Description("Weather conditions (weather, wind direction, wind power, temperature)")] string? weather = null,
        [Description("Fish info: weight and length, e.g. 2.5kg, 45cm")] string? fishinfo = null,
        [Description("Skill: lure type, rod info, technique, water layer control")] string? skill = null,
        [Description("Image URL or data URI")] string? imagelink = null,
        [Description("Video URL or data URI")] string? videolink = null)
    {
        var activity = await activityService.AddAsync(
            DateTime.Parse(datetime), fishtype,
            location ?? "", locationname ?? "", weather ?? "",
            fishinfo ?? "", skill ?? "",
            "", imagelink ?? "", videolink ?? "");

        // Upload static map if location coordinates are available
        if (!string.IsNullOrEmpty(location) && location.Contains(','))
        {
            try
            {
                var parts = location.Split(',');
                var mapBytes = await lbsClient.GetStaticMapAsync(parts[0], parts[1]);
                using var stream = new MemoryStream(mapBytes);
                var mapUrl = await blobStorageClient.UploadAsync(stream, "image/jpeg", $"map_{activity.Id}.jpg");
                await activityService.UpdateAsync(activity.Id, locationMap: mapUrl);
            }
            catch { /* ignore map upload failure */ }
        }

        return $"Activity {activity.Id} added.";
    }

    [McpServerTool, Description("Update an existing fishing activity. Only provided fields will be updated.")]
    public async Task<string> UpdateActivity(
        [Description("The activity ID to update (GUID)")] string id,
        [Description("New ISO 8601 datetime in UTC")] string? datetime = null,
        [Description("New species type")] string? fishtype = null,
        [Description("New location coordinates (longitude,latitude)")] string? location = null,
        [Description("New location name / address")] string? locationname = null,
        [Description("New weather conditions")] string? weather = null,
        [Description("New fish info (weight and length)")] string? fishinfo = null,
        [Description("New skill (lure type, rod info, technique, water layer)")] string? skill = null,
        [Description("New image link")] string? imagelink = null,
        [Description("New video link")] string? videolink = null)
    {
        var guid = Guid.Parse(id);
        var updated = await activityService.UpdateAsync(guid,
            datetime != null ? DateTime.Parse(datetime) : null,
            fishtype, location, locationname, weather,
            fishinfo, skill,
            locationMap: null, imagelink, videolink);
        if (updated == null) return $"Activity {id} not found.";

        // Re-upload static map if location changed
        if (!string.IsNullOrEmpty(location) && location.Contains(','))
        {
            try
            {
                var parts = location.Split(',');
                var mapBytes = await lbsClient.GetStaticMapAsync(parts[0], parts[1]);
                using var stream = new MemoryStream(mapBytes);
                var mapUrl = await blobStorageClient.UploadAsync(stream, "image/jpeg", $"map_{guid}.jpg");
                await activityService.UpdateAsync(guid, locationMap: mapUrl);
            }
            catch { /* ignore map upload failure */ }
        }

        return $"Activity {id} updated.";
    }

    [McpServerTool, Description("Delete a fishing activity by ID")]
    public async Task<string> DeleteActivity(
        [Description("The activity ID to delete (GUID)")] string id)
    {
        var guid = Guid.Parse(id);
        var deleted = await activityService.DeleteAsync(guid);
        return deleted ? $"Activity {id} deleted." : $"Activity {id} not found.";
    }

    [McpServerTool, Description("Upload a photo for a fishing activity. The image is stored in Azure Blob Storage and the URL is saved to the activity.")]
    public async Task<string> UploadActivityPhoto(
        [Description("The activity ID (GUID)")] string id,
        [Description("Base64-encoded image data (without data URI prefix)")] string base64Image,
        [Description("Image content type, e.g. image/jpeg, image/png")] string contentType = "image/jpeg")
    {
        var guid = Guid.Parse(id);
        var activity = await activityService.GetAsync(guid);
        if (activity == null) return $"Activity {id} not found.";

        // Strip data URI prefix if present (e.g. "data:image/png;base64,...")
        var raw = base64Image;
        if (raw.Contains(','))
        {
            var parts = raw.Split(',', 2);
            if (parts[0].Contains("base64"))
            {
                var meta = parts[0]; // e.g. "data:image/png;base64"
                raw = parts[1];
                var typeMatch = meta.IndexOf(':') >= 0 && meta.IndexOf(';') > meta.IndexOf(':')
                    ? meta[(meta.IndexOf(':') + 1)..meta.IndexOf(';')]
                    : null;
                if (typeMatch != null) contentType = typeMatch;
            }
        }

        var bytes = Convert.FromBase64String(raw);
        using var stream = new MemoryStream(bytes);
        var extension = contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            _ => ""
        };
        var blobUrl = await blobStorageClient.UploadAsync(stream, contentType, $"{guid}{extension}");
        await activityService.UpdateAsync(guid, imageLink: blobUrl);
        return $"Photo uploaded for activity {id}. URL: {blobUrl}";
    }

    // ---- LBS (Location & Weather) ----

    private static readonly Dictionary<string, string> CityCodeMap = new()
    {
        ["苏州市"] = "320500",
        ["苏州"] = "320500",
        ["虎丘区"] = "320505",
        ["虎丘"] = "320505",
        ["吴中区"] = "320506",
        ["吴中"] = "320506",
        ["相城区"] = "320507",
        ["相城"] = "320507",
        ["姑苏区"] = "320508",
        ["姑苏"] = "320508",
        ["吴江区"] = "320509",
        ["吴江"] = "320509",
        ["常熟市"] = "320581",
        ["常熟"] = "320581",
        ["张家港市"] = "320582",
        ["张家港"] = "320582",
        ["昆山市"] = "320583",
        ["昆山"] = "320583",
        ["太仓市"] = "320585",
        ["太仓"] = "320585",
    };

    [McpServerTool, Description("Look up city adcode by Chinese city name. Supports Suzhou districts: Suzhou, Huqiu, Wuzhong, Xiangcheng, Gusu, Wujiang, Changshu, Zhangjiagang, Kunshan, Taicang.")]
    public string GetCityCode(
        [Description("City or district name in Chinese, e.g. Xiangcheng/Kunshan")] string cityName)
    {
        if (CityCodeMap.TryGetValue(cityName, out var code))
            return $"{cityName}: {code}";
        return $"City '{cityName}' not found. Available: {string.Join(", ", CityCodeMap.Keys.Where(k => k.EndsWith("区") || k.EndsWith("市") || k == "张家港"))}";
    }

    [McpServerTool, Description("Get today's weather for a location. Returns weather, wind direction, wind power, and temperature. Use GetCityCode first to get the adcode.")]
    public async Task<string> GetWeather(
        [Description("City adcode, e.g. 320507")] string cityCode)
    {
        var result = await lbsClient.GetWeatherAsync(cityCode);
        return result.ToString();
    }

    [McpServerTool, Description("Get weather forecast for a location.")]
    public async Task<string> GetWeatherForecast(
        [Description("City adcode, e.g. 320507")] string cityCode)
    {
        var result = await lbsClient.GetWeatherForecastAsync(cityCode);
        return result.ToString();
    }

    [McpServerTool, Description("Get geo coordinates (longitude, latitude) and adcode from an address name. Use this to look up location and city code for weather queries.")]
    public async Task<string> GetGeoByAddress(
        [Description("Address or place name")] string address)
    {
        var result = await lbsClient.GetLocationByNameAsync(address);
        return result.ToString();
    }

    [McpServerTool, Description("Get address name from geo coordinates (reverse geocoding).")]
    public async Task<string> GetAddressByGeo(
        [Description("Longitude, e.g. 120.757717")] string longitude,
        [Description("Latitude, e.g. 31.404225")] string latitude)
    {
        var result = await lbsClient.GetNameByLocationAsync(longitude, latitude);
        return result.ToString();
    }
}
