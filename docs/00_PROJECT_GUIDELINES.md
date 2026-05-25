# GrowLab — Project Guidelines

## 1. Scopo del progetto

**GrowLab** è una piattaforma self-hosted per home lab pensata per la gestione, il monitoraggio e l’analisi dello stato delle piante tramite una combinazione di:

- web app moderna;
- backend locale;
- database PostgreSQL/TimescaleDB;
- comunicazione MQTT;
- dispositivi ESP32 configurabili;
- controllo grow light tramite Shelly Dimmer 2;
- upload immagini da smartphone;
- analisi AI locale tramite Ollama;
- storico completo di piante, zone, sensori, eventi e immagini;
- predisposizione futura per controllo irrigazione e OTA firmware.

Il progetto nasce per uso personale, ma deve essere strutturato fin dall’inizio in modo ordinato, documentato e potenzialmente pubblicabile come progetto open source in futuro.

---

## 2. Obiettivi principali

Gli obiettivi principali di GrowLab sono:

1. Gestire piante e zone di coltivazione indoor.
2. Monitorare lo stato ambientale tramite sensori IoT.
3. Salvare lo storico completo delle letture e degli eventi.
4. Controllare accensione e intensità delle grow light tramite Shelly Dimmer 2.
5. Caricare immagini da smartphone tramite web app.
6. Analizzare le immagini localmente con AI vision.
7. Generare suggerimenti sullo stato di salute delle piante.
8. Predisporre un sistema OTA per firmware ESP32.
9. Predisporre il modulo irrigazione, ma mantenerlo inizialmente disabilitato.
10. Mantenere l’intero sistema accessibile solo da LAN/VPN.
11. Evitare dipendenze cloud obbligatorie.
12. Costruire un’architettura modulare, documentata e manutenibile.

---

## 3. Principi architetturali

GrowLab deve seguire questi principi:

### 3.1 Local-first

Il sistema deve funzionare interamente in locale.

Le immagini, i dati sensori, lo storico piante e le analisi AI non devono dipendere da servizi cloud esterni.

### 3.2 LAN/VPN only

La piattaforma non è progettata per essere esposta direttamente su internet.

L’accesso deve avvenire tramite:

- rete locale;
- VPN personale;
- eventuale reverse proxy interno.

### 3.3 Modulare

Ogni componente deve avere una responsabilità chiara:

- frontend;
- API backend;
- worker background;
- servizio AI;
- MQTT broker;
- database;
- firmware ESP32;
- storage immagini.

### 3.4 Open source-ready

Anche se inizialmente il progetto è personale, deve essere progettato in modo da poter essere pubblicato in futuro.

Sono quindi richiesti:

- nessuna credenziale hardcoded;
- `.env.example`;
- documentazione chiara;
- configurazioni personali isolate;
- struttura repository ordinata;
- nomi tecnici coerenti;
- separazione tra codice, infrastruttura e documentazione.

### 3.5 Sicurezza prima dell’automazione

Le automazioni che possono causare danni fisici, come irrigazione o controllo pompe, devono essere inizialmente disabilitate.

Ogni modulo potenzialmente rischioso deve prevedere:

- feature flag;
- limiti massimi;
- conferme manuali;
- logging;
- kill switch;
- stato safe-by-default.

### 3.6 AI consultiva

L’AI non deve eseguire azioni automatiche.

L’AI può:

- analizzare immagini;
- descrivere lo stato della pianta;
- generare ipotesi;
- suggerire controlli;
- proporre interventi.

L’AI non può:

- attivare irrigazione;
- modificare schedulazioni luci;
- comandare dispositivi;
- modificare configurazioni critiche senza intervento umano.

---

## 4. Stack tecnologico scelto

### 4.1 Frontend

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Recharts

La web app deve essere moderna, responsive, mobile-first e comoda da usare anche da smartphone.

---

### 4.2 Backend

