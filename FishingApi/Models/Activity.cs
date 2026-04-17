using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FishingApi.Models;

[Table("activities")]
public class Activity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("datetime")]
    public DateTime DateTime { get; set; }

    [Column("fishtype")]
    public string FishType { get; set; } = string.Empty;

    [Column("location")]
    public string Location { get; set; } = string.Empty;

    [Column("locationname")]
    public string LocationName { get; set; } = string.Empty;

    [Column("weather")]
    public string Weather { get; set; } = string.Empty;

    [Column("fishinfo")]
    public string FishInfo { get; set; } = string.Empty;

    [Column("skill")]
    public string Skill { get; set; } = string.Empty;

    [Column("locationmap")]
    public string LocationMap { get; set; } = string.Empty;

    [Column("imagelink")]
    public string ImageLink { get; set; } = string.Empty;

    [Column("videolink")]
    public string VideoLink { get; set; } = string.Empty;

    [ForeignKey(nameof(FishType))]
    public Species? FishTypeNavigation { get; set; }
}
