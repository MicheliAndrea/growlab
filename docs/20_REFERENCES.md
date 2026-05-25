# 20 — References

Riferimenti tecnici usati per definire le scelte iniziali.

## .NET 10

- Documentazione Microsoft .NET 10 e ASP.NET Core 10.
- Usare SDK/runtime .NET 10 disponibili ufficialmente.

## Next.js

- Usare Next.js App Router.
- Preferire Server Components dove sensato.
- Usare Client Components per interazioni complesse.

## Ollama / Vision model

- Modello default: `qwen2.5vl:7b`.
- Fallback: `qwen2.5vl:3b`.
- L’architettura deve permettere cambio modello da configurazione.

## Shelly Dimmer 2

- Usare API HTTP locale Shelly Gen1.
- Non esporre Shelly su internet.
- Configurare IP statico o DHCP reservation.

## MQTT

- Broker default: EMQX.
- Payload JSON.
- Topic namespaced `growlab/...`.

## Note

Aggiornare questo documento se cambiano le scelte tecniche o i componenti.
