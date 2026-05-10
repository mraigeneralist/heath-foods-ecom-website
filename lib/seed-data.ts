/**
 * Static fallback for the catalog. Mirrors `supabase/seed.sql` exactly so
 * the storefront renders something useful before Supabase is configured.
 * Once env vars are set, queries hit the real DB and these go unused.
 *
 * Keep in sync with seed.sql when you edit either.
 */
import type { Category, ProductWithCategory } from "@/lib/types";

const CAT_SNACKS = "00000000-0000-0000-0000-000000000001";
const CAT_BEV = "00000000-0000-0000-0000-000000000002";
const CAT_SUPER = "00000000-0000-0000-0000-000000000003";

export const SEED_CATEGORIES: Category[] = [
  {
    id: CAT_SNACKS,
    slug: "snacks",
    name: "Snacks",
    description: "Wholesome munchies — roasted, baked, never fried.",
    image_url: "/categories/snacks.svg",
    sort_order: 0,
  },
  {
    id: CAT_BEV,
    slug: "beverages",
    name: "Beverages",
    description: "Cold-pressed juices, herbal infusions, plant milks.",
    image_url: "/categories/beverages.svg",
    sort_order: 1,
  },
  {
    id: CAT_SUPER,
    slug: "superfoods",
    name: "Superfoods",
    description: "Nutrient-dense staples for everyday wellness.",
    image_url: "/categories/superfoods.svg",
    sort_order: 2,
  },
];

const cat = (id: string) => {
  const c = SEED_CATEGORIES.find((c) => c.id === id)!;
  return { id: c.id, slug: c.slug, name: c.name };
};

const NOW = "2026-05-10T00:00:00.000Z";

const product = (
  id: string,
  category_id: string,
  slug: string,
  name: string,
  description: string,
  price_paise: number,
  weight_grams: number | null,
): ProductWithCategory => ({
  id,
  category_id,
  slug,
  name,
  description,
  price_paise,
  weight_grams,
  stock: 100,
  image_url: `/products/${slug}.svg`,
  is_active: true,
  created_at: NOW,
  category: cat(category_id),
});

export const SEED_PRODUCTS: ProductWithCategory[] = [
  // Snacks
  product(
    "10000000-0000-0000-0000-000000000001",
    CAT_SNACKS,
    "roasted-makhana",
    "Roasted Makhana",
    "Lightly salted fox-nuts roasted in a touch of cold-pressed coconut oil. Crisp, addictive, and just 90 calories a handful.",
    24900,
    100,
  ),
  product(
    "10000000-0000-0000-0000-000000000002",
    CAT_SNACKS,
    "baked-ragi-chips",
    "Baked Ragi Chips",
    "Stone-ground ragi flour, baked twice for that satisfying crunch. Iron-rich and gluten-conscious.",
    17900,
    80,
  ),
  product(
    "10000000-0000-0000-0000-000000000003",
    CAT_SNACKS,
    "almond-energy-bars",
    "Almond Energy Bars (pack of 6)",
    "California almonds, dates, and a whisper of jaggery. No refined sugar, no protein-bar aftertaste.",
    39900,
    null,
  ),
  product(
    "10000000-0000-0000-0000-000000000004",
    CAT_SNACKS,
    "quinoa-puff-mix",
    "Quinoa Puff Mix",
    "Air-puffed quinoa with curry leaves, peanuts and a streak of chilli. Office-drawer-approved.",
    22900,
    150,
  ),
  product(
    "10000000-0000-0000-0000-000000000005",
    CAT_SNACKS,
    "multigrain-khakhra",
    "Multigrain Khakhra",
    "Hand-rolled, slow-roasted Gujarati khakhra with bajra, jowar and methi. As tea-time should be.",
    14900,
    200,
  ),
  // Beverages
  product(
    "20000000-0000-0000-0000-000000000001",
    CAT_BEV,
    "cold-pressed-amla-juice",
    "Cold-Pressed Amla Juice",
    "Single-origin amla pressed within hours of harvest. Tart, vitamin-C rich, no added sugar.",
    44900,
    500,
  ),
  product(
    "20000000-0000-0000-0000-000000000002",
    CAT_BEV,
    "tulsi-ginger-green-tea",
    "Tulsi-Ginger Green Tea (25 bags)",
    "High-grown Nilgiri green tea, holy basil, and bright Kerala ginger. Calm in a cup.",
    32900,
    null,
  ),
  product(
    "20000000-0000-0000-0000-000000000003",
    CAT_BEV,
    "coconut-water-sachets",
    "Coconut Water (pack of 6)",
    "Tender coconut water from the Konkan coast, lightly chilled and ready to drink.",
    29900,
    null,
  ),
  product(
    "20000000-0000-0000-0000-000000000004",
    CAT_BEV,
    "almond-milk-unsweetened",
    "Almond Milk — Unsweetened",
    "Just two ingredients: almonds and water. No gums, no thickeners.",
    27900,
    1000,
  ),
  product(
    "20000000-0000-0000-0000-000000000005",
    CAT_BEV,
    "beetroot-carrot-shot",
    "Beetroot-Carrot Wellness Shot (6×60 ml)",
    "A daily-dose ritual. Beetroot, carrot, ginger, lemon. That's it.",
    49900,
    null,
  ),
  // Superfoods
  product(
    "30000000-0000-0000-0000-000000000001",
    CAT_SUPER,
    "raw-forest-honey",
    "Raw Forest Honey",
    "Wild-harvested by tribal cooperatives in the Sundarbans. Unfiltered, unheated, untouched.",
    59900,
    500,
  ),
  product(
    "30000000-0000-0000-0000-000000000002",
    CAT_SUPER,
    "organic-chia-seeds",
    "Organic Chia Seeds",
    "Black chia from certified organic farms. High in omega-3s. Spoon into your morning yogurt.",
    34900,
    250,
  ),
  product(
    "30000000-0000-0000-0000-000000000003",
    CAT_SUPER,
    "moringa-leaf-powder",
    "Moringa Leaf Powder",
    "Shade-dried moringa, cold-milled to retain colour and chlorophyll. A teaspoon goes a long way.",
    44900,
    200,
  ),
  product(
    "30000000-0000-0000-0000-000000000004",
    CAT_SUPER,
    "a2-cow-ghee",
    "A2 Cow Ghee",
    "Bilona-method ghee from Gir cows raised on open pasture. Nutty, golden, ridiculous on dosa.",
    89900,
    500,
  ),
  product(
    "30000000-0000-0000-0000-000000000005",
    CAT_SUPER,
    "cold-pressed-flaxseed-oil",
    "Cold-Pressed Flaxseed Oil",
    "Pressed at low temperature in small batches to preserve omega-3s. Drizzle on salads.",
    52900,
    250,
  ),
];

export function seedCategoryBySlug(slug: string): Category | null {
  return SEED_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function seedProductBySlug(slug: string): ProductWithCategory | null {
  return SEED_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function seedProductsByCategoryId(
  categoryId: string,
): ProductWithCategory[] {
  return SEED_PRODUCTS.filter((p) => p.category_id === categoryId);
}
