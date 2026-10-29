-- Safe migration: Fix risks probability/impact scale from 0-100 to 1-5
--
-- Strategy:
--   1. Preserve legacy 0-100 values in legacy_probability / legacy_impact columns
--   2. Convert existing values using documented formula (see below)
--   3. Update risk_score to reflect new 1-5 scale
--   4. Replace CHECK constraints with 1-5 constraints
--   5. Update calculate_project_health() critical threshold for 1-25 scale
--
-- Conversion formula (deterministic, documented):
--   new_value = GREATEST(1, LEAST(5, CEIL(legacy_value / 20.0)))
--
--   Mapping:
--     0-19   → 1 (Low)
--     20-39  → 2 (Low-Medium)
--     40-59  → 3 (Medium)
--     60-79  → 4 (Medium-High)
--     80-100 → 5 (High/Critical)
--
--   This is a linear scale mapping where each new integer covers a 20-point range.
--
-- Idempotency: If probability/impact already in 1-5 range, values are preserved as-is.

-- Step 1: Add legacy columns to preserve original 0-100 values (idempotent)
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS legacy_probability INT,
  ADD COLUMN IF NOT EXISTS legacy_impact INT;

-- Step 2: Save legacy values before conversion (only if not already saved)
UPDATE risks
SET legacy_probability = CASE WHEN legacy_probability IS NULL THEN probability ELSE legacy_probability END,
    legacy_impact = CASE WHEN legacy_impact IS NULL THEN impact ELSE legacy_impact END;

-- Step 3: Convert probability and impact to 1-5 scale using documented formula
-- Uses idempotent check: if value is already 1-5, keep it; otherwise convert from 0-100
ALTER TABLE risks
  ALTER COLUMN probability TYPE INT USING CASE
    WHEN probability BETWEEN 1 AND 5 THEN probability
    ELSE GREATEST(1, LEAST(5, CEIL(probability / 20.0)))
  END,
  ALTER COLUMN probability SET NOT NULL,
  ALTER COLUMN impact TYPE INT USING CASE
    WHEN impact BETWEEN 1 AND 5 THEN impact
    ELSE GREATEST(1, LEAST(5, CEIL(impact / 20.0)))
  END,
  ALTER COLUMN impact SET NOT NULL;

-- Step 4: Update risk_score based on new 1-5 scale (risk_score = probability * impact, max 25)
UPDATE risks
SET risk_score = probability * impact;

-- Step 5: Drop old 0-100 CHECK constraints and add 1-5 CHECK constraints
ALTER TABLE risks
  DROP CONSTRAINT IF EXISTS risks_probability_check,
  DROP CONSTRAINT IF EXISTS risks_impact_check;

ALTER TABLE risks
  ADD CONSTRAINT risks_probability_check CHECK (probability >= 1 AND probability <= 5),
  ADD CONSTRAINT risks_impact_check CHECK (impact >= 1 AND impact <= 5);

-- Step 6: Update calculate_project_health() critical threshold for 1-25 scale
-- Critical: 17-25, High: 10-16, Medium: 5-9, Low: 1-4
CREATE OR REPLACE FUNCTION calculate_project_health()
RETURNS TRIGGER AS $$
DECLARE
  v_overdue INT;
  v_critical_risks INT;
  v_critical_issues INT;
BEGIN
  SELECT COUNT(*) INTO v_overdue
  FROM workplan_items
  WHERE workplan_id IN (SELECT id FROM workplans WHERE project_id = NEW.id)
  AND status NOT IN ('completed','closed')
  AND end_date < CURRENT_DATE;

  SELECT COUNT(*) INTO v_critical_risks
  FROM risks
  WHERE project_id = NEW.id
  AND risk_score >= 17
  AND status NOT IN ('closed','mitigated');

  SELECT COUNT(*) INTO v_critical_issues
  FROM issues
  WHERE project_id = NEW.id
  AND severity = 'critical'
  AND status NOT IN ('closed','resolved');

  IF v_overdue > 5 OR v_critical_risks > 2 OR v_critical_issues > 0 THEN
    NEW.health = 'red';
  ELSIF v_overdue > 0 OR v_critical_risks > 0 THEN
    NEW.health = 'amber';
  ELSE
    NEW.health = 'green';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