- .NET 10 Web API
- .NET 10 Worker Service

Il backend deve essere separato in:

1. **API applicativa**
   - gestione piante;
   - gestione zone;
   - gestione dispositivi;
   - gestione immagini;
   - gestione luce Shelly;
   - gestione AI;
   - gestione firmware;
   - API per frontend.

2. **Worker background**
   - ascolto MQTT;
   - salvataggio telemetria;
   - heartbeat dispositivi;
   - job schedulati;
   - notifiche interne;
   - gestione OTA;
   - automazioni future;
   - sincronizzazione stato dispositivi.

---

### 4.3 Database

- PostgreSQL
- TimescaleDB già teoricamente configurato su `pg-01`

Il database deve contenere sia dati relazionali sia serie temporali.

PostgreSQL gestirà:

- piante;
- zone;
- dispositivi;
- wiki;
- immagini;
- analisi AI;
- configurazioni;
- firmware;
- eventi;
- schedulazioni.

TimescaleDB gestirà:

- letture sensori;
- heartbeat dispositivi;
- metriche luce;
- eventi temporali;
- dati ambientali;
- storico automazioni future.

---

### 4.4 Cache e stato temporaneo

- Redis su `app-01`

Redis può essere usato per:

- cache dashboard;
- stato temporaneo;
- code leggere;
- job temporanei;
- rate limit futuri;
- gestione stato real-time;
- lock applicativi.

Per isolamento progettuale è consigliato usare un’istanza Redis dedicata a GrowLab, anche se eseguita sulla stessa VM `app-01`.

---

### 4.5 MQTT

Broker consigliato:

- EMQX come default;
- Mosquitto come alternativa lightweight.

EMQX è consigliato perché offre una dashboard utile per debug, gestione connessioni, topic e client IoT.

MQTT sarà il bus principale per comunicazione con ESP32.

---

### 4.6 AI locale

- Ollama
- modello vision consigliato: `qwen2.5vl:7b`
- fallback leggero: `qwen2.5vl:3b`
- fallback legacy: `llava:7b`

L’AI deve essere incapsulata in un servizio dedicato, in modo da poter cambiare modello senza modificare il resto dell’applicazione.

Servizio consigliato:

- Python FastAPI wrapper per Ollama.

---

### 4.7 Firmware ESP32

- PlatformIO
- Arduino framework
- firmware unico configurabile

Il firmware deve supportare:

- Wi-Fi;
- MQTT;
- configurazione remota;
- telemetria;
- heartbeat;
- OTA;
- moduli abilitabili/disabilitabili;
- gestione sensori;
- gestione attuatori futuri;
- identificativo univoco dispositivo.

---

### 4.8 Storage immagini

Le immagini devono essere salvate in un volume Docker dedicato.

Percorso consigliato su `app-01`:

```text
/srv/growlab/storage/images
```

Nel database devono essere salvati solo i metadata:

- id immagine;
- pianta associata;
- zona associata;
- path file;
- nome file;
- mime type;
- dimensione;
- timestamp upload;
- stato analisi AI;
- risultato analisi.

Le immagini non devono essere salvate direttamente in PostgreSQL.

---

## 5. Infrastruttura Proxmox

L’ambiente attuale prevede:

```text
Proxmox VE ultima versione

pg-01
└── PostgreSQL + TimescaleDB

app-01
└── Docker host
    ├── Redis già presente
    └── altri servizi Docker
```

Architettura consigliata per la prima versione:

```text
pg-01
└── PostgreSQL + TimescaleDB

app-01
└── Docker Compose
    ├── growlab-web
    ├── growlab-api
    ├── growlab-worker
    ├── growlab-ai
    ├── ollama
    ├── emqx
    ├── redis dedicato opzionale
    └── storage immagini
```

Questa struttura permette di partire in modo semplice mantenendo separazione logica tra servizi.

---

## 6. Struttura monorepo

