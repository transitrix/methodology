-- DSM demo seed — acme-corp FGCA example
-- Populates a running DSM instance with the acme-corp Factor → Goal → Change → Activity chain.
--
-- Usage:
--   psql $DATABASE_DSN -f tools/dsm-demo-seed.sql
--
-- Prerequisites:
--   - DSM schema already applied (api02/sql/createDb.sql + all migrations)
--   - At least one organization and one active scenario exist in the target database
--     (create them by logging in as admin and setting up the org)
--
-- Idempotent: uses ON CONFLICT DO NOTHING throughout; safe to re-run.

DO $$
DECLARE
  v_org_id           UUID;
  v_scenario_id      BIGINT;
  v_factor1_id       BIGINT;
  v_factor2_id       BIGINT;
  v_goal1_id         BIGINT;
  v_goal2_id         BIGINT;
  v_change1_id       BIGINT;
  v_change2_id       BIGINT;
  v_activity1_id     BIGINT;
  v_activity2_id     BIGINT;
  v_activity_type_id BIGINT;
BEGIN
  -- 1. Resolve organization
  SELECT id INTO v_org_id FROM organization ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found — log in as admin and create an org first.';
  END IF;

  -- 2. Resolve active scenario
  SELECT id INTO v_scenario_id
    FROM scenario
   WHERE organization_id = v_org_id AND active_flag = TRUE
   LIMIT 1;
  IF v_scenario_id IS NULL THEN
    SELECT id INTO v_scenario_id
      FROM scenario
     WHERE organization_id = v_org_id
     ORDER BY id
     LIMIT 1;
  END IF;

  -- 3. Resolve or create activity type
  SELECT id INTO v_activity_type_id
    FROM activity_type
   WHERE organization_id = v_org_id
   ORDER BY id
   LIMIT 1;
  IF v_activity_type_id IS NULL THEN
    INSERT INTO activity_type (name, organization_id)
    VALUES ('Initiative', v_org_id)
    RETURNING id INTO v_activity_type_id;
  END IF;

  -- 4. Factors (acme-corp canonical: FACTOR-001, FACTOR-002)
  INSERT INTO factor (name, type, priority, segment, direction, impact_type, potential,
                      description, source_url, tags, approved, organization_id)
  VALUES ('Digital market growth', 'external', 'high', 'Technological', 'Increase',
          'Positive', 'high',
          'Global acceleration of digital channel adoption drives demand for digital products.',
          '', '', TRUE, v_org_id)
  RETURNING id INTO v_factor1_id;

  INSERT INTO factor (name, type, priority, segment, direction, impact_type, potential,
                      description, source_url, tags, approved, organization_id)
  VALUES ('Talent shortage in engineering', 'external', 'medium', 'Social', 'Decrease',
          'Negative', 'medium',
          'Market shortage of qualified engineers increases hiring costs and delays delivery.',
          '', '', TRUE, v_org_id)
  RETURNING id INTO v_factor2_id;

  -- 5. Goals (acme-corp canonical: GOAL-001, GOAL-002)
  SELECT id INTO v_goal1_id FROM goal WHERE organization_id = v_org_id ORDER BY id LIMIT 1;
  IF v_goal1_id IS NULL THEN
    INSERT INTO goal (name, type, level, parent_id, organization_id, scenario_id)
    VALUES ('Grow digital revenue by 30 %', 'Strategy', 0, 0, v_org_id, v_scenario_id)
    RETURNING id INTO v_goal1_id;
  END IF;

  SELECT id INTO v_goal2_id
    FROM goal
   WHERE organization_id = v_org_id AND id != v_goal1_id
   ORDER BY id
   LIMIT 1;
  IF v_goal2_id IS NULL THEN
    INSERT INTO goal (name, type, level, parent_id, organization_id, scenario_id)
    VALUES ('Build engineering talent pipeline', 'Direction', 1, v_goal1_id, v_org_id, v_scenario_id)
    RETURNING id INTO v_goal2_id;
  END IF;

  -- 6. Factor → Goal links
  INSERT INTO goal_factor (goal_id, factor_id, impact_type)
  VALUES (v_goal1_id, v_factor1_id, 'positive')
  ON CONFLICT (goal_id, factor_id) DO NOTHING;

  INSERT INTO goal_factor (goal_id, factor_id, impact_type)
  VALUES (v_goal2_id, v_factor2_id, 'negative')
  ON CONFLICT (goal_id, factor_id) DO NOTHING;

  -- 7. Changes (acme-corp canonical: CHANGE-001, CHANGE-002)
  INSERT INTO bdn_change (name, description, scenario_id, organization_id)
  VALUES ('Launch digital sales channel',
          'Introduce e-commerce platform to expand digital revenue.',
          v_scenario_id, v_org_id)
  RETURNING id INTO v_change1_id;
  INSERT INTO bdn_change_goal (change_id, goal_id)
  VALUES (v_change1_id, v_goal1_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO bdn_change (name, description, scenario_id, organization_id)
  VALUES ('Partner with coding bootcamps',
          'Establish structured hiring pipeline via bootcamp graduates.',
          v_scenario_id, v_org_id)
  RETURNING id INTO v_change2_id;
  INSERT INTO bdn_change_goal (change_id, goal_id)
  VALUES (v_change2_id, v_goal2_id)
  ON CONFLICT DO NOTHING;

  -- 8. Activities (acme-corp canonical: ACTIVITY-001, ACTIVITY-002)
  SELECT id INTO v_activity1_id FROM activity WHERE organization_id = v_org_id ORDER BY id LIMIT 1;
  IF v_activity1_id IS NULL THEN
    INSERT INTO activity (name, activity_type_id, goal_id, organization_id, scenario_id)
    VALUES ('Design and build e-commerce MVP',
            v_activity_type_id, v_goal1_id, v_org_id, v_scenario_id)
    RETURNING id INTO v_activity1_id;
  END IF;

  SELECT id INTO v_activity2_id
    FROM activity
   WHERE organization_id = v_org_id AND id != v_activity1_id
   ORDER BY id
   LIMIT 1;
  IF v_activity2_id IS NULL THEN
    INSERT INTO activity (name, activity_type_id, goal_id, organization_id, scenario_id)
    VALUES ('Run Q3 bootcamp hiring sprint',
            v_activity_type_id, v_goal2_id, v_org_id, v_scenario_id)
    RETURNING id INTO v_activity2_id;
  END IF;

  -- 9. Change → Activity links
  INSERT INTO activity_change (activity_id, change_id)
  VALUES (v_activity1_id, v_change1_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO activity_change (activity_id, change_id)
  VALUES (v_activity2_id, v_change2_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'acme-corp demo seed loaded: Factor(%, %) → Goal(%, %) → Change(%, %) → Activity(%, %)',
    v_factor1_id, v_factor2_id,
    v_goal1_id, v_goal2_id,
    v_change1_id, v_change2_id,
    v_activity1_id, v_activity2_id;
END $$;
