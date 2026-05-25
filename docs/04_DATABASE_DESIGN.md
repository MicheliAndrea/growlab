# 04 — Database Design

## Obiettivo

Definire il modello dati iniziale di GrowLab.

Database target:

- PostgreSQL;
- TimescaleDB per serie temporali.

## Linee guida

- Usare UUID come primary key.
- Usare timestamp UTC.
- Usare soft delete solo dove serve.
- Separare dati relazionali da misurazioni temporali.
- Ogni evento importante deve essere tracciato.
- Evitare immagini binarie nel database.

## Tabelle principali

### grow_areas

Rappresenta una macro area, stanza, growbox o scaffale.

Campi:

- id;
- name;
- description;
- created_at;
- updated_at.

### zones

Unità logica principale.

Campi:

- id;
- grow_area_id;
- name;
- description;
- position;
- target_temperature_min;
- target_temperature_max;
- target_humidity_min;
- target_humidity_max;
- created_at;
- updated_at.

### plants

Rappresenta una pianta reale.

Campi:

- id;
- zone_id;
- species_id;
- nickname;
- acquired_at;
- planted_at;
- status;
- notes;
- created_at;
- updated_at.

### plant_families

- id;
- name;
- description.

### plant_categories

- id;
- name;
- description.

### plant_species

- id;
- family_id;
- category_id;
- scientific_name;
- common_name;
- description;
- light_requirements;
- water_requirements;
- humidity_requirements;
- temperature_requirements;
- substrate_notes;
- common_issues.

### plant_events

Timeline universale della pianta.

Campi:

- id;
- plant_id;
- zone_id;
- event_type;
- title;
- description;
- metadata_json;
- occurred_at;
- created_at.

Tipi evento:

- note;
- image_uploaded;
- ai_analysis_completed;
- irrigation;
- lighting_change;
- sensor_alert;
- repotting;
- pruning;
- treatment;
- firmware_event;
- manual_observation.

### plant_images

- id;
- plant_id;
- zone_id;
- file_path;
- file_name;
- mime_type;
- file_size;
- width;
- height;
- uploaded_at;
- analysis_status.

### plant_ai_analyses

- id;
- image_id;
- plant_id;
- model_name;
- prompt_version;
- health_status;
- confidence;
- observations_json;
- suggestions_json;
- raw_response_json;
- created_at.

### devices

- id;
- device_uid;
- name;
- device_type;
- zone_id;
- firmware_version;
- config_version;
- status;
- last_seen_at;
- created_at;
- updated_at.

### device_modules

- id;
- device_id;
- module_type;
- enabled;
- config_json.

Module types:

- soil_moisture;
- temperature_humidity;
- light_sensor;
- relay;
- water_level;
- pump_control;
- ota;
- debug.

### sensors

- id;
- device_id;
- zone_id;
- sensor_type;
- name;
- unit;
- calibration_json;
- enabled.

### sensor_readings

Timescale hypertable.

- time;
- sensor_id;
- device_id;
- zone_id;
- value;
- unit;
- metadata_json.

### device_heartbeats

Timescale hypertable.

- time;
- device_id;
- wifi_rssi;
- free_heap;
- uptime_seconds;
- firmware_version;
- ip_address;
- status.

### lighting_systems

- id;
- zone_id;
- name;
- provider;
- device_host;
- device_type;
- enabled;
- config_json.

Provider iniziale:

- shelly_dimmer_2.

### lighting_events

- id;
- lighting_system_id;
- zone_id;
- event_type;
- brightness;
- is_on;
- source;
- occurred_at;
- metadata_json.

### lighting_schedules

- id;
- lighting_system_id;
- zone_id;
- name;
- enabled;
- start_time;
- end_time;
- brightness;
- fade_in_minutes;
- fade_out_minutes;
- days_of_week_json.

### firmware_versions

- id;
- version;
- channel;
- file_path;
- checksum;
- target_device_type;
- created_at.

### ota_jobs

- id;
- device_id;
- firmware_version_id;
- status;
- requested_at;
- started_at;
- completed_at;
- error_message.

### irrigation_systems

Modulo predisposto, disabilitato inizialmente.

- id;
- zone_id;
- name;
- device_id;
- enabled;
- manual_control_enabled;
- automation_enabled;
- max_runtime_seconds;
- cooldown_minutes;
- config_json.

### irrigation_events

- id;
- irrigation_system_id;
- zone_id;
- event_type;
- duration_seconds;
- source;
- occurred_at;
- metadata_json.

### system_settings

- id;
- key;
- value_json;
- updated_at.

## TimescaleDB

Codex deve generare migrazioni per creare hypertable almeno per:

- sensor_readings;
- device_heartbeats.

Esempio concettuale:

```sql
SELECT create_hypertable('sensor_readings', 'time');
SELECT create_hypertable('device_heartbeats', 'time');
```

## Indici minimi

- `plants.zone_id`
- `plant_events.plant_id, occurred_at`
- `sensor_readings.sensor_id, time DESC`
- `sensor_readings.zone_id, time DESC`
- `device_heartbeats.device_id, time DESC`
- `devices.device_uid`
- `plant_images.plant_id, uploaded_at DESC`
