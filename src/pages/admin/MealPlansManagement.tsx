import { useGuestAgePolicy } from "@/hooks/useGuestAgePolicy";
import { CatalogueGuestMealRollup } from "@/components/admin/CatalogueGuestMealRollup";
import { useCatalogueGuestMealPrices } from "@/lib/catalogue-guest-meal-pricing-client";
import { catalogueMealBands, catalogueMealBandName, catalogueMealIsAdultOnly, catalogueMealPriceForGuest, currencyForMealGuestPrice } from "@/lib/catalogue-guest-meal-pricing";
import { MealPlanAgePricing } from "@/components/admin/MealPlanAgePricing";
import { MealPlanDietaryVariants } from "@/components/admin/MealPlanDietaryVariants";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { LiveMealPricing, type MealGroupEditor } from "@/components/admin/LiveMealPricing";
import { fetchMealPricingWorkspace, mealPricingQueryKey } from "@/lib/meal-pricing-client";
import { mealPlanAliasPayload, findMealPlanAliasConflict } from "@/lib/mealPlanAliases";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Info } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface MealPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  alias_names: string[];
  alias_codes: string[];
  supplement_per_person_inr: number | null;
  supplement_period: string | null;
  supplement_effective_from: string;
  description: string | null;
  included_meal_types: string[];
  preferred_variant: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean | null;
  updated_at: string;
}

const emptyMetadata = () => ({
  plan_code: '',
  plan_name: '',
  alias_names_text: '',
  alias_codes_text: '',
  description: '',
  display_order: 0,
  is_featured: false,
});
const canonicalCodes = ['RO', 'BB', 'HB', 'FB'];
const inputClass = 'h-9 min-w-0 text-sm';
const sectionClass = 'min-w-0 space-y-2.5 border-t pt-3';
const fieldGrid = 'grid min-w-0 items-start gap-2.5 sm:grid-cols-2';
const aliasHelp = 'Separate entries with commas or new lines. Aliases identify this same plan in admin; they are not extra plans or website descriptions.';

