export type OffProduct = { code: string; name: string; kcal_100g: number; protein_100g: number; carbs_100g: number | null; fat_100g: number | null };

const UA = 'ReplaApp/1.0 (giovaniohira@gmail.com)';

// Text search on Open Food Facts' search-a-licious (much more stable than /cgi/search.pl).
// Retries up to 3 times on 5xx/network errors; drops products without kcal/100 g.
export async function searchOff(q: string): Promise<OffProduct[]> {
  const url =
    'https://search.openfoodfacts.org/search?page_size=25&langs=pt&fields=code,product_name,brands,nutriments&q=' +
    encodeURIComponent(`${q} countries_tags:"en:brazil"`);
  let res: Response | undefined;
  for (let i = 0; i < 3; i++) {
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status < 500) break;
    } catch (e) {
      if (i === 2) throw e;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  if (!res || !res.ok) throw new Error(`Open Food Facts indisponível (${res?.status ?? 'sem conexão'})`);
  const json = await res.json();
  // Short name first: "Arroz" before "Arroz Integral Camil".
  const hits = [...(json.hits ?? [])].sort(
    (a: any, b: any) => String(a.product_name ?? '~').length - String(b.product_name ?? '~').length,
  );
  return hits.flatMap(parseProduct);
}

const n = (v: unknown) => { const x = Number(v); return v != null && v !== '' && isFinite(x) ? x : null; };

function parseProduct(p: any): OffProduct[] {
  const kcal = n(p.nutriments?.['energy-kcal_100g']);
  if (!p.product_name || !p.code || kcal == null) return [];
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
  const name = brand ? `${p.product_name} (${String(brand).trim()})` : p.product_name;
  return [{
    code: String(p.code), name, kcal_100g: kcal, protein_100g: n(p.nutriments?.proteins_100g) ?? 0,
    carbs_100g: n(p.nutriments?.carbohydrates_100g), fat_100g: n(p.nutriments?.fat_100g),
  }];
}

// Barcode lookup (EAN/UPC). null = not found or no calories listed.
export async function productByCode(code: string): Promise<OffProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,nutriments`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.status === 1 ? (parseProduct(json.product)[0] ?? null) : null;
}
