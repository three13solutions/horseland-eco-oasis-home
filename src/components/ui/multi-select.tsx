import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X } from 'lucide-react';

interface MultiSelectOption {
  id: string;
  label: string;
  subtitle?: string;
  price?: number;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select items",
  searchPlaceholder = "Search...",
  emptyText = "No items found",
  className
}) => {
  const selectedOptions = options.filter(option => value.includes(option.id));

  const handleToggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(id => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const handleRemove = (optionId: string) => {
    onChange(value.filter(id => id !== optionId));
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between min-h-10"
          >
            {value.length > 0 ? `${value.length} selected` : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-50" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    onSelect={() => handleToggle(option.id)}
                    className="flex items-start gap-2 p-3"
                  >
                    <Checkbox
                      checked={value.includes(option.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.subtitle && (
                        <div className="text-sm text-muted-foreground">{option.subtitle}</div>
                      )}
                      {option.price !== undefined && (
                        <div className="text-sm text-muted-foreground">₹{option.price}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedOptions.map((option) => (
            <Badge key={option.id} variant="secondary" className="text-xs">
              {option.label}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => handleRemove(option.id)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};