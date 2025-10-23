"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Campaign {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  onSelectCampaign: (campaignId: string) => void;
}

export function CampaignsTable({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
}: CampaignsTableProps) {
  if (campaigns.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No campaigns yet. Create your first campaign to get started.
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="min-w-0">Content</TableHead>
              <TableHead className="w-[120px]">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow
                key={campaign.id}
                className={`cursor-pointer transition-all ${
                  selectedCampaignId === campaign.id
                    ? "bg-primary/10 hover:bg-primary/15"
                    : "hover:bg-muted/50"
                }`}
                style={
                  selectedCampaignId === campaign.id
                    ? { boxShadow: "inset 4px 0 0 0 hsl(var(--primary))" }
                    : undefined
                }
                onClick={() => onSelectCampaign(campaign.id)}
              >
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="truncate max-w-0">
                  {campaign.content}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(campaign.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