Il progetto deve essere organizzato come monorepo.

Struttura consigliata:

```text
growlab/
├── apps/
│   ├── web/
│   ├── api/
│   ├── worker/
│   └── ai-service/
│
├── firmware/
│   └── esp32-growlab/
│
├── packages/
│   ├── contracts/
│   └── shared-docs/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── mqtt/
│   └── scripts/
│
├── database/
│   ├── migrations/
│   ├── seed/
│   └── diagrams/
│
├── docs/
│   ├── 00_PROJECT_GUIDELINES.md
│   ├── 01_ARCHITECTURE_OVERVIEW.md
│   ├── 02_INFRASTRUCTURE_PROXMOX.md
│   ├── 03_DATABASE_DESIGN.md
│   ├── 04_BACKEND_DOTNET.md
│   ├── 05_NEXTJS_WEB_APP.md
│   ├── 06_MQTT_DESIGN.md
│   ├── 07_ESP32_FIRMWARE.md
│   ├── 08_LIGHTING_SHELLY.md
│   ├── 09_IRRIGATION_MODULE.md
│   ├── 10_AI_IMAGE_ANALYSIS.md
│   ├── 11_PLANT_WIKI.md
│   ├── 12_OTA_UPDATE_SYSTEM.md
│   ├── 13_SECURITY_MODEL.md
│   ├── 14_DEPLOYMENT_GUIDE.md
│   ├── 15_ROADMAP.md
│   └── 16_OPEN_SOURCE_READINESS.md
│
├── prompts/
│   ├── CLAUDE_CODE_MASTER_PROMPT.md
│   ├── CODEX_MASTER_PROMPT.md
│   ├── NEXTJS_UI_PROMPT.md
│   ├── DOTNET_API_PROMPT.md
│   ├── ESP32_FIRMWARE_PROMPT.md
│   └── AI_SERVICE_PROMPT.md
│
├── README.md
└── LICENSE
```

---

## 7. Architettura logica

Schema ad alto livello:

```text
Telefono / PC
   │
   ▼
Next.js Web App
   │
   ▼
.NET 10 API
   ├── PostgreSQL / TimescaleDB
   ├── Redis
   ├── Docker volume immagini
   ├── Shelly Dimmer 2 API locale
   ├── AI Service / Ollama
   └── MQTT Broker
          │
          ▼
       ESP32
```

---

## 8. Moduli principali

### 8.1 Modulo piante

Responsabilità:

- creare piante;
- modificare piante;
- assegnare piante a zone;
- salvare note;
- gestire stato;
- visualizzare timeline;
- visualizzare immagini;
- collegare analisi AI;
- collegare eventi sensori.

---

### 8.2 Modulo zone

La zona è l’unità logica principale di gestione.

Una zona può contenere:

- una o più piante;
- sensori;
- grow light;
- configurazioni ambientali;
- eventi;
- profili luce;
- futuri sistemi di irrigazione.

Schema logico:

```text
Grow Area
└── Zone
    ├── Plants
    ├── Sensors
    ├── Devices
    ├── Lighting
    ├── Irrigation
    └── Events
```

---

### 8.3 Modulo sensori

Il modulo sensori gestisce:

- definizione sensori;
- associazione a dispositivo;
- associazione a zona;
- letture;
- storico;
- stato;
- unità di misura;
- calibrazione futura.

Esempi sensori futuri:

- umidità terreno;
- temperatura;
- umidità aria;
- luminosità;
- livello acqua;
- portata;
- pH;
- EC.

---

### 8.4 Modulo dispositivi IoT

Gestisce gli ESP32.

Funzioni:

- registrazione dispositivo;
- configurazione;
- assegnazione a zona;
- heartbeat;
- stato online/offline;
- versione firmware;
- moduli attivi;
- telemetria;
- OTA.

---

### 8.5 Modulo luci

Target iniziale:

- Shelly Dimmer 2;
- lampadina E27 grow dimmerabile.

