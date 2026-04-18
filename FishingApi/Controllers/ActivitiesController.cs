using FishingApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FishingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ActivitiesController : ControllerBase
{
    private readonly FishingContext _db;

    public ActivitiesController(FishingContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var activities = await _db.Activities
            .Where(a => !string.IsNullOrEmpty(a.LocationName))
            .OrderByDescending(a => a.DateTime)
            .Select(a => new
            {
                locationName = a.LocationName,
                locationMap = a.LocationMap,
                imageLink = a.ImageLink,
                dateTime = a.DateTime,
                fishType = a.FishType
            })
            .ToListAsync();

        return Ok(activities);
    }

    [HttpGet("geojson")]
    public async Task<IActionResult> GetGeoJson()
    {
        var activities = await _db.Activities
            .Where(a => !string.IsNullOrEmpty(a.LocationName)
                && !string.IsNullOrEmpty(a.Location))
            .OrderByDescending(a => a.DateTime)
            .ToListAsync();

        var features = activities
            .GroupBy(a => a.Location)
            .Select(g =>
            {
                var parts = g.Key.Split(',');
                if (parts.Length != 2
                    || !double.TryParse(parts[0], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lon)
                    || !double.TryParse(parts[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lat))
                    return null;
                var fishTypes = string.Join(", ", g.Select(a => a.FishType).Distinct());
                return (object)new
                {
                    type = "Feature",
                    properties = new { name = fishTypes, address = g.First().LocationName },
                    geometry = new { type = "Point", coordinates = new[] { lon, lat } }
                };
            })
            .Where(f => f != null)
            .ToList();

        return Ok(new { type = "FeatureCollection", features });
    }
}
