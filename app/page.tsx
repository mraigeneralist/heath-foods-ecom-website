import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/site/category-card";
import { ProductCard } from "@/components/site/product-card";
import { createClient } from "@/lib/supabase/server";
import type { Category, ProductWithCategory } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*, category:categories(id, slug, name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const cats = (categories ?? []) as Category[];
  const featured = (products ?? []) as ProductWithCategory[];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-prose grid gap-10 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7 flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sand px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sage-deep">
              <Leaf className="h-3.5 w-3.5" /> New season harvest
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Honest food,
              <br />
              <span className="text-sage-deep italic">slowly made.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-muted-foreground md:text-lg">
              Wholesome snacks, cold-pressed beverages, and pantry superfoods
              sourced from small farms and family kitchens across India.
              Nothing fake. Nothing fried.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  Shop the pantry <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/categories/superfoods">Explore superfoods</Link>
              </Button>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <dt className="text-2xl font-display font-semibold text-sage-deep">100%</dt>
                <dd className="text-xs text-muted-foreground">No preservatives</dd>
              </div>
              <div>
                <dt className="text-2xl font-display font-semibold text-sage-deep">FSSAI</dt>
                <dd className="text-xs text-muted-foreground">Certified kitchens</dd>
              </div>
              <div>
                <dt className="text-2xl font-display font-semibold text-sage-deep">Pan-India</dt>
                <dd className="text-xs text-muted-foreground">Free over ₹500</dd>
              </div>
            </dl>
          </div>

          <div className="relative md:col-span-5 md:min-h-[480px]">
            <div className="absolute -top-6 -right-6 hidden h-72 w-72 rounded-full bg-terracotta/15 blur-3xl md:block" />
            <div className="grid grid-cols-2 gap-4 md:absolute md:inset-0">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-sand md:translate-y-6">
                <Image
                  src="/categories/superfoods.svg"
                  alt="Superfoods"
                  width={1200}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-sand">
                <Image
                  src="/categories/beverages.svg"
                  alt="Beverages"
                  width={1200}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="col-span-2 aspect-[16/7] overflow-hidden rounded-3xl bg-sand">
                <Image
                  src="/categories/snacks.svg"
                  alt="Snacks"
                  width={1200}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-prose pb-20">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Browse by aisle
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
              Three corners of the pantry.
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm underline underline-offset-4 hover:text-sage-deep md:inline-block"
          >
            See everything →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {cats.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="container-prose pb-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Just in
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
                Fresh on the shelf.
              </h2>
            </div>
            <Link
              href="/products"
              className="text-sm underline underline-offset-4 hover:text-sage-deep"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Promise band */}
      <section className="bg-sand/60">
        <div className="container-prose grid gap-8 py-16 md:grid-cols-3">
          {[
            {
              icon: Leaf,
              title: "Real ingredients",
              body: "If we can't pronounce it, we don't put it in. Single-origin where possible.",
            },
            {
              icon: ShieldCheck,
              title: "FSSAI certified",
              body: "Every kitchen we work with is licensed and audited. Lab reports on request.",
            },
            {
              icon: Truck,
              title: "Pan-India delivery",
              body: "Cold-chain where it matters. Free shipping on orders over ₹500.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-sage-deep text-cream">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
