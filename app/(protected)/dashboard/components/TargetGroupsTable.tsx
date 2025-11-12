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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Trash2 } from "lucide-react";
import { deleteTargetGroup } from "@/app/target-groups/actions";
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
}

export function TargetGroupsTable({
  targetGroups,
  selectedTargetGroupId,
  onSelectTargetGroup,
}: TargetGroupsTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<TargetGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (group: TargetGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
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
    } catch (error) {
      console.error("Error deleting target group:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (targetGroups.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No target groups yet. Create your first target group to get started.
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Name</TableHead>
              <TableHead className="min-w-0">Description</TableHead>
              <TableHead className="w-[100px]">Personas</TableHead>
              <TableHead className="w-[120px]">Created At</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
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
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell className="truncate max-w-0">
                  {group.description}
                </TableCell>
                <TableCell>{group.persona_count}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(group.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => handleDeleteClick(group, e)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
    </div>
  );
}
