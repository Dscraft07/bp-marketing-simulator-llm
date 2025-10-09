import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl font-bold tracking-tight">
          Marketing Campaign Simulator
        </h1>
        <p className="text-xl text-muted-foreground">
          Predict and analyze reactions to your marketing campaigns using AI-powered simulations
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/sign-up">Sign Up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
