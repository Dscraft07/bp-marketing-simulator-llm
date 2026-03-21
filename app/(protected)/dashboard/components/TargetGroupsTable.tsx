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
import { createTargetGroup, deleteTargetGroup, updateTargetGroup } from "@/app/target-groups/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TargetGroup {
  id: string;
  name: string;
  description: string;
  persona_count: number;
  user_id: string;
  created_at: string;
}

interface TargetGroupsTableProps {
  targetGroups: TargetGroup[];
  selectedTargetGroupId: string | null;
  onSelectTargetGroup: (targetGroupId: string) => void;
  createDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
}

export function TargetGroupsTable({
  targetGroups,
  selectedTargetGroupId,
  onSelectTargetGroup,
  createDialogOpen,
  onCreateDialogOpenChange,
}: TargetGroupsTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<TargetGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<TargetGroup | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [newGroup, setNewGroup] = useState({ name: "", description: "", persona_count: 5 });
  const [isCreating, setIsCreating] = useState(false);

  const handleDeleteClick = (group: TargetGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (group: TargetGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToEdit({ ...group });
    setEditDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteTargetGroup(groupToDelete.id);

      if (result.success) {
        toast.success("Target group deleted successfully");
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete target group");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmEdit = async () => {
    if (!groupToEdit) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.set("name", groupToEdit.name);
      formData.set("description", groupToEdit.description);
      formData.set("persona_count", String(groupToEdit.persona_count));

      const result = await updateTargetGroup(groupToEdit.id, formData);

      if (result.success) {
        toast.success("Target group updated successfully");
        setEditDialogOpen(false);
        setGroupToEdit(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update target group");
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
      formData.set("name", newGroup.name);
      formData.set("description", newGroup.description);
      formData.set("persona_count", String(newGroup.persona_count));

      const result = await createTargetGroup(formData);

      if (result.success) {
        toast.success("Target group created successfully");
        onCreateDialogOpenChange(false);
        setNewGroup({ name: "", description: "", persona_count: 5 });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create target group");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {targetGroups.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No target groups yet. Create your first target group to get started.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden relative min-w-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="w-[22%]">Description</TableHead>
                <TableHead className="w-[8%]">Personas</TableHead>
                <TableHead className="w-[18%]">Created At</TableHead>
                <TableHead className="w-[22%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targetGroups.map((group) => (
                <TableRow
                  key={group.id}
                  className={`cursor-pointer transition-all ${
                    selectedTargetGroupId === group.id
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-muted/50"
                  }`}
                  style={
                    selectedTargetGroupId === group.id
                      ? { boxShadow: "inset 4px 0 0 0 hsl(var(--primary))" }
                      : undefined
                  }
                  onClick={() => onSelectTargetGroup(group.id)}
                >
                  <TableCell className="font-medium truncate">{group.name}</TableCell>
                  <TableCell className="truncate">{group.description}</TableCell>
                  <TableCell>{group.persona_count}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(group.created_at).toLocaleDateString("en-US", {
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
                        onClick={(e) => handleEditClick(group, e)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(group, e)}
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
              This will permanently delete the target group &quot;{groupToDelete?.name}&quot;.
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
            <DialogTitle>Edit Target Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Name</Label>
              <Input
                id="edit-group-name"
                value={groupToEdit?.name ?? ""}
                onChange={(e) =>
                  setGroupToEdit((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group-description">Description</Label>
              <Textarea
                id="edit-group-description"
                rows={5}
                value={groupToEdit?.description ?? ""}
                onChange={(e) =>
                  setGroupToEdit((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group-persona-count">Persona Count</Label>
              <Input
                id="edit-group-persona-count"
                type="number"
                min={1}
                max={100}
                value={groupToEdit?.persona_count ?? 5}
                onChange={(e) =>
                  setGroupToEdit((prev) =>
                    prev ? { ...prev, persona_count: Number(e.target.value) } : null
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
            <DialogTitle>New Target Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-group-name">Name</Label>
              <Input
                id="new-group-name"
                placeholder="Target group name"
                value={newGroup.name}
                onChange={(e) =>
                  setNewGroup((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-group-description">Description</Label>
              <Textarea
                id="new-group-description"
                rows={5}
                placeholder="Target group description"
                value={newGroup.description}
                onChange={(e) =>
                  setNewGroup((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-group-persona-count">Persona Count</Label>
              <Input
                id="new-group-persona-count"
                type="number"
                min={1}
                max={100}
                value={newGroup.persona_count}
                onChange={(e) =>
                  setNewGroup((prev) => ({ ...prev, persona_count: Number(e.target.value) }))
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
