-- Update foreign key constraints for simulations table
-- to allow deletion of campaigns and target groups without deleting simulations
-- (simulations preserve data via snapshots)

-- First, we need to drop the existing foreign key constraints
ALTER TABLE simulations
DROP CONSTRAINT IF EXISTS simulations_campaign_id_fkey;

ALTER TABLE simulations
DROP CONSTRAINT IF EXISTS simulations_target_group_id_fkey;

-- Make the columns nullable (if they aren't already)
ALTER TABLE simulations
ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE simulations
ALTER COLUMN target_group_id DROP NOT NULL;

-- Recreate the foreign key constraints with ON DELETE SET NULL
ALTER TABLE simulations
ADD CONSTRAINT simulations_campaign_id_fkey
FOREIGN KEY (campaign_id)
REFERENCES campaigns(id)
ON DELETE SET NULL;

ALTER TABLE simulations
ADD CONSTRAINT simulations_target_group_id_fkey
FOREIGN KEY (target_group_id)
REFERENCES target_groups(id)
ON DELETE SET NULL;
