import React, { useState } from 'react';
import { CalendarRange, Plus, Edit, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface SeasonDefinition {
  id: string;
  name: string;
  startMonth: number;
  endMonth: number;
  color: string;
  description: string;
}

const defaultSeasons: SeasonDefinition[] = [
  {
    id: 'peak',
    name: 'Peak Season',
    startMonth: 10,
    endMonth: 2,
    color: 'bg-red-500',
    description: 'October to February + Holidays'
  },
  {
    id: 'shoulder',
    name: 'Shoulder Season',
    startMonth: 3,
    endMonth: 4,
    color: 'bg-yellow-500',
    description: 'March to April, September'
  },
  {
    id: 'monsoon',
    name: 'Monsoon Season',
    startMonth: 6,
    endMonth: 8,
    color: 'bg-blue-500',
    description: 'June to August'
  },
  {
    id: 'offpeak',
    name: 'Off-Peak Season',
    startMonth: 5,
    endMonth: 5,
    color: 'bg-green-500',
    description: 'May'
  }
];

export default function SeasonPricing() {
  const [seasons, setSeasons] = useState<SeasonDefinition[]>(defaultSeasons);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getMonthName = (month: number) => monthNames[month - 1];

  const getMonthRange = (start: number, end: number) => {
    if (start <= end) {
      return `${getMonthName(start)} - ${getMonthName(end)}`;
    } else {
      return `${getMonthName(start)} - Dec, Jan - ${getMonthName(end)}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Season Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Define and manage seasonal periods for pricing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Season Definitions</CardTitle>
          <CardDescription>
            Configure seasonal periods used for pricing across all room categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {seasons.map((season) => (
            <Card key={season.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`${season.color} w-4 h-4 rounded-full mt-1`} />
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg">{season.name}</h3>
                        <p className="text-sm text-muted-foreground">{season.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <CalendarRange className="h-3 w-3 mr-1" />
                          {getMonthRange(season.startMonth, season.endMonth)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Season Configuration Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-1">🎯 Peak Season</h4>
              <p className="text-muted-foreground">
                Highest demand period - festivals, holidays, best weather. Typically October to February in Matheran.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">🌤️ Shoulder Season</h4>
              <p className="text-muted-foreground">
                Moderate demand - pleasant weather, good for visiting. March-April and September.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">🌧️ Monsoon Season</h4>
              <p className="text-muted-foreground">
                Rainy season - June to August. Some guests love the greenery and mist.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">💚 Off-Peak Season</h4>
              <p className="text-muted-foreground">
                Lowest demand - very hot weather in May. Often offered at discounted rates.
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> These season definitions are used in the Category Pricing page. 
              When you set seasonal prices for room categories, they reference these periods.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
