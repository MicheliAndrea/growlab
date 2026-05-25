FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore apps/worker/GrowLab.Worker/GrowLab.Worker.csproj
RUN dotnet publish apps/worker/GrowLab.Worker/GrowLab.Worker.csproj -c Release -o /app/publish /m:1 --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "GrowLab.Worker.dll"]
