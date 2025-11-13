"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteSimulation } from "@/app/simulations/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Simulation {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  finished_at: string | null;
  campaign_snapshot: {
    name: string;
    content: string;
  };
  target_group_snapshot: {
    name: string;
    description: string;
    persona_count: number;
  };
}

interface SimulationsTableProps {
  simulations: Simulation[];
}

function getStatusBadge(status: Simulation["status"]) {
  const variants: Record<
    Simulation["status"],
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    running: { variant: "default", label: "Running" },
    completed: { variant: "outline", label: "Completed" },
    failed: { variant: "destructive", label: "Failed" },
  };

  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function SimulationsTable({ simulations }: SimulationsTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [simulationToDelete, setSimulationToDelete] = useState<Simulation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (simulation: Simulation, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSimulationToDelete(simulation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!simulationToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteSimulation(simulationToDelete.id);

      if (result.success) {
        toast.success("Simulation deleted successfully");
        setDeleteDialogOpen(false);
        setSimulationToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete simulation");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (simulations.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          No simulations yet. Create your first simulation from the dashboard.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Campaign</TableHead>
              <TableHead className="w-[200px]">Target Group</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[150px]">Created</TableHead>
              <TableHead className="w-[150px]">Finished</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {simulations.map((simulation) => {
              const createdDate = new Date(simulation.created_at).toLocaleString(
                "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );

              const finishedDate = simulation.finished_at
                ? new Date(simulation.finished_at).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <TableRow key={simulation.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {simulation.campaign_snapshot.name}
                  </TableCell>
                  <TableCell>
                    {simulation.target_group_snapshot.name}
                  </TableCell>
                  <TableCell>{getStatusBadge(simulation.status)}</TableCell>
                  <TableCell className="text-sm">{createdDate}</TableCell>
                  <TableCell className="text-sm">
                    {finishedDate || "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/simulations/${simulation.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => handleDeleteClick(simulation, e)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the simulation for campaign &quot;
              {simulationToDelete?.campaign_snapshot.name}&quot;. This action
              cannot be undone and will also delete all results.
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
