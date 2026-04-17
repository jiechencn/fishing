using FishingApi.Data;
using FishingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FishingApi.Services;

public class SpeciesService
{
    private readonly FishingContext db;

    public SpeciesService(FishingContext db)
    {
        this.db = db;
    }

    public async Task<List<Species>> GetAllAsync()
    {
        return await db.Species.ToListAsync();
    }

    public async Task<Species?> GetAsync(string type)
    {
        return await db.Species.FindAsync(type);
    }

    public async Task<Species> AddAsync(string type, string description)
    {
        var species = new Species { Type = type, Description = description };
        db.Species.Add(species);
        await db.SaveChangesAsync();
        return species;
    }

    public async Task<Species?> UpdateAsync(string type, string description)
    {
        var species = await db.Species.FindAsync(type);
        if (species == null) return null;

        species.Description = description;
        await db.SaveChangesAsync();
        return species;
    }

    public async Task<bool> DeleteAsync(string type)
    {
        var species = await db.Species.FindAsync(type);
        if (species == null) return false;

        db.Species.Remove(species);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(string type)
    {
        return await db.Species.AnyAsync(s => s.Type == type);
    }
}
