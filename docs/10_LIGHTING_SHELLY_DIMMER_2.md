# 10 — Lighting: Shelly Dimmer 2

## Obiettivo

Gestire grow light E27 tramite Shelly Dimmer 2.

## Funzioni MVP

- stato ON/OFF;
- accensione;
- spegnimento;
- impostazione luminosità;
- lettura stato;
- storico eventi;
- associazione a zona.

## Integrazione

Il backend .NET comunica con Shelly Dimmer 2 tramite API HTTP locale.

```text
.NET API / Worker -> HTTP LAN -> Shelly Dimmer 2
```

## Entità

### lighting_systems

- provider: `shelly_dimmer_2`;
- device_host: IP locale Shelly;
- zone_id;
- config_json.

### lighting_events

Tracciare:

- on;
- off;
- brightness_changed;
- sync_status;
- schedule_applied;
- manual_override;
- error.

## Comandi

Il servizio applicativo deve astrarre Shelly dietro un’interfaccia:

```csharp
public interface ILightingProvider
{
    Task<LightingState> GetStateAsync(Guid lightingSystemId);
    Task TurnOnAsync(Guid lightingSystemId);
    Task TurnOffAsync(Guid lightingSystemId);
    Task SetBrightnessAsync(Guid lightingSystemId, int brightnessPercent);
}
```

Implementazione iniziale:

```text
ShellyDimmer2LightingProvider
```

## Brightness

Valore UI:

```text
0-100%
```

Il provider deve convertire nel formato richiesto dall’API Shelly.

## Schedulazioni

La schedulazione può essere gestita da GrowLab, non da Shelly.

Esempio:

```text
08:00 ON 60%
20:00 OFF
```

Il Worker applica la schedulazione.

## Sicurezza

- Non esporre Shelly su internet.
- Usare IP statico o DHCP reservation.
- Loggare ogni comando.
- Gestire timeout.
- Gestire device non raggiungibile.
- Prevedere override manuale.
