import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyRuleStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  examples?: string[];
  onAddClick: () => void;
}

export function EmptyRuleState({ icon: Icon, title, description, examples, onAddClick }: EmptyRuleStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {description}
      </p>
      {examples && examples.length > 0 && (
        <div className="text-xs text-muted-foreground mb-6 space-y-1">
          <div className="font-medium mb-2">Example use cases:</div>
          {examples.map((example, idx) => (
            <div key={idx}>• {example}</div>
          ))}
        </div>
      )}
      <Button onClick={onAddClick}>
        Get Started
      </Button>
    </div>
  );
}
