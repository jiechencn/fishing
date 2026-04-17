using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FishingApi.Models;

[Table("species")]
public class Species
{
    [Key]
    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("description")]
    public string Description { get; set; } = string.Empty;
}
