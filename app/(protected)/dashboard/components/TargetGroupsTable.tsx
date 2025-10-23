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
  selectedTargetGroupId: string | null;
  onSelectTargetGroup: (targetGroupId: string) => void;
}

export function TargetGroupsTable({
  targetGroups,
  selectedTargetGroupId,
  onSelectTargetGroup,
}: TargetGroupsTableProps) {
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
