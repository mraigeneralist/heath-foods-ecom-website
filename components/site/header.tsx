import Link from "next/link";
import { User2, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/check";
import { CartButton } from "@/components/site/cart-button";
import { AccountMenu } from "@/components/site/account-menu";
import { STORE_NAME } from "@/lib/constants";

const NAV = [
  { href: "/products", label: "Shop all" },
  { href: "/categories/snacks", label: "Snacks" },
  { href: "/categories/beverages", label: "Beverages" },
  { href: "/categories/superfoods", label: "Superfoods" },
];

export async function SiteHeader() {
  let user: { id: string; email?: string } | null = null;
  let displayName: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
      if (authUser) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", authUser.id)
          .maybeSingle();
        displayName = data?.full_name ?? null;
      }
    } catch {
      // Misconfigured Supabase URL — render the header without auth state.
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-prose flex h-16 items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-sage-deep text-cream">
            <Leaf className="h-4 w-4" strokeWidth={2.5} />
          </span>
          {STORE_NAME}
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-foreground/75 transition-colors hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <CartButton />
          {user ? (
            <AccountMenu
              email={user.email ?? ""}
              displayName={displayName}
            />
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-sand transition-colors"
            >
              <User2 className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
