// Kebab-case slug → display name as stored in Supabase `idx_company_report.sub_sector`.
// Source: cross-reference of GET /v2/subsectors/ (33 slugs) and
// `select distinct sub_sector from idx_company_report` (33 display names).
export const SUBSECTOR_SLUG_TO_NAME: Record<string, string> = {
  "alternative-energy": "Alternative Energy",
  "apparel-luxury-goods": "Apparel & Luxury Goods",
  "automobiles-components": "Automobiles & Components",
  banks: "Banks",
  "basic-materials": "Basic Materials",
  "consumer-services": "Consumer Services",
  "financing-service": "Financing Service",
  "food-beverage": "Food & Beverage",
  "food-staples-retailing": "Food & Staples Retailing",
  "healthcare-equipment-providers": "Healthcare Equipment & Providers",
  "heavy-constructions-civil-engineering":
    "Heavy Constructions & Civil Engineering",
  "holding-investment-companies": "Holding & Investment Companies",
  "household-goods": "Household Goods",
  "industrial-goods": "Industrial Goods",
  "industrial-services": "Industrial Services",
  insurance: "Insurance",
  "investment-service": "Investment Service",
  "leisure-goods": "Leisure Goods",
  "logistics-deliveries": "Logistics & Deliveries",
  "media-entertainment": "Media & Entertainment",
  "multi-sector-holdings": "Multi-sector Holdings",
  "nondurable-household-products": "Nondurable Household Products",
  "oil-gas-coal": "Oil, Gas & Coal",
  "pharmaceuticals-health-care-research":
    "Pharmaceuticals & Health Care Research",
  "properties-real-estate": "Properties & Real Estate",
  retailing: "Retailing",
  "software-it-services": "Software & IT Services",
  "technology-hardware-equipment": "Technology Hardware & Equipment",
  telecommunication: "Telecommunication",
  tobacco: "Tobacco",
  transportation: "Transportation",
  "transportation-infrastructure": "Transportation Infrastructure",
  utilities: "Utilities",
};

export const normalizeSubsectorSlug = (input: string): string => {
  const slug = input.trim().toLowerCase();

  if (!slug) {
    throw new Error("Subsector slug is required");
  }

  const displayName = SUBSECTOR_SLUG_TO_NAME[slug];
  if (!displayName) {
    throw new Error(
      `Unknown subsector slug: '${input}'. Use get-subsectors for valid options.`
    );
  }

  return displayName;
};
