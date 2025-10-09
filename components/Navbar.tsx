import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function Navbar() {
  return (
    <nav className="w-full border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center h-full px-5">
        <Link href="/dashboard" className="font-semibold text-lg">
          Marketing Simulator
        </Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
