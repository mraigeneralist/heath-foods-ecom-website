import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, User2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/check";

const NAV = [
  { href: "/account", label: "Profile", icon: User2 },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
];

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) redirect("/?setup=needed");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="container-prose py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Your account
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
          {user.email}
        </h1>
      </header>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sand"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </Link>
          ))}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
