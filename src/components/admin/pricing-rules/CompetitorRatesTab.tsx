import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyRuleState } from './EmptyRuleState';

interface CompetitorRate {
  id: string;
  competitor_name: string;
  rate_date: string;
  competitor_price: number;
  room_category_comparable: string | null;
  our_room_type_id: string | null;
  source: string;
  notes: string | null;
  created_at: string;
}

export function CompetitorRatesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CompetitorRate | null>(null);
  const queryClient = useQueryClient();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['competitor-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_rates')
        .select('*')
        .order('rate_date', { ascending: false });
      if (error) throw error;
      return data as CompetitorRate[];
    },
  });

  const { data: roomTypes = [] } = useQuery<any[]>({
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('room_types')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newRate: any) => {
      const { data, error } = await supabase
        .from('competitor_rates')
        .insert([newRate])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-rates'] });
      toast({ title: 'Competitor rate added successfully' });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('competitor_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-rates'] });
      toast({ title: 'Competitor rate updated successfully' });
      setIsDialogOpen(false);
      setEditingRate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('competitor_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-rates'] });
      toast({ title: 'Competitor rate deleted successfully' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rateData = {
      competitor_name: formData.get('competitor_name') as string,
      rate_date: formData.get('rate_date') as string,
      competitor_price: parseFloat(formData.get('competitor_price') as string),
      room_category_comparable: formData.get('room_category_comparable') as string || null,
      our_room_type_id: formData.get('our_room_type_id') as string || null,
      source: formData.get('source') as string,
      notes: formData.get('notes') as string || null,
    };

    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, ...rateData });
    } else {
      createMutation.mutate(rateData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Competitor Rates</CardTitle>
            <CardDescription>Track competitor pricing for benchmarking</CardDescription>
          </div>
          <Button onClick={() => { setEditingRate(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : rates.length === 0 ? (
          <EmptyRuleState
            icon={BarChart3}
            title="No Competitor Rates Tracked"
            description="Monitor competitor pricing to stay competitive and make informed pricing decisions. Track rates across different date ranges and room categories."
            examples={[
              "Compare your rates against local competitors",
              "Identify pricing gaps and opportunities",
              "Track seasonal pricing trends"
            ]}
            onAddClick={() => { setEditingRate(null); setIsDialogOpen(true); }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Competitor</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Room Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>{new Date(rate.rate_date).toLocaleDateString()}</TableCell>
                  <TableCell>{rate.competitor_name}</TableCell>
                  <TableCell>₹{rate.competitor_price}</TableCell>
                  <TableCell>{rate.room_category_comparable || '-'}</TableCell>
                  <TableCell className="capitalize">{rate.source}</TableCell>
                  <TableCell>{rate.notes || '-'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingRate(rate); setIsDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(rate.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Edit' : 'Add'} Competitor Rate</DialogTitle>
              <DialogDescription>Track competitor pricing data for benchmarking</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="competitor_name">Competitor Name *</Label>
                    <Input
                      id="competitor_name"
                      name="competitor_name"
                      defaultValue={editingRate?.competitor_name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate_date">Date *</Label>
                    <Input
                      id="rate_date"
                      name="rate_date"
                      type="date"
                      defaultValue={editingRate?.rate_date}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="competitor_price">Competitor Price (₹) *</Label>
                    <Input
                      id="competitor_price"
                      name="competitor_price"
                      type="number"
                      step="0.01"
                      defaultValue={editingRate?.competitor_price}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room_category_comparable">Room Category</Label>
                    <Input
                      id="room_category_comparable"
                      name="room_category_comparable"
                      defaultValue={editingRate?.room_category_comparable || ''}
                      placeholder="e.g., Deluxe, Suite"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="our_room_type_id">Compare to Our Room</Label>
                    <Select name="our_room_type_id" defaultValue={editingRate?.our_room_type_id || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source *</Label>
                    <Select name="source" defaultValue={editingRate?.source || 'manual'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="ota">OTA</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingRate?.notes || ''}
                    placeholder="Additional observations or context"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRate ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
