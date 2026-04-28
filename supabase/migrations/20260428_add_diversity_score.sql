-- Add diversity_score to simulation_results
ALTER TABLE simulation_results
ADD COLUMN diversity_score float NULL;

COMMENT ON COLUMN simulation_results.diversity_score IS 'Diversity score (0-1), evaluated by independent LLM call — how distinctive this reaction is compared to the other reactions in the same simulation';
