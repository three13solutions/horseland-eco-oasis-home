import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function GuestTypeChargeInput({ label, value, sameAsAdult, adultValue, onValueChange, onModeChange, disabled = false }: {
  label: string; value: string; sameAsAdult: boolean; adultValue: string;
  onValueChange: (value: string) => void; onModeChange: (same: boolean) => void; disabled?: boolean;
}) {
  return <div className="space-y-2">
    <p className="text-sm font-medium">{label}</p>
    <Select value={sameAsAdult ? 'same_as_adult' : 'fixed'} disabled={disabled} onValueChange={mode => onModeChange(mode === 'same_as_adult')}>
      <SelectTrigger aria-label={`${label} charge mode`}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="fixed">Enter Rate</SelectItem><SelectItem value="same_as_adult">Same as Adult</SelectItem></SelectContent>
    </Select>
    <Input aria-label={`${label} rate`} type="number" min="0" step="0.01" disabled={disabled || sameAsAdult}
      value={sameAsAdult ? adultValue : value} onChange={event => onValueChange(event.target.value)} />
  </div>;
}