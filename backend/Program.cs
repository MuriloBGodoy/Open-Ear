using System.Net;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:5099");

builder.Services.AddHttpClient("groq", c =>
{
    c.BaseAddress = new Uri("https://api.groq.com/");
    // Groq transcreve a ~228x real-time, mas rede ruim + arquivo grande pede folga.
    c.Timeout = TimeSpan.FromMinutes(3);
});

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:5173", "http://localhost:4173")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// Groq recusa acima de 25 MB no tier free. O cliente já fatia antes de chegar aqui;
// esta guarda existe para dar erro legível em vez de 413 opaco da Groq.
const long MaxUploadBytes = 24L * 1024 * 1024;
const string Model = "whisper-large-v3-turbo";

static string? ResolveKey(IConfiguration cfg) =>
    Environment.GetEnvironmentVariable("GROQ_API_KEY") ?? cfg["GROQ_API_KEY"];

app.MapGet("/api/health", (IConfiguration cfg) => Results.Ok(new
{
    ok = true,
    model = Model,
    groqConfigured = !string.IsNullOrWhiteSpace(ResolveKey(cfg)),
}));

app.MapPost("/api/transcribe", async (
    IFormFile file,
    HttpRequest request,
    IHttpClientFactory factory,
    IConfiguration cfg,
    ILogger<Program> log,
    CancellationToken ct) =>
{
    var key = ResolveKey(cfg);
    if (string.IsNullOrWhiteSpace(key))
        return Results.Json(new { error = "GROQ_API_KEY não configurada no backend." }, statusCode: 503);

    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "Nenhum áudio recebido." });

    if (file.Length > MaxUploadBytes)
        return Results.Json(new
        {
            error = $"Áudio de {file.Length / 1_048_576.0:F1} MB excede o limite de 24 MB. Fatie antes de enviar.",
        }, statusCode: 413);

    // "live" = chunk curto de conversa ao vivo; queremos só o texto, o mais rápido possível.
    var isLive = request.Form["mode"].ToString() == "live";
    // Ausente de propósito = o usuário escolheu detecção automática. Não chutamos
    // "pt": forçar o idioma errado é pior que deixar o modelo detectar.
    var language = request.Form["language"].ToString();
    var prompt = request.Form["prompt"].ToString();

    using var form = new MultipartFormDataContent();
    await using var stream = file.OpenReadStream();
    form.Add(new StreamContent(stream), "file", string.IsNullOrWhiteSpace(file.FileName) ? "audio.webm" : file.FileName);
    form.Add(new StringContent(Model), "model");
    if (!string.IsNullOrWhiteSpace(language))
        form.Add(new StringContent(language), "language");
    form.Add(new StringContent(isLive ? "json" : "verbose_json"), "response_format");
    // temperature 0 = menos alucinação em trecho curto/silencioso
    form.Add(new StringContent("0"), "temperature");
    if (!string.IsNullOrWhiteSpace(prompt))
        form.Add(new StringContent(prompt), "prompt");

    var http = factory.CreateClient("groq");
    using var req = new HttpRequestMessage(HttpMethod.Post, "openai/v1/audio/transcriptions") { Content = form };
    req.Headers.Authorization = new("Bearer", key);

    try
    {
        using var res = await http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);

        if (res.IsSuccessStatusCode)
            return Results.Content(body, "application/json");

        log.LogWarning("Groq respondeu {Status}: {Body}", (int)res.StatusCode, body);

        var message = res.StatusCode switch
        {
            HttpStatusCode.Unauthorized => "Chave da Groq inválida ou expirada.",
            HttpStatusCode.TooManyRequests => "Limite de uso da Groq atingido. Aguarde um instante e tente de novo.",
            HttpStatusCode.RequestEntityTooLarge => "Áudio grande demais para a Groq. Fatie em trechos menores.",
            HttpStatusCode.BadRequest => "A Groq recusou o áudio (formato ou duração inválidos).",
            _ => $"Falha na transcrição (HTTP {(int)res.StatusCode}).",
        };
        return Results.Json(new { error = message, upstream = SafeUpstream(body) }, statusCode: (int)res.StatusCode);
    }
    catch (TaskCanceledException) when (!ct.IsCancellationRequested)
    {
        return Results.Json(new { error = "A transcrição demorou demais e foi cancelada." }, statusCode: 504);
    }
    catch (HttpRequestException ex)
    {
        log.LogError(ex, "Erro de rede ao falar com a Groq");
        return Results.Json(new { error = "Não foi possível alcançar a Groq. Verifique a conexão." }, statusCode: 502);
    }
})
.DisableAntiforgery();

// Evita vazar detalhe interno da upstream no cliente, mas preserva o campo `message`
// quando a Groq manda algo útil (ex.: formato de arquivo não suportado).
static string? SafeUpstream(string body)
{
    try
    {
        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.TryGetProperty("error", out var err) &&
            err.TryGetProperty("message", out var msg))
            return msg.GetString();
    }
    catch (JsonException) { /* corpo não-JSON: ignora */ }
    return null;
}

app.Run();
