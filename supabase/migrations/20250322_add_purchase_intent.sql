-- Add purchase_intent score to simulation_results
ALTER TABLE simulation_results
ADD COLUMN purchase_intent float NULL;

COMMENT ON COLUMN simulation_results.purchase_intent IS 'Purchase intent score (0-1), evaluated by independent LLM call';
