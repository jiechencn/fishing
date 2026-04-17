using FishingApi.Data;
using FishingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FishingApi.Services;

public class ActivityService
{
    private readonly FishingContext db;

    public ActivityService(FishingContext db)
    {
        this.db = db;
    }

    public async Task<List<Activity>> GetAllAsync()
    {
        return await db.Activities.Include(a => a.FishTypeNavigation).ToListAsync();
    }

    public async Task<Activity?> GetAsync(Guid id)
    {
        return await db.Activities.Include(a => a.FishTypeNavigation)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<Activity> AddAsync(DateTime dateTime, string fishType,
        string location = "", string locationName = "", string weather = "",
        string fishInfo = "", string skill = "",
        string locationMap = "", string imageLink = "", string videoLink = "")
    {
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            DateTime = dateTime.ToUniversalTime(),
            FishType = fishType,
            Location = location,
            LocationName = locationName,
            Weather = weather,
            FishInfo = fishInfo,
            Skill = skill,
            LocationMap = locationMap,
            ImageLink = imageLink,
            VideoLink = videoLink
        };
        db.Activities.Add(activity);
        await db.SaveChangesAsync();
        return activity;
    }

    public async Task<Activity?> UpdateAsync(Guid id, DateTime? dateTime = null, string? fishType = null,
        string? location = null, string? locationName = null, string? weather = null,
        string? fishInfo = null, string? skill = null,
        string? locationMap = null, string? imageLink = null, string? videoLink = null)
    {
        var activity = await db.Activities.FindAsync(id);
        if (activity == null) return null;

        if (dateTime != null) activity.DateTime = dateTime.Value.ToUniversalTime();
        if (fishType != null) activity.FishType = fishType;
        if (location != null) activity.Location = location;
        if (locationName != null) activity.LocationName = locationName;
        if (weather != null) activity.Weather = weather;
        if (fishInfo != null) activity.FishInfo = fishInfo;
        if (skill != null) activity.Skill = skill;
        if (locationMap != null) activity.LocationMap = locationMap;
        if (imageLink != null) activity.ImageLink = imageLink;
        if (videoLink != null) activity.VideoLink = videoLink;

        await db.SaveChangesAsync();
        return activity;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var activity = await db.Activities.FindAsync(id);
        if (activity == null) return false;

        db.Activities.Remove(activity);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(Guid id)
    {
        return await db.Activities.AnyAsync(a => a.Id == id);
    }
}
