using System.Reflection;
using FishingApi.Options;
using Microsoft.AspNetCore.Mvc;

namespace FishingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AboutController : ControllerBase
{
    private readonly LbsOptions _lbsOptions;

    public AboutController(LbsOptions lbsOptions)
    {
        _lbsOptions = lbsOptions;
    }

    [HttpGet]
    public IActionResult Get()
    {
        var version = Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "unknown";

        return Ok(new { version, jsApiKey = _lbsOptions.JsApiKey });
    }
}
