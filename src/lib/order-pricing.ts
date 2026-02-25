type HasPriceSnapshot = {
  priceSnapshot: number;
  priceConventionSnapshot?: number | null;
};

export function getConventionPrice(item: HasPriceSnapshot): number {
  return Number(item.priceConventionSnapshot != null ? item.priceConventionSnapshot : item.priceSnapshot);
}

export function calculateConventionTotal(items: HasPriceSnapshot[]): number {
  return items.reduce((sum, item) => sum + getConventionPrice(item), 0);
}
