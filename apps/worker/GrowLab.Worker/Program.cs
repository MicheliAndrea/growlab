using GrowLab.Worker.Services;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSingleton<TelemetryProcessor>();
builder.Services.AddSingleton<DeviceHeartbeatMonitor>();
builder.Services.AddSingleton<OtaJobProcessor>();
builder.Services.AddSingleton<LightingSyncJob>();
builder.Services.AddSingleton<AlertProcessor>();
builder.Services.AddHostedService<MqttBackgroundService>();

var host = builder.Build();
host.Run();
