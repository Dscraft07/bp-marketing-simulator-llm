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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { createCampaign, deleteCampaign, updateCampaign } from "@/app/campaigns/actions";
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
  createDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
}

export function CampaignsTable({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  createDialogOpen,
  onCreateDialogOpenChange,
}: CampaignsTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [newCampaign, setNewCampaign] = useState({ name: "", content: "" });
  const [isCreating, setIsCreating] = useState(false);

  const handleDeleteClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setCampaignToEdit({ ...campaign });
    setEditDialogOpen(true);
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

  const handleConfirmEdit = async () => {
    if (!campaignToEdit) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.set("name", campaignToEdit.name);
      formData.set("content", campaignToEdit.content);

      const result = await updateCampaign(campaignToEdit.id, formData);

      if (result.success) {
        toast.success("Campaign updated successfully");
        setEditDialogOpen(false);
        setCampaignToEdit(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update campaign");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCreate = async () => {
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.set("name", newCampaign.name);
      formData.set("content", newCampaign.content);

      const result = await createCampaign(formData);

      if (result.success) {
        toast.success("Campaign created successfully");
        onCreateDialogOpenChange(false);
        setNewCampaign({ name: "", content: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create campaign");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {campaigns.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No campaigns yet. Create your first campaign to get started.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden relative min-w-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Name</TableHead>
                <TableHead className="w-[25%]">Content</TableHead>
                <TableHead className="w-[18%]">Created At</TableHead>
                <TableHead className="w-[22%]">Actions</TableHead>
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
                  <TableCell className="font-medium truncate">{campaign.name}</TableCell>
                  <TableCell className="truncate">{campaign.content}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(campaign.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => handleEditClick(campaign, e)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(campaign, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-campaign-name">Name</Label>
              <Input
                id="edit-campaign-name"
                value={campaignToEdit?.name ?? ""}
                onChange={(e) =>
                  setCampaignToEdit((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-campaign-content">Content</Label>
              <Textarea
                id="edit-campaign-content"
                rows={5}
                value={campaignToEdit?.content ?? ""}
                onChange={(e) =>
                  setCampaignToEdit((prev) =>
                    prev ? { ...prev, content: e.target.value } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEdit} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={onCreateDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-campaign-name">Name</Label>
              <Input
                id="new-campaign-name"
                placeholder="Campaign name"
                value={newCampaign.name}
                onChange={(e) =>
                  setNewCampaign((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-campaign-content">Content</Label>
              <Textarea
                id="new-campaign-content"
                rows={5}
                placeholder="Campaign content"
                value={newCampaign.content}
                onChange={(e) =>
                  setNewCampaign((prev) => ({ ...prev, content: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onCreateDialogOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
