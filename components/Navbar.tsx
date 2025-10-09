import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function Navbar() {
  return (
    <nav className="w-full border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center h-full px-5">
        <div className="flex gap-8 items-center">
          <Link href="/dashboard" className="font-semibold text-lg">
            Marketing Simulator
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/dashboard"
              className="text-sm hover:text-foreground/80 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/campaigns"
              className="text-sm hover:text-foreground/80 transition-colors"
            >
              Campaigns
            </Link>
          </div>
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}
