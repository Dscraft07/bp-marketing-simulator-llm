import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto py-16">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Simulation Not Found</h1>
        <p className="text-muted-foreground">
          The simulation you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