function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
 const descriptionId=useId();
 const [open,setOpen]=useState(false);
 const [pinned,setPinned]=useState(false);
 const hoverTimer=useRef<ReturnType<typeof setTimeout> | null>(null);
 const cancelHoverClose=()=>{
  if(hoverTimer.current!==null){clearTimeout(hoverTimer.current);hoverTimer.current=null;}
 };
 useEffect(()=>()=>{if(hoverTimer.current!==null)clearTimeout(hoverTimer.current);},[]);
 const scheduleHoverClose=()=>{
  if(pinned)return;
  cancelHoverClose();
  hoverTimer.current=setTimeout(()=>{setOpen(false);hoverTimer.current=null;},220);
 };
 return <>
  <span id={descriptionId} className="sr-only">{children}</span>
  <Popover open={open} onOpenChange={next=>{cancelHoverClose();setOpen(next);if(!next)setPinned(false);}}>
   <PopoverTrigger asChild>
    <button type="button" aria-label={`Help: ${label}`} aria-describedby={descriptionId}
     className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     onPointerEnter={event=>{if(event.pointerType==='mouse'){cancelHoverClose();setOpen(true);}}}
     onPointerLeave={event=>{if(event.pointerType==='mouse'&&document.activeElement!==event.currentTarget)scheduleHoverClose();}}
     onFocus={()=>{cancelHoverClose();setOpen(true);}}
     onBlur={()=>{if(!pinned)setOpen(false);}}
     onClick={event=>{event.preventDefault();cancelHoverClose();setPinned(!pinned);setOpen(!pinned);}}>
     <Info aria-hidden="true" className="h-3.5 w-3.5"/>
    </button>
   </PopoverTrigger>
   <PopoverContent aria-label={`Help: ${label}`} align="start" side="top" sideOffset={5}
    className="w-64 max-w-[calc(100vw-1rem)] p-2.5 text-xs leading-relaxed"
    onPointerEnter={cancelHoverClose} onPointerLeave={scheduleHoverClose}
    onOpenAutoFocus={event=>event.preventDefault()} onCloseAutoFocus={event=>event.preventDefault()}>
    {children}
   </PopoverContent>
  </Popover>
 </>;
}
function Field({ id, label, help, children }: { id: string; label: string; help?: ReactNode; children: ReactNode }) {
 return <div className="min-w-0 space-y-1">
  {help?<div className="flex items-center gap-1"><Label htmlFor={id}>{label}</Label><FieldHelp label={label}>{help}</FieldHelp></div>:<Label htmlFor={id}>{label}</Label>}
  {children}
 </div>;
}
function ConfigurationSection({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return <details className="min-w-0 rounded-md border p-2.5 sm:p-3">
    <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {title}
    </summary>
    <div className="mt-2 min-w-0 space-y-2">
      <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">About this section</span><FieldHelp label={title}>{help}</FieldHelp></div>
      {children}
    </div>
  </details>;
}

type ServiceMealVariant = {
  id: string;
  title: string;
  meal_type: string;
  variant: string;
  price: number;
  description: string | null;
  featured_media: string | null;
  is_active: boolean;
};
const mealTypeLabels: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', high_tea: 'High tea', dinner: 'Dinner' };
const dietaryLabels: Record<string, string> = { veg: 'Veg', non_veg: 'Non-Veg', nonveg: 'Non-Veg', jain: 'Jain' };
const formatMealsText = (value: string) => value.replace(/[_-]/g, ' ');
const formatCataloguePrice = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

async function fetchServiceMealVariants(): Promise<ServiceMealVariant[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('id,title,meal_type,variant,price,description,featured_media,is_active')
    .order('title');
  if (error) throw error;
  return data ?? [];
}

function CatalogueVariants({
  plan, meals, workspace, onEdit,
}: {
  plan: MealPlan;
  meals: ReturnType<typeof useServiceMealVariants>;
  workspace: ReturnType<typeof useMealVariantWorkspace>;
  onEdit: () => void;
}) {
  const policy = useGuestAgePolicy({ allowInactive: true });
  const guestPrices = useCatalogueGuestMealPrices();
  const bands = catalogueMealBands(policy.data?.bands);
  const guestPriceAvailability = policy.isError || guestPrices.isError ? 'error' : policy.isPending || guestPrices.isPending ? 'loading'
    : !guestPrices.data ? 'missing' : guestPrices.data.guest_policy_revision !== policy.data?.revision ? 'mismatch' : 'ready';
  const verifiedGuestPrices = guestPriceAvailability === 'ready' ? guestPrices.data ?? undefined : undefined;
  const pricedPlan = !workspace.isError ? workspace.data?.plans.find(item => item.id === plan.id) : undefined;
  const linkedIds = new Set(pricedPlan?.groups.flatMap(group => group.meal_ids) ?? []);
  const workspaceMeals = new Map(workspace.data?.meals.map(item => [item.id, item]) ?? []);
  const catalogueIds = new Set(meals.data?.map(item => item.id) ?? []);
  const mealTypes = new Set(plan.included_meal_types ?? []);
  for (const id of linkedIds) {
    const linkedMeal = workspaceMeals.get(id) ?? meals.data?.find(item => item.id === id);
    if (linkedMeal) mealTypes.add(linkedMeal.meal_type);
  }
  const typeOrder = ['breakfast', 'lunch', 'high_tea', 'dinner'];
  const types = Array.from(mealTypes).sort((a, b) => (typeOrder.includes(a) ? typeOrder.indexOf(a) : 10) - (typeOrder.includes(b) ? typeOrder.indexOf(b) : 10) || a.localeCompare(b));
  const missing = Array.from(linkedIds).filter(id => !catalogueIds.has(id));
  const roomOnly = plan.plan_code === 'RO';
  const membershipKnown = !!pricedPlan && !workspace.error;
  return <section className="min-w-0 space-y-2.5" aria-labelledby="meal-variants-heading">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <h4 id="meal-variants-heading" className="text-sm font-semibold">Variants</h4>
        <FieldHelp label="Variants">Titles, descriptions, images and prices come from Services → Meals. Checkmarks show meal records linked to this plan. Use Edit linked variants for reviewed changes; this does not enable variant selection at booking.</FieldHelp>
      </div>
      {!roomOnly && <Button type="button" variant="outline" size="sm" disabled={!membershipKnown || workspace.isFetching} onClick={onEdit}>Edit linked variants</Button>}
    </div>
    <CatalogueGuestMealRollup plan={pricedPlan} meals={workspaceMeals} bands={bands} prices={verifiedGuestPrices}
      staged={workspace.data?.mode === 'staged'} availability={guestPriceAvailability} />
    {plan.preferred_variant && <p className="text-xs text-muted-foreground">Saved legacy preference: {dietaryLabels[plan.preferred_variant] ?? formatMealsText(plan.preferred_variant)}.</p>}
    {!roomOnly && (meals.isError || workspace.isError) && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
      {meals.isError ? 'Could not load variants from Services → Meals.' : 'Could not verify which variants are linked.'}
      <Button type="button" variant="outline" size="sm" onClick={() => { if (meals.isError) void meals.refetch(); if (workspace.isError) void workspace.refetch(); }}>Reload variants</Button>
    </div>}
    {roomOnly ? <p className="text-sm text-muted-foreground">Room Only has no included meal variants.</p> : meals.isPending || workspace.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading meal variants…</p> : <>
      {!workspace.error && !pricedPlan && <p className="text-sm text-muted-foreground">No saved meal groups were found for this plan. Selection cannot be verified.</p>}
      {workspace.data?.mode === 'staged' && pricedPlan && <p className="text-xs text-muted-foreground">Checkmarks show staged links. Services prices are shown first; a different staged price is labelled separately.</p>}
      {!types.length && <p className="text-sm text-muted-foreground">No meals are included. Add a group using Edit linked variants.</p>}
      <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2">
        {types.map(type => {
          const records = (meals.data ?? []).filter(item => item.meal_type === type);
          return <fieldset key={type} className="min-w-0 space-y-2 rounded-md border px-2.5 pb-2.5">
            <legend className="px-1 text-sm font-medium capitalize">{mealTypeLabels[type] ?? formatMealsText(type)}</legend>
            {!records.length && !meals.isError && <p className="text-xs text-muted-foreground">No variants in Services → Meals for this meal.</p>}
            {records.map(meal => {
              const workspaceMeal = workspaceMeals.get(meal.id);
              const name = dietaryLabels[meal.variant] ?? formatMealsText(meal.variant);
              const descriptionId = `plan-meal-details-${meal.id}`;
              return <div key={meal.id} className="flex min-w-0 items-start gap-2">
                <Checkbox id={`plan-meal-${meal.id}`} checked={membershipKnown ? linkedIds.has(meal.id) : 'indeterminate'} disabled aria-describedby={descriptionId} />
                {meal.featured_media && <img src={meal.featured_media} alt="" loading="lazy" className="h-9 w-12 shrink-0 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`plan-meal-${meal.id}`} className="break-words text-sm leading-5">{meal.title} · {name}</Label>
                  <div id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
                    <p>Adult: {formatCataloguePrice(meal.price)} per guest{!meal.is_active ? ' · Inactive in Services' : ''}</p>
                    {bands.filter(band => band.key !== 'adult').map(band => {
                      const amount = catalogueMealPriceForGuest(meal, band, verifiedGuestPrices);
                      const state = catalogueMealIsAdultOnly(meal.id, guestPrices.data ?? undefined) ? 'Not applicable'
                        : guestPriceAvailability !== 'ready' ? 'Not verified'
                        : amount === undefined ? 'Not configured' : currencyForMealGuestPrice(amount);
                      return <p key={band.key}>{catalogueMealBandName(band)}: {state}</p>;
                    })}
                    {workspace.data?.mode === 'staged' && workspaceMeal && workspaceMeal.price !== meal.price && <p>Staged price: {formatCataloguePrice(workspaceMeal.price)} per person</p>}
                    {meal.description && <p className="break-words">{meal.description}</p>}
                  </div>
                </div>
              </div>;
            })}
          </fieldset>;
        })}
      </div>
      {missing.length > 0 && !meals.isError && <p role="status" className="text-xs text-muted-foreground">{missing.length === 1 ? 'One linked meal is' : `${missing.length} linked meals are`} missing from Services → Meals. No replacement has been assumed.</p>}
    </>}
  </section>;
}

function useServiceMealVariants(enabled: boolean) {
  return useQuery({ queryKey: ['meal-plan-service-variants'], queryFn: fetchServiceMealVariants, enabled, refetchOnMount: 'always' });
}
function useMealVariantWorkspace(enabled: boolean) {
  return useQuery({ queryKey: mealPricingQueryKey, queryFn: fetchMealPricingWorkspace, enabled, refetchOnWindowFocus: false });
}

const MealPlansManagement = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'manage' | 'editor'>('manage');
  const [hasOpenedEditor, setHasOpenedEditor] = useState(false);
  const manageRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const focusTarget = useRef<'manage' | 'editor' | null>(null);
  useEffect(() => {
    if (focusTarget.current !== tab) return;
    (tab === 'editor' ? editorRef.current : manageRef.current)?.focus();
    focusTarget.current = null;
  }, [tab]);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [formData, setFormData] = useState(emptyMetadata);
  const groupEditor = useRef<MealGroupEditor>(null);
  const variantsEnabled = tab === 'editor' && !!editingPlan;
  const serviceMeals = useServiceMealVariants(variantsEnabled);
  const variantWorkspace = useMealVariantWorkspace(variantsEnabled);
  const catalogueDetails = new Map(serviceMeals.data?.map(meal => [meal.id, meal]) ?? []);


  const { data: mealPlans, isLoading, error: listError, refetch } = useQuery({
    queryKey: ['meal-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_rules')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as MealPlan[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async ({ form, plan }: { form: typeof formData; plan: MealPlan }) => {
      const { alias_names_text, alias_codes_text, ...metadata } = form;
      const supplement = plan.supplement_per_person_inr;
      if (plan.is_active && (!canonicalCodes.includes(metadata.plan_code) || supplement === null)) throw new Error('Active booking plans require RO, BB, HB or FB and a configured meal supplement. Configure linked pricing and availability before editing the metadata of a plan without them.');
      if (supplement !== null && (!Number.isFinite(supplement) || supplement < 0)) throw new Error('Enter a valid non-negative meal supplement.');
      const aliases = mealPlanAliasPayload(alias_names_text, alias_codes_text);
      const conflict = findMealPlanAliasConflict([...aliases.alias_names, ...aliases.alias_codes],
        (mealPlans || []).filter(other => other.id !== plan.id));
      if (conflict) throw new Error(`Alias "${conflict}" is already used by another meal plan.`);
      if (metadata.plan_code === 'RO' && supplement !== 0) throw new Error('Room Only must have a zero meal supplement.');
      if (!Number.isSafeInteger(metadata.display_order)) throw new Error('Enter a whole number for Display Order.');
      // Only metadata is written here. Linked prices, availability and composition use their reviewed RPCs.
      const { data: saved, error } = await supabase
        .from('meal_plan_rules')
        .update({ ...metadata, ...aliases, updated_at: new Date(Math.max(Date.now(), Date.parse(plan.updated_at) + 1)).toISOString() })
        .eq('id', plan.id)
        .eq('updated_at', plan.updated_at)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!saved) throw new Error('This meal plan changed while you were editing. Refresh it before saving again.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['shared-meal-pricing-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['meal-supplement-versions'] });
      queryClient.invalidateQueries({ queryKey: ['rate-plan-admin'] });
      queryClient.invalidateQueries({ queryKey: ['rate-variants'] });
      goToManage();
      toast.success('Meal plan updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Unable to update meal plan.');
    }
  });

  const resetForm = () => {
    setFormData(emptyMetadata());
    setEditingPlan(null);
  };

  const handleEdit = (plan: MealPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_code: plan.plan_code,
      plan_name: plan.plan_name,
      alias_names_text: (plan.alias_names || []).join(', '),
      alias_codes_text: (plan.alias_codes || []).join(', '),
      description: plan.description || '',
      display_order: plan.display_order,
      is_featured: !!plan.is_featured,
    });
    saveMutation.reset();
    showEditor(true);
  };

  function goToManage(restoreFocus = true) {
    resetForm();
    saveMutation.reset();
    if (restoreFocus) focusTarget.current = 'manage';
    setTab('manage');
  }

  function showEditor(moveFocus = false) {
    setHasOpenedEditor(true);
    if (moveFocus && tab !== 'editor') focusTarget.current = 'editor';
    setTab('editor');
  }

  async function reloadSelectedPlan() {
    const result = await refetch();
    if (result.error) {
      toast.error('Could not refresh the meal plan. Your unsaved edits are unchanged.');
      return;
    }
    const fresh = result.data?.find(plan => plan.id === editingPlan?.id);
    if (fresh) handleEdit(fresh);
    else {
      goToManage();
      toast.error('This meal plan is no longer available.');
    }
  }

  const currentPlan = mealPlans?.find(plan => plan.id === editingPlan?.id);
  const metadataStale = !!editingPlan && (!currentPlan || currentPlan.updated_at !== editingPlan.updated_at);
  const saveError = saveMutation.error && (saveMutation.error instanceof Error ? saveMutation.error.message : (saveMutation.error as { message?: string })?.message);

  if (isLoading) return <div role="status">Loading meal plans…</div>;

  return (
    <section aria-label="Meal Plans" className="min-w-0 space-y-3">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Meal Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage booking meal plans, linked prices, and guest-type rules.</p>
      </header>
      {listError && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">Meal plans could not load. <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>Reload plans</Button></p>}
      <Tabs value={tab} activationMode="manual" className="min-w-0" onValueChange={value => {
        if (saveMutation.isPending) return;
        if (value === 'manage') goToManage(false);
        if (value === 'editor') showEditor();
      }}>
        <TabsList aria-label="Meal plan views">
          <TabsTrigger ref={manageRef} value="manage" disabled={saveMutation.isPending}>Manage Plans</TabsTrigger>
          <TabsTrigger value="editor">{editingPlan ? 'Edit Plan' : 'Add Plan'}</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-lg">Manage plans</CardTitle>
              <p className="text-sm text-muted-foreground">Current public plan details and supplements. Staged prices and groups do not change this table until activation.</p>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                <Table aria-label="Meal plans">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Plan Name</TableHead>
                      <TableHead scope="col">Code</TableHead>
                      <TableHead scope="col">Aliases (admin only)</TableHead>
                      <TableHead scope="col">Meal Supplement / Person</TableHead>
                      <TableHead scope="col">Included Meals</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mealPlans?.length && <TableRow><TableCell colSpan={7} className="text-muted-foreground">No meal plans found.</TableCell></TableRow>}
                    {mealPlans?.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.plan_name}</TableCell>
                        <TableCell><code>{plan.plan_code}</code></TableCell>
                        <TableCell>
                          <div>{plan.alias_names?.join(' / ') || 'None'}</div>
                          <div className="text-sm text-muted-foreground">{plan.alias_codes?.join(' / ')}</div>
                        </TableCell>
                        <TableCell>
                          {plan.supplement_per_person_inr == null ? 'Not configured' : `₹${plan.supplement_per_person_inr.toLocaleString('en-IN')}`}
                          <div className="text-xs text-muted-foreground">{plan.supplement_period === 'per_night' ? 'Per night · ' : ''}Derived from linked meals; saved booking quotes remain fixed</div>
                        </TableCell>
                        <TableCell>
                          {plan.included_meal_types?.length > 0 ? (
                            plan.included_meal_types.map(m => (
                              <Badge key={m} variant="outline" className="mr-1 capitalize">{m}</Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {plan.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                            {plan.is_featured && <Badge variant="secondary">Featured</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" aria-label={`Edit ${plan.plan_name}`} disabled={saveMutation.isPending} onClick={() => handleEdit(plan)}>
                              <Edit aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground self-center">Availability is managed in Edit Plan</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {hasOpenedEditor && <TabsContent value="editor" forceMount className="min-w-0 space-y-3 data-[state=inactive]:hidden" aria-hidden={tab !== 'editor'}>
          <Card className="min-w-0">
            <CardHeader className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 ref={editorRef} tabIndex={-1} className="text-lg font-semibold leading-tight">{editingPlan ? `Edit ${editingPlan.plan_name}` : 'Add Plan'}</h2>
                <Button type="button" size="sm" variant="ghost" disabled={saveMutation.isPending} onClick={() => goToManage()}><ArrowLeft aria-hidden="true" className="mr-1 h-4 w-4" /> Back to Manage Plans</Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              {!editingPlan ? <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                <p>Booking pricing supports four built-in plans: Room Only (EP), Breakfast (CP), Half Board (MAP), and Full Board (AP). New plans cannot be created here.</p>
                <p className="text-muted-foreground">Choose Edit beside a plan in Manage Plans to update its details. Use the sections below to manage linked pricing, availability, or guest-type prices. Dietary variants are available when editing a plan.</p>
              </div> : <div className="min-w-0 space-y-3">
                <fieldset disabled={saveMutation.isPending || metadataStale} className="min-w-0 space-y-3">
                  <legend className="sr-only">Meal plan settings</legend>
                  <div className={fieldGrid}>
                    <Field id="meal-plan-code" label="Plan Code" help="The four booking plan codes are locked. Use aliases for alternate names or codes.">
                      <Input id="meal-plan-code" className={inputClass} value={formData.plan_code} disabled={canonicalCodes.includes(editingPlan.plan_code)} onChange={event => setFormData(prev => ({ ...prev, plan_code: event.target.value }))} placeholder="RO, BB, HB or FB" />
                    </Field>
                    <Field id="meal-plan-name" label="Plan Name">
                      <Input id="meal-plan-name" className={inputClass} value={formData.plan_name} onChange={event => setFormData(prev => ({ ...prev, plan_name: event.target.value }))} placeholder="e.g., Breakfast Included" />
                    </Field>
                  </div>
                  <Field id="meal-plan-description" label="Description" help="Used to describe this plan to guests.">
                    <Textarea id="meal-plan-description" className="min-h-16 min-w-0 text-sm" rows={2} value={formData.description} onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))} placeholder="Brief description of this meal plan" />
                  </Field>
                  <div className={fieldGrid}>
                    <Field id="alias-names" label="Alias Names (admin only)" help={aliasHelp}>
                      <Textarea id="alias-names" className="min-h-16 min-w-0 text-sm" rows={2} value={formData.alias_names_text} onChange={event => setFormData(prev => ({ ...prev, alias_names_text: event.target.value }))} placeholder="e.g., Bed & Breakfast, Continental Plan" />
                    </Field>
                    <Field id="alias-codes" label="Alias Codes (admin only)" help={aliasHelp}>
                      <Input id="alias-codes" className={inputClass} value={formData.alias_codes_text} onChange={event => setFormData(prev => ({ ...prev, alias_codes_text: event.target.value }))} placeholder="e.g., CP" />
                    </Field>
                  </div>

                  <section className={sectionClass} aria-labelledby="meal-linked-rates-heading">
                    <h3 id="meal-linked-rates-heading" className="text-sm font-semibold">Linked rates and meals</h3>
                    <div className={fieldGrid}>
                      <Field id="meal-supplement" label="Meal Supplement per Person (₹)" help="Per person per night. Automatic meal quantities follow Guest Age & Pricing Policy. The supplement is read-only here; use Linked meal-plan pricing to change it. Existing booking and payment snapshots are preserved.">
                        <Input id="meal-supplement" className={inputClass} type="number" min="0" step="0.01" disabled value={editingPlan.supplement_per_person_inr ?? ''} placeholder="Not configured" readOnly />
                      </Field>
                      <Field id="supplement-effective-from" label="Effective for stay nights from" help="The saved effective date for the linked supplement. It cannot be edited as plan metadata.">
                        <Input id="supplement-effective-from" className={inputClass} disabled type="date" value={editingPlan.supplement_effective_from} readOnly />
                      </Field>
                    </div>
                    <div className={fieldGrid}>
                      <fieldset className="space-y-1">
                        <legend className="sr-only">Included Meals</legend>
                        <div aria-hidden="true" className="inline-block align-middle text-sm font-medium">Included Meals</div>
                        <div className="inline-flex align-middle"><FieldHelp label="Included Meals">Update included meals and alternatives under Linked meal-plan pricing.</FieldHelp></div>
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
                          {Array.from(new Set(['breakfast', 'lunch', 'dinner', ...(editingPlan.included_meal_types || [])])).map((mealType, index) => (
                            <div key={mealType} className="flex items-center gap-2">
                              <Checkbox id={`meal-type-${index}`} disabled checked={editingPlan.included_meal_types?.includes(mealType) ?? false} />
                              <Label htmlFor={`meal-type-${index}`} className="capitalize">{mealType.replace(/_/g, ' ')}</Label>
                            </div>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                    <CatalogueVariants plan={editingPlan} meals={serviceMeals} workspace={variantWorkspace} onEdit={() => {
                      if (!groupEditor.current?.open(editingPlan.id)) toast.error('Could not open the current linked groups. Reload linked pricing and try again.');
                    }} />
                    <ConfigurationSection title="Saved plan-level variant settings" help="Optional admin-only overrides recorded for this plan. They are separate from the Services catalogue above and do not affect guest selection or checkout.">
                      <MealPlanDietaryVariants key={editingPlan.id} plans={[editingPlan]} />
                    </ConfigurationSection>
                  </section>

                  <section className={sectionClass} aria-labelledby="meal-plan-availability-heading">
                    <h3 id="meal-plan-availability-heading" className="text-sm font-semibold">Display and availability</h3>
                    <div className={fieldGrid}>
                      <Field id="meal-display-order" label="Display Order">
                        <Input id="meal-display-order" className={inputClass} type="number" value={Number.isNaN(formData.display_order) ? '' : formData.display_order} onChange={event => setFormData(prev => ({ ...prev, display_order: parseInt(event.target.value, 10) }))} />
                      </Field>
                      <div className="grid min-w-0 gap-2.5 min-[920px]:grid-cols-2">
                        <div className="flex min-h-9 min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5">
                          <div className="flex min-w-0 items-center gap-1"><Label htmlFor="meal-plan-active">Active</Label><FieldHelp label="Active">Use Linked meal-plan pricing below to change booking availability with a reviewed save. Meal plans are independent of cancellation policies.</FieldHelp></div>
                          <Switch id="meal-plan-active" type="button" checked={editingPlan.is_active} disabled />
                        </div>
                        <div className="flex min-h-9 min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5">
                          <Label htmlFor="meal-plan-featured">Featured</Label>
                          <Switch id="meal-plan-featured" type="button" checked={formData.is_featured} onCheckedChange={checked => setFormData(prev => ({ ...prev, is_featured: checked }))} />
                        </div>
                      </div>
                    </div>
                  </section>
                </fieldset>
                {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                {metadataStale && <p role="alert" className="text-sm text-destructive">Saved plan details have changed. Refresh this plan before editing or saving again.</p>}
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button type="button" size="sm" disabled={saveMutation.isPending || metadataStale} onClick={() => saveMutation.mutate({ form: formData, plan: editingPlan })}>{saveMutation.isPending ? 'Saving…' : 'Update Meal Plan'}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={saveMutation.isPending} onClick={() => goToManage()}>Cancel</Button>
                  {(metadataStale || saveError) && <Button type="button" size="sm" variant="outline" disabled={saveMutation.isPending} onClick={() => void reloadSelectedPlan()}>Refresh plan & discard edits</Button>}
                </div>
              </div>}
            </CardContent>
          </Card>

          <ConfigurationSection title="Linked meal-plan pricing and availability" help="Meal Management is the shared price source. Required meal groups and alternatives determine supplements. Changes use reviewed, revision-checked saves.">
            <LiveMealPricing groupEditorRef={groupEditor} catalogueDetails={catalogueDetails} />
          </ConfigurationSection>
          <ConfigurationSection title="Existing plan-level age rules" help="This keeps existing plan-level configuration available during rollout. Set the new per-variant guest prices in Services → Meals; their preview above does not change checkout.">
            <MealPlanAgePricing />
          </ConfigurationSection>
        </TabsContent>}
      </Tabs>
    </section>
  );
};

export default MealPlansManagement;

