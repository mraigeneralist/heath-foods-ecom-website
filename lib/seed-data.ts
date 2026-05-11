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

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

export const SEED_CATEGORIES: Category[] = [
  {
    id: CAT_SNACKS,
    slug: "snacks",
    name: "Snacks",
    description: "Wholesome munchies — roasted, baked, never fried.",
    image_url: UNSPLASH("photo-1521986329282-0436c1f1e212"),
    sort_order: 0,
  },
  {
    id: CAT_BEV,
    slug: "beverages",
    name: "Beverages",
    description: "Cold-pressed juices, herbal infusions, plant milks.",
    image_url: UNSPLASH("photo-1504855232331-fe4d5d2febfd"),
    sort_order: 1,
  },
  {
    id: CAT_SUPER,
    slug: "superfoods",
    name: "Superfoods",
    description: "Nutrient-dense staples for everyday wellness.",
    image_url: UNSPLASH("photo-1542990253-a781e04c0082"),
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
  unsplash_id: string,
  gallery_unsplash_ids: string[] = [],
): ProductWithCategory => ({
  id,
  category_id,
  slug,
  name,
  description,
  price_paise,
  weight_grams,
  stock: 100,
  image_url: UNSPLASH(unsplash_id),
  gallery_image_urls: gallery_unsplash_ids.map(UNSPLASH),
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
    "photo-1710421576768-ff985fa63b60",
    ["photo-1776765828683-eb5ec29711e2", "photo-1662716679940-14b4669aa1be"],
  ),
  product(
    "10000000-0000-0000-0000-000000000002",
    CAT_SNACKS,
    "baked-ragi-chips",
    "Baked Ragi Chips",
    "Stone-ground ragi flour, baked twice for that satisfying crunch. Iron-rich and gluten-conscious.",
    17900,
    80,
    "photo-1613919113640-25732ec5e61f",
    ["photo-1617102738820-bee2545405fd", "photo-1647764430080-6000fbe7efee"],
  ),
  product(
    "10000000-0000-0000-0000-000000000003",
    CAT_SNACKS,
    "almond-energy-bars",
    "Almond Energy Bars (pack of 6)",
    "California almonds, dates, and a whisper of jaggery. No refined sugar, no protein-bar aftertaste.",
    39900,
    null,
    "photo-1772985432516-2e2ed6e4d480",
    ["photo-1772985197848-f927e66ed318", "photo-1558022237-9acacfbea28d"],
  ),
  product(
    "10000000-0000-0000-0000-000000000004",
    CAT_SNACKS,
    "quinoa-puff-mix",
    "Quinoa Puff Mix",
    "Air-puffed quinoa with curry leaves, peanuts and a streak of chilli. Office-drawer-approved.",
    22900,
    150,
    "photo-1705925438840-86614d4f7155",
    ["photo-1642254964005-c2b1a6871cec", "photo-1741827866505-11eb7c6926e0"],
  ),
  product(
    "10000000-0000-0000-0000-000000000005",
    CAT_SNACKS,
    "multigrain-khakhra",
    "Multigrain Khakhra",
    "Hand-rolled, slow-roasted Gujarati khakhra with bajra, jowar and methi. As tea-time should be.",
    14900,
    200,
    "photo-1588988949118-c86ba9c9c225",
    ["photo-1640625314547-aee9a7696589", "photo-1521791697570-e1f13d0b81d0"],
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
    "photo-1676043967557-2b70d9facd71",
    ["photo-1736959578118-a641cc0a9dd9", "photo-1737053525761-815d4db0c05d"],
  ),
  product(
    "20000000-0000-0000-0000-000000000002",
    CAT_BEV,
    "tulsi-ginger-green-tea",
    "Tulsi-Ginger Green Tea (25 bags)",
    "High-grown Nilgiri green tea, holy basil, and bright Kerala ginger. Calm in a cup.",
    32900,
    null,
    "photo-1555447014-7ead71574544",
    ["photo-1518881922778-bacb4debc3d7", "photo-1577968897966-3d4325b36b61"],
  ),
  product(
    "20000000-0000-0000-0000-000000000003",
    CAT_BEV,
    "coconut-water-sachets",
    "Coconut Water (pack of 6)",
    "Tender coconut water from the Konkan coast, lightly chilled and ready to drink.",
    29900,
    null,
    "photo-1588413336019-dd5d3beddf55",
    ["photo-1537191072641-5e19cc173c6a", "photo-1628692945318-f44a3c346afb"],
  ),
  product(
    "20000000-0000-0000-0000-000000000004",
    CAT_BEV,
    "almond-milk-unsweetened",
    "Almond Milk — Unsweetened",
    "Just two ingredients: almonds and water. No gums, no thickeners.",
    27900,
    1000,
    "photo-1601436423474-51738541c1b1",
    ["photo-1626196340104-2d6769a08761", "photo-1680901106907-3374ffaa25c6"],
  ),
  product(
    "20000000-0000-0000-0000-000000000005",
    CAT_BEV,
    "beetroot-carrot-shot",
    "Beetroot-Carrot Wellness Shot (6×60 ml)",
    "A daily-dose ritual. Beetroot, carrot, ginger, lemon. That's it.",
    49900,
    null,
    "photo-1506802913710-40e2e66339c9",
    ["photo-1551040096-5f4aec6ca12b", "photo-1500291161618-747dee2ab16c"],
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
    "photo-1587049352851-8d4e89133924",
    ["photo-1642067958024-1a2d9f836920", "photo-1654515722385-c684c5331c04"],
  ),
  product(
    "30000000-0000-0000-0000-000000000002",
    CAT_SUPER,
    "organic-chia-seeds",
    "Organic Chia Seeds",
    "Black chia from certified organic farms. High in omega-3s. Spoon into your morning yogurt.",
    34900,
    250,
    "photo-1604768802835-899055f0e245",
    ["photo-1642497393633-a19e9231fb92", "photo-1502825926876-e8819fbb2fd0"],
  ),
  product(
    "30000000-0000-0000-0000-000000000003",
    CAT_SUPER,
    "moringa-leaf-powder",
    "Moringa Leaf Powder",
    "Shade-dried moringa, cold-milled to retain colour and chlorophyll. A teaspoon goes a long way.",
    44900,
    200,
    "photo-1565117661210-fd54898de423",
    ["photo-1563353037-705845a4f9cc", "photo-1650494701391-daceb922ce9d"],
  ),
  product(
    "30000000-0000-0000-0000-000000000004",
    CAT_SUPER,
    "a2-cow-ghee",
    "A2 Cow Ghee",
    "Bilona-method ghee from Gir cows raised on open pasture. Nutty, golden, ridiculous on dosa.",
    89900,
    500,
    "photo-1573812461383-e5f8b759d12e",
    ["photo-1707425197195-240b7ad69047", "photo-1707424124274-689499bbe5e9"],
  ),
  product(
    "30000000-0000-0000-0000-000000000005",
    CAT_SUPER,
    "cold-pressed-flaxseed-oil",
    "Cold-Pressed Flaxseed Oil",
    "Pressed at low temperature in small batches to preserve omega-3s. Drizzle on salads.",
    52900,
    250,
    "photo-1474979266404-7eaacbcd87c5",
    ["photo-1552592074-ea7a91b851b3", "photo-1720468750623-39e9a09f5067"],
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
