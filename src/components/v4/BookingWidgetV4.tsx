import React, { useState } from 'react';
import { Calendar, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BookingWidgetV4 = () => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');

  return (
    <section className="relative -mt-16 z-30 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-background/90 backdrop-blur-lg rounded-2xl shadow-xl border border-border/20 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Check-in */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                Check-in
              </label>
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Check-out */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                Check-out
              </label>
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Guests */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" />
                Guests
              </label>
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select guests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Guest</SelectItem>
                  <SelectItem value="2">2 Guests</SelectItem>
                  <SelectItem value="3">3 Guests</SelectItem>
                  <SelectItem value="4">4 Guests</SelectItem>
                  <SelectItem value="5">5+ Guests</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-transparent">Search</label>
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-medium">
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Mobile Stack Layout */}
          <div className="md:hidden mt-4">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-medium">
              <Search className="w-5 h-5 mr-2" />
              Find Available Rooms
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingWidgetV4;