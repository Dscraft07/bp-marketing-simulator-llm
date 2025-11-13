"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { User, LogOut, LayoutDashboard, History } from "lucide-react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const router = useRouter();

  return (
    <nav className="w-full border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center h-full px-3 sm:px-5">
        <Link href="/dashboard" className="font-semibold text-base sm:text-lg">
          Marketing Simulator
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-1.5"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/simulations")}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Simulations</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/profile")}
            className="gap-1.5"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </Button>
          <div className="flex items-center">
            <LogOut className="h-4 w-4 mr-1.5" />
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
