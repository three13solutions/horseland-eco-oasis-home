import type { GuestAgeBand } from '@/lib/guest-age-policy';
import type { LiveMeal, LivePlan } from '@/lib/meal-pricing-contract';
import { catalogueMealBandLabel, currencyForMealGuestPrice, rollUpCatalogueGuestMealPrices, type MealGuestPriceSnapshot } from '@/lib/catalogue-guest-meal-pricing';

export function CatalogueGuestMealRollup({
  plan, meals, bands, prices, staged, availability,
}: {
  plan?: LivePlan; meals: ReadonlyMap<string, LiveMeal>; bands: GuestAgeBand[];
  prices?: MealGuestPriceSnapshot; staged: boolean; availability: 'loading' | 'missing' | 'error' | 'ready' | 'mismatch';
}) {
  return <section className="space-y-2 rounded-md border bg-muted/20 p-3" aria-label="Catalogue meal price preview">
    <h4 className="text-sm font-semibold">Meal prices by guest type · preview</h4>
    <p className="text-xs text-muted-foreground">Per guest, per night. Adds all required groups (AND) and one meal per alternatives group (OR). Not the current checkout price.</p>
    {staged && <p className="text-xs text-muted-foreground">Uses the staged linked groups and adult prices where available.</p>}
    {availability !== 'ready' && <p role={availability === 'error' || availability === 'mismatch' ? 'alert' : 'status'} className="text-xs text-muted-foreground">
      {availability === 'loading' ? 'Loading catalogue guest prices…' : availability === 'missing' ? 'Guest-type price storage is not available yet.'
        : availability === 'mismatch' ? 'The guest policy and catalogue pricing revisions differ. Reload before reviewing prices.' : 'Catalogue guest prices could not be verified.'}
    </p>}
    {plan && bands.length > 0 && <dl className="grid gap-2 sm:grid-cols-3">
      {bands.map(band => {
        if (band.key !== 'adult' && plan.plan_code !== 'RO' && availability !== 'ready') {
          return <div key={band.key} className="rounded-md border bg-background px-2.5 py-2">
            <dt className="text-xs text-muted-foreground">{catalogueMealBandLabel(band)}</dt>
            <dd className="text-sm font-semibold">Not verified</dd>
          </div>;
        }
        const result = rollUpCatalogueGuestMealPrices(plan, meals, band, prices);
        return <div key={band.key} className="rounded-md border bg-background px-2.5 py-2">
          <dt className="text-xs text-muted-foreground">{catalogueMealBandLabel(band)}</dt>
          <dd className="text-sm font-semibold">{result.kind === 'fixed' ? currencyForMealGuestPrice(result.paise)
            : result.kind === 'range' ? `${currencyForMealGuestPrice(result.minPaise)}–${currencyForMealGuestPrice(result.maxPaise)}`
            : result.reason === 'adults_only' ? 'Not applicable'
            : result.reason === 'missing_price' ? 'Not configured' : 'Unavailable'}</dd>
          {result.kind === 'unavailable' && result.reason === 'adults_only' && <p className="text-xs text-muted-foreground">An adults-only meal is linked to this plan.</p>}
          {result.kind === 'range' && <p className="text-xs text-muted-foreground">Alternatives have different prices. Review the choice group; the range is not bookable.</p>}
        </div>;
      })}
    </dl>}
    {!plan && <p className="text-xs text-muted-foreground">No verified linked plan is available to calculate.</p>}
  </section>;
}
