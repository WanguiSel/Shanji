-- Fix risks probability/impact scale from 0-100 to 1-5

ALTER TABLE risks
  ALTER COLUMN probability TYPE INT USING CASE WHEN probability BETWEEN 1 AND 5 THEN probability ELSE 5 END,
  ALTER COLUMN probability SET NOT NULL,
  ALTER COLUMN impact TYPE INT USING CASE WHEN impact BETWEEN 1 AND 5 THEN impact ELSE 5 END,
  ALTER COLUMN impact SET NOT NULL;

ALTER TABLE risks
  DROP CONSTRAINT IF EXISTS risks_probability_check,
  DROP CONSTRAINT IF EXISTS risks_impact_check;

ALTER TABLE risks
  ADD CONSTRAINT risks_probability_check CHECK (probability >= 1 AND probability <= 5),
  ADD CONSTRAINT risks_impact_check CHECK (impact >= 1 AND impact <= 5);

-- Update calculate_project_health risk threshold for 1-25 scale
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