Funzioni previste:

- ON/OFF;
- intensità percentuale;
- schedulazione;
- profili per zona;
- storico accensioni;
- storico intensità;
- override manuale;
- stato corrente.

Integrazione consigliata:

```text
.NET API / Worker
└── Shelly Dimmer 2 local HTTP API
```

---

### 8.6 Modulo irrigazione

Il modulo irrigazione è previsto architetturalmente ma disabilitato inizialmente.

Stato iniziale:

```json
{
  "irrigationManualControl": false,
  "irrigationAutomation": false
}
```

Funzioni future:

- pompa ON/OFF;
- durata massima;
- controllo manuale protetto;
- log eventi;
- soglie umidità;
- cooldown;
- finestre orarie;
- kill switch;
- blocco se mancano condizioni di sicurezza.

---

### 8.7 Modulo immagini

Permette upload da web app, soprattutto da smartphone.

Funzioni:

- upload immagine;
- associazione a pianta;
- associazione a zona;
- salvataggio su volume Docker;
- metadata nel database;
- stato analisi;
- visualizzazione gallery;
- confronto temporale futuro.

---

### 8.8 Modulo AI

L’AI analizza immagini caricate manualmente.

Pipeline:

```text
Upload immagine
   │
   ▼
Storage volume Docker
   │
   ▼
AI Service
   │
   ▼
Ollama / qwen2.5vl
   │
   ▼
Risultato JSON strutturato
   │
   ▼
Database
   │
   ▼
Timeline pianta
```

Output AI consigliato:

```json
{
  "healthStatus": "warning",
  "confidence": 0.72,
  "observations": [
    "Possibile ingiallimento su alcune foglie",
    "Substrato visivamente asciutto"
  ],
  "suggestions": [
    "Controllare umidità del substrato",
    "Verificare esposizione luminosa"
  ],
  "requiresUserConfirmation": true
}
```

---

### 8.9 Modulo wiki piante

La wiki deve contenere:

- famiglie;
- categorie;
- specie;
- cultivar;
- nomi comuni;
- esigenze luce;
- esigenze acqua;
- temperatura ideale;
- umidità ideale;
- substrato consigliato;
- note;
- problemi comuni;
- sintomi;
- suggerimenti.

La wiki deve essere collegabile alle piante reali presenti nel sistema.

---

### 8.10 Modulo OTA

Il modulo OTA deve permettere in futuro:

- upload firmware;
- gestione versioni;
- assegnazione firmware a device;
- avvio aggiornamento;
- stato aggiornamento;
- log;
- rollback logico;
- canali stable/beta/dev.

---

## 9. Feature flags

Le feature critiche devono essere controllate tramite feature flag.

Configurazione iniziale consigliata:

```json
{
  "features": {
    "auth": false,
    "irrigationManualControl": false,
    "irrigationAutomation": false,
    "aiSuggestions": true,
    "aiCanExecuteActions": false,
    "otaUpdates": true,
    "shellyLighting": true,
    "mqttDeviceProvisioning": true
  }
}
```

---

## 10. Roadmap

### Fase 1 — Foundation

- monorepo;
- Docker Compose;
- connessione PostgreSQL;
- connessione Redis;
- MQTT broker;
- Next.js app;
- .NET API;
- .NET Worker;
- modello dati iniziale.

---

### Fase 2 — Piante e zone

- CRUD zone;
- CRUD piante;
- associazione piante-zone;
- timeline pianta;
- note manuali;
- categorie/famiglie/specie.

---

### Fase 3 — IoT base

- firmware ESP32 unico;
- configurazione device;
- MQTT telemetry;
- heartbeat;
- storico sensori;
- dashboard real-time.

---

### Fase 4 — Grow light

- integrazione Shelly Dimmer 2;
- ON/OFF;
- dimmer;
- schedulazioni;
- profili luce per zona;
- storico eventi luce.

