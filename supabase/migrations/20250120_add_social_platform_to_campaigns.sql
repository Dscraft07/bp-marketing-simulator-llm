-- Add social_platform column to campaigns table
ALTER TABLE campaigns
ADD COLUMN social_platform text NOT NULL DEFAULT 'twitter';

-- Add check constraint for valid platforms
ALTER TABLE campaigns
ADD CONSTRAINT campaigns_social_platform_check
CHECK (social_platform IN ('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'));

-- Add comment explaining the column
COMMENT ON COLUMN campaigns.social_platform IS 'Social media platform where the campaign will be published';
