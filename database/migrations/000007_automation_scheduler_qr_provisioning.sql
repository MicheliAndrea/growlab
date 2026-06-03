-- +goose Up
ALTER TABLE automation_rules
  ADD COLUMN trigger_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN schedule_interval_seconds integer,
  ADD COLUMN scheduler_commit boolean NOT NULL DEFAULT false,
  ADD COLUMN cooldown_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN next_run_at timestamptz,
  ADD COLUMN last_scheduler_run_at timestamptz,
  ADD COLUMN scheduler_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN scheduler_error text;

ALTER TABLE automation_rules
  ADD CONSTRAINT automation_rules_trigger_mode_check CHECK (trigger_mode IN ('manual', 'scheduled')),
  ADD CONSTRAINT automation_rules_schedule_interval_seconds_check CHECK (schedule_interval_seconds IS NULL OR schedule_interval_seconds BETWEEN 30 AND 86400),
  ADD CONSTRAINT automation_rules_cooldown_seconds_check CHECK (cooldown_seconds BETWEEN 0 AND 604800),
  ADD CONSTRAINT automation_rules_scheduler_status_check CHECK (scheduler_status IN ('idle', 'due', 'running', 'matched', 'not_matched', 'failed'));

CREATE INDEX automation_rules_scheduler_due_idx
  ON automation_rules (enabled, trigger_mode, next_run_at)
  WHERE enabled = true AND trigger_mode = 'scheduled';

ALTER TABLE device_provisioning_configs
  ADD COLUMN claim_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN last_claim_attempt_at timestamptz,
  ADD COLUMN claimed_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX device_provisioning_configs_token_status_idx
  ON device_provisioning_configs (token_hash, status, expires_at);

-- +goose Down
DROP INDEX IF EXISTS device_provisioning_configs_token_status_idx;

ALTER TABLE device_provisioning_configs
  DROP COLUMN IF EXISTS claimed_metadata,
  DROP COLUMN IF EXISTS last_claim_attempt_at,
  DROP COLUMN IF EXISTS claim_attempts;

DROP INDEX IF EXISTS automation_rules_scheduler_due_idx;

ALTER TABLE automation_rules
  DROP CONSTRAINT IF EXISTS automation_rules_scheduler_status_check,
  DROP CONSTRAINT IF EXISTS automation_rules_cooldown_seconds_check,
  DROP CONSTRAINT IF EXISTS automation_rules_schedule_interval_seconds_check,
  DROP CONSTRAINT IF EXISTS automation_rules_trigger_mode_check;

ALTER TABLE automation_rules
  DROP COLUMN IF EXISTS scheduler_error,
  DROP COLUMN IF EXISTS scheduler_status,
  DROP COLUMN IF EXISTS last_scheduler_run_at,
  DROP COLUMN IF EXISTS next_run_at,
  DROP COLUMN IF EXISTS cooldown_seconds,
  DROP COLUMN IF EXISTS scheduler_commit,
  DROP COLUMN IF EXISTS schedule_interval_seconds,
  DROP COLUMN IF EXISTS trigger_mode;
