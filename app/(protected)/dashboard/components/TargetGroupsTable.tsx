"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

export function TargetGroupsTable({ targetGroups }: TargetGroupsTableProps) {
  if (targetGroups.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No target groups yet. Create your first target group to get started.
      </p>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Personas</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targetGroups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell>{group.persona_count}</TableCell>
              <TableCell>
                {new Date(group.created_at).toLocaleDateString("en-US", {
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
  );
}
