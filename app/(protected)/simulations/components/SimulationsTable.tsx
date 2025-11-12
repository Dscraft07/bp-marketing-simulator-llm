"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

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
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/simulations/${simulation.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
