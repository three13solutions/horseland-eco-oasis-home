import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollArrowsProps {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  label?: string;
  className?: string;
}

export default function ScrollArrows({ onPrevious, onNext, previousDisabled, nextDisabled, label = 'content', className }: ScrollArrowsProps) {
  return (
    <div data-scroll-arrows className={cn('flex gap-1 pointer-events-auto', className)}>
      <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 bg-background/95 shadow-md" disabled={previousDisabled} onClick={(event) => { event.stopPropagation(); onPrevious(); }} aria-label={`Scroll up — ${label}`} title={`Scroll up / previous — ${label}`}>
        <ChevronUp />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 bg-background/95 shadow-md" disabled={nextDisabled} onClick={(event) => { event.stopPropagation(); onNext(); }} aria-label={`Scroll down — ${label}`} title={`Scroll down / next — ${label}`}>
        <ChevronDown />
      </Button>
    </div>
  );
}