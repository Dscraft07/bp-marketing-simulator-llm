"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteCampaign } from "@/app/campaigns/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteCampaign(campaignToDelete.id);

      if (result.success) {
        toast.success("Campaign deleted successfully");
        setDeleteDialogOpen(false);
        setCampaignToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

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
              <TableHead className="w-[80px]">Actions</TableHead>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(campaign, e)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign &quot;{campaignToDelete?.name}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