---

### Fase 5 — Foto e AI

- upload foto da telefono;
- salvataggio su volume Docker;
- analisi con Ollama;
- output JSON strutturato;
- timeline AI;
- confronto storico base.

---

### Fase 6 — OTA

- gestione versione firmware;
- upload firmware;
- assegnazione firmware a device;
- OTA update;
- log OTA.

---

### Fase 7 — Irrigazione safe mode

- modello dati irrigazione;
- feature disabilitata di default;
- controllo manuale protetto;
- limiti durata;
- log eventi;
- predisposizione automazioni future.

---

### Fase 8 — Open source readiness

- README completo;
- `.env.example`;
- Docker Compose pulito;
- documentazione setup;
- licenza;
- rimozione configurazioni personali.

---

## 11. Regole di sicurezza

### 11.1 Irrigazione

L’irrigazione deve essere safe-by-default.

Regole:

- automazione disabilitata inizialmente;
- controllo manuale disabilitato inizialmente;
- nessun comando pompa senza feature flag attivo;
- durata massima obbligatoria;
- logging obbligatorio;
- kill switch globale;
- blocco se device offline;
- blocco se configurazione incompleta.

---

### 11.2 AI

Regole:

- AI solo consultiva;
- nessuna azione automatica;
- output con confidence score;
- suggerimenti sempre da validare manualmente;
- diagnosi non definitive;
- storico analisi sempre tracciato.

---

### 11.3 Rete

Regole:

- accesso solo LAN/VPN;
- niente esposizione pubblica diretta;
- credenziali in environment variables;
- MQTT non anonimo in produzione;
- segregazione futura dei servizi se necessario.

---

## 12. Decisioni tecniche iniziali

| Area | Decisione |
|---|---|
| Nome progetto | GrowLab |
| Uso iniziale | Personale |
| Futuro open source | Sì, predisposto |
| Repo | Monorepo |
| Frontend | Next.js + shadcn/ui |
| Backend | .NET 10 API + Worker |
| Database | PostgreSQL + TimescaleDB |
| Database host | pg-01 |
| App host | app-01 |
| Runtime | Docker Compose |
| MQTT | EMQX consigliato |
| Cache | Redis |
| AI | Ollama |
| Modello AI default | qwen2.5vl:7b |
| Storage immagini | Docker volume dedicato |
| Auth | Disabilitata inizialmente |
| Accesso | LAN/VPN only |
| Firmware | ESP32 unico configurabile |
| Firmware framework | PlatformIO + Arduino |
| Luci | Shelly Dimmer 2 |
| Irrigazione | Predisposta ma disabilitata |
| Home Assistant | Non previsto inizialmente |

---

## 13. Prossimi documenti da produrre

Dopo questo documento principale, devono essere creati i seguenti file:

1. `01_ARCHITECTURE_OVERVIEW.md`
2. `02_INFRASTRUCTURE_PROXMOX.md`
3. `03_DATABASE_DESIGN.md`
4. `04_BACKEND_DOTNET.md`
5. `05_NEXTJS_WEB_APP.md`
6. `06_MQTT_DESIGN.md`
7. `07_ESP32_FIRMWARE.md`
8. `08_LIGHTING_SHELLY.md`
9. `09_IRRIGATION_MODULE.md`
10. `10_AI_IMAGE_ANALYSIS.md`
11. `11_PLANT_WIKI.md`
12. `12_OTA_UPDATE_SYSTEM.md`
13. `13_SECURITY_MODEL.md`
14. `14_DEPLOYMENT_GUIDE.md`
15. `15_ROADMAP.md`
16. `16_OPEN_SOURCE_READINESS.md`

---

## 14. Stato del documento

Questo documento definisce le linee guida principali del progetto GrowLab.

Non è ancora una specifica implementativa completa, ma rappresenta la base architetturale su cui costruire i documenti successivi e la futura implementazione.
