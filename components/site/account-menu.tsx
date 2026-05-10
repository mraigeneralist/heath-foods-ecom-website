"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Package, ShieldCheck, User2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-store";

type Props = {
  role: "customer" | "admin" | null;
  email: string;
  displayName: string | null;
};

export function AccountMenu({ role, email, displayName }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const clearCart = useCart((s) => s.clear);

  function signOut() {
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      clearCart();
      router.refresh();
      router.push("/");
    });
  }

  const initials = (displayName || email)
    .split(/[ @]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full bg-sand text-sm font-semibold text-ink hover:bg-sand/80 transition-colors"
      >
        {initials || <User2 className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-sm font-medium">{displayName || "Account"}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/account")}>
          <User2 className="mr-2 h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/account/orders")}>
          <Package className="mr-2 h-4 w-4" /> Orders
        </DropdownMenuItem>
        {role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Admin
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={pending}>
          <LogOut className="mr-2 h-4 w-4" />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
