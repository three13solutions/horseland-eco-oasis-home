import { useEffect, useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import { catalogueGuestMealPricesKey, saveCatalogueGuestMealPrices, useCatalogueGuestMealPrices } from '@/lib/catalogue-guest-meal-pricing-client';
import { buildCatalogueMealGuestPriceRow, catalogueMealBands, catalogueMealBandLabel, type MealGuestPriceSnapshot } from '@/lib/catalogue-guest-meal-pricing';

type SelectedMeal = { id: string; price: number };
type PriceDraft = { mealId: string; snapshot: MealGuestPriceSnapshot; values: Record<string, string> };
const editable = (band: ReturnType<typeof catalogueMealBands>[number]) => band.key !== 'adult' && band.meal_rule !== 'free';

/** Dedicated staged save: changes to prices never ride on a metadata update. */
export function CatalogueGuestMealPrices({
  meal, adultPrice, onAdultPriceChange, disabled = false, onSaveInProgress, onPendingChanges,
}: {
  meal: SelectedMeal | null;
  adultPrice: string;
  onAdultPriceChange: (price: string) => void;
  disabled?: boolean;
  onSaveInProgress: (busy: boolean) => void;
  onPendingChanges: (dirty: boolean) => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const policy = useGuestAgePolicy({ allowInactive: true });
  const rates = useCatalogueGuestMealPrices(!!meal);
  const bands = catalogueMealBands(policy.data?.bands);
  const adultBand = bands.find(band => band.key === 'adult');
  const [draft, setDraft] = useState<PriceDraft>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const synchronized = !!rates.data && !!policy.data && rates.data.guest_policy_revision === policy.data.revision;
  const currentRow = meal && rates.data ? rates.data.prices[meal.id] : undefined;
  const current = draft?.mealId === meal?.id ? draft : undefined;
  const dirty = !!current;
  const stale = !!current && (!synchronized || current.snapshot.revision !== rates.data?.revision
    || current.snapshot.guest_policy_revision !== rates.data?.guest_policy_revision);
  const canEdit = !!meal && synchronized && !rates.isError && !rates.isFetching && !policy.isFetching;
  const valueOf = (key: string) => current && Object.prototype.hasOwnProperty.call(current.values, key) ? current.values[key] :
    currentRow && Object.prototype.hasOwnProperty.call(currentRow, key) ? String(currentRow[key]) : '';
  useEffect(() => { setDraft(undefined); setError(''); setSaved(false); }, [meal?.id]);
  useEffect(() => { onPendingChanges(dirty); return () => onPendingChanges(false); }, [dirty, onPendingChanges]);
  function changePrice(key: string, value: string) {
    if (!meal || !rates.data || !canEdit || stale || busy) return;
    setSaved(false);
    setError('');
    const snapshot = rates.data;
    const values = Object.fromEntries(bands.filter(editable).map(band => [band.key, valueOf(band.key)]));
    setDraft({ mealId: meal.id, snapshot, values: { ...values, [key]: value } });
  }
  async function savePrices() {
    if (!current || !canEdit || stale || busy || disabled) return;
    setError('');
    setSaved(false);
    setBusy(true);
    onSaveInProgress(true);
    try {
      const prices = buildCatalogueMealGuestPriceRow(bands, current.values);
      const result = await saveCatalogueGuestMealPrices(current.mealId, prices, current.snapshot);
      client.setQueryData(catalogueGuestMealPricesKey, result);
      setDraft(undefined);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prices were not saved. Reload and try again.');
    } finally {
      setBusy(false);
      onSaveInProgress(false);
    }
  }
  function reloadPrices() {
    setDraft(undefined); setError(''); setSaved(false);
    void policy.refetch();
    if (meal) void rates.refetch();
  }
  return <fieldset className="min-w-0 space-y-2.5 rounded-md border px-3 pb-3" disabled={busy || disabled} aria-describedby={`${id}-description`}>
    <legend className="px-1 text-sm font-semibold">Prices by guest type</legend>
    <p id={`${id}-description`} className="text-xs text-muted-foreground">INR per guest, per meal. Guest types and ages come from the pricing policy. These guest-type settings do not change booking prices yet.</p>
    <div className="grid min-w-0 gap-2.5 sm:grid-cols-3">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={`${id}-adult`}>{adultBand ? catalogueMealBandLabel(adultBand) : 'Adult'} (₹)</Label>
        <Input id={`${id}-adult`} type="number" min="0" max="99999999.99" step="0.01" value={adultPrice}
          onChange={event => onAdultPriceChange(event.target.value)} readOnly={!!meal} required />
      </div>
      {bands.filter(band => band.key !== 'adult').map((band, index) => {
        const fieldId = `${id}-guest-${index}`;
        return <div key={band.key} className="min-w-0 space-y-1">
          <Label htmlFor={fieldId}>{catalogueMealBandLabel(band)} (₹)</Label>
          <Input id={fieldId} inputMode="decimal" value={band.meal_rule === 'free' ? '0' : valueOf(band.key)}
            placeholder="Not configured" onChange={event => changePrice(band.key, event.target.value)}
            disabled={!canEdit || stale || band.meal_rule === 'free'} />
          {band.meal_rule === 'free' && <p className="text-xs text-muted-foreground">Free under the guest policy</p>}
        </div>;
      })}
    </div>
    {policy.isPending && <p role="status" className="text-xs text-muted-foreground">Loading guest types…</p>}
    {policy.isError && <p role="alert" className="text-xs text-destructive">Guest types could not be loaded. Metadata editing is still available.</p>}
    {!meal && <p className="text-xs text-muted-foreground">Create the meal with its adult price first. Then add prices for the other guest types.</p>}
    {meal && <p className="text-xs text-muted-foreground">Change the adult price through Shared meal prices, where linked plans can be reviewed.</p>}
    {meal && rates.isPending && <p role="status" className="text-xs text-muted-foreground">Loading saved guest-type prices…</p>}
    {meal && rates.data === null && <p role="status" className="text-xs text-muted-foreground">Guest-type price storage isn’t available on this database yet. Existing meal pricing is unchanged.</p>}
    {meal && rates.isError && <p role="alert" className="text-xs text-destructive">Saved guest-type prices could not be loaded. No rates were changed.</p>}
    {meal && rates.data && policy.data && !synchronized && <p role="alert" className="text-xs text-destructive">Guest pricing and age policy revisions do not match. Reload both before editing.</p>}
    {stale && <p role="alert" className="text-xs text-destructive">Prices or guest types changed while you were editing. Reload before saving.</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {saved && <p role="status" className="text-xs text-muted-foreground">Guest-type prices saved for review. Existing booking prices were not changed.</p>}
    {meal && (current || error || rates.isError || rates.data === null || policy.isError || (rates.data && policy.data && !synchronized)) && <div className="flex flex-wrap items-center gap-2">
      {current && <Button type="button" size="sm" disabled={!canEdit || stale || busy} onClick={() => void savePrices()}>{busy ? 'Saving…' : 'Save guest-type prices'}</Button>}
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={reloadPrices}>{current ? 'Discard prices and reload' : 'Reload guest prices'}</Button>
    </div>}
  </fieldset>;
}
