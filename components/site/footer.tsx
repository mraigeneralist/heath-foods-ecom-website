import Link from "next/link";
import { Leaf } from "lucide-react";
import { STORE_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-sand/40">
      <div className="container-prose grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2 max-w-sm">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sage-deep text-cream">
              <Leaf className="h-4 w-4" strokeWidth={2.5} />
            </span>
            {STORE_NAME}
          </Link>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            We source from small Indian farms and family kitchens, then ship
            it straight to your door. No fillers. No preservatives. No nonsense.
          </p>
        </div>

        <div>
          <h4 className="font-display text-base">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/products" className="hover:text-foreground">All products</Link></li>
            <li><Link href="/categories/snacks" className="hover:text-foreground">Snacks</Link></li>
            <li><Link href="/categories/beverages" className="hover:text-foreground">Beverages</Link></li>
            <li><Link href="/categories/superfoods" className="hover:text-foreground">Superfoods</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Sign in</Link></li>
            <li><Link href="/sign-up" className="hover:text-foreground">Create account</Link></li>
            <li><Link href="/account/orders" className="hover:text-foreground">Track order</Link></li>
            <li><Link href="/cart" className="hover:text-foreground">Cart</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-prose flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {STORE_NAME}. All rights reserved.</p>
          <p>Made in India. Shipped pan-India.</p>
        </div>
      </div>
    </footer>
  );
}
