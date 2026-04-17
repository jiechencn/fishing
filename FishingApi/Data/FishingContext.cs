using Microsoft.EntityFrameworkCore;
using FishingApi.Models;

namespace FishingApi.Data;

public class FishingContext : DbContext
{
    public FishingContext(DbContextOptions<FishingContext> options) : base(options)
    {
    }

    public DbSet<Species> Species { get; set; }
    public DbSet<Activity> Activities { get; set; }
}
