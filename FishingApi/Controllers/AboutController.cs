using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace FishingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AboutController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var version = Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "unknown";

        return Ok(new { version });
    }
}
