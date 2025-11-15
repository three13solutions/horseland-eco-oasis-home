import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Navigation from '@/components/Navigation';
import DynamicFooter from '@/components/DynamicFooter';
import { AvailableRoomCard } from '@/components/booking/AvailableRoomCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Filters } from '@/components/stay/CategoryFilters';
import CategoryFilters from '@/components/stay/CategoryFilters';
import SEO from '@/components/SEO';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  hero_image?: string;
  gallery: any;
  max_guests: number;
  features: any;
  base_price: number;
}

interface AvailableRoom {
  roomType: RoomType;
  availableCount: number;
}

interface SimpleRoomCardProps {
  roomType: RoomType;
  availableCount: number;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  onBookNow: () => void;
  viewMode?: 'grid' | 'list';
}

// Simplified card component for search results
const SimpleRoomCard: React.FC<SimpleRoomCardProps> = ({
  roomType, 
  availableCount, 
  checkIn, 
  checkOut, 
  guests, 
  onBookNow,
  viewMode = 'grid'
}) => {
  const nights = checkIn && checkOut 
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className={viewMode === 'list' ? 'flex' : ''}>
        {roomType.hero_image && (
          <div className={viewMode === 'list' ? 'w-1/3' : 'w-full h-48'}>
            <img 
              src={roomType.hero_image} 
              alt={roomType.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold">{roomType.name}</h3>
            <Badge variant="secondary">
              {availableCount} available
            </Badge>
          </div>
          
          {roomType.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {roomType.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Up to {roomType.max_guests} guests</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                ₹{roomType.base_price.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">per night</div>
            </div>
            <Button onClick={onBookNow}>
              Book Now
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

const SearchAvailability = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Search parameters
  const [checkIn, setCheckIn] = useState<Date | undefined>(
    searchParams.get('checkIn') ? new Date(searchParams.get('checkIn')!) : undefined
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(
    searchParams.get('checkOut') ? new Date(searchParams.get('checkOut')!) : undefined
  );
  const [guests, setGuests] = useState<number>(parseInt(searchParams.get('guests') || '2'));
  
  // Results
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    guests: null,
    bed: null,
    audience: null,
    budget: null,
    view: null,
    features: [],
    noise: null,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load initial search if params present
  useEffect(() => {
    if (checkIn && checkOut) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!checkIn || !checkOut) {
      toast({
        title: "Missing dates",
        description: "Please select check-in and check-out dates",
        variant: "destructive"
      });
      return;
    }

    if (checkIn >= checkOut) {
      toast({
        title: "Invalid dates",
        description: "Check-out must be after check-in",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // Fetch all room types
      const { data: allRooms, error: roomsError } = await supabase
        .from('room_types')
        .select('*')
        .eq('is_published', true);

      if (roomsError) throw roomsError;

      // For now, show all rooms with a count (we can enhance this later with actual availability check)
      const available = allRooms?.map((room: any) => ({
        roomType: room,
        availableCount: 5 // Placeholder count
      })) || [];

      setAvailableRooms(available);

      // Update URL
      const params = new URLSearchParams({
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        guests: guests.toString()
      });
      setSearchParams(params);

      if (available.length === 0) {
        toast({
          title: "No availability",
          description: "No rooms available for the selected dates",
        });
      }
    } catch (error) {
      console.error('Error searching availability:', error);
      toast({
        title: "Error",
        description: "Failed to search availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (roomTypeId: string) => {
    const params = new URLSearchParams({
      checkIn: checkIn!.toISOString().split('T')[0],
      checkOut: checkOut!.toISOString().split('T')[0],
      guests: guests.toString(),
      roomTypeId
    });
    navigate(`/booking?${params.toString()}`);
  };

  // Apply filters
  const filteredRooms = availableRooms.filter(({ roomType }) => {
    // Parse guest filter
    if (filters.guests) {
      const guestFilter = filters.guests;
      let minGuests = 0;
      let maxGuests = 999;
      
      if (guestFilter === '1-2') { minGuests = 1; maxGuests = 2; }
      else if (guestFilter === '3') { minGuests = 3; maxGuests = 3; }
      else if (guestFilter === '4-6') { minGuests = 4; maxGuests = 6; }
      else if (guestFilter === '6+') { minGuests = 6; }
      
      if (roomType.max_guests < minGuests || roomType.max_guests > maxGuests) return false;
    }
    
    const features = roomType.features || [];
    
    if (filters.bed) {
      const hasBed = features.some((f: string) => f.toLowerCase().includes(filters.bed!.toLowerCase()));
      if (!hasBed) return false;
    }
    
    if (filters.features.length > 0) {
      const hasAllFeatures = filters.features.every(feature =>
        features.some((f: string) => f.toLowerCase().includes(feature.toLowerCase()))
      );
      if (!hasAllFeatures) return false;
    }

    if (filters.budget) {
      let budget: 'Budget' | 'Mid-range' | 'Premium' = 'Budget';
      if (roomType.base_price >= 4000) budget = 'Premium';
      else if (roomType.base_price >= 3000) budget = 'Mid-range';
      if (budget !== filters.budget) return false;
    }

    return true;
  });

  return (
    <>
      <SEO 
        title="Search Availability"
        description="Search for available accommodations for your dates"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />

        {/* Search Section */}
        <section className="py-8 bg-muted/30 border-b">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-3xl font-heading font-bold mb-6">Search Availability</h1>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Check-in</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={checkIn} 
                          onSelect={setCheckIn}
                          disabled={(date) => date < new Date()}
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Check-out</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={checkOut} 
                          onSelect={setCheckOut}
                          disabled={(date) => date <= (checkIn || new Date())}
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-32">
                    <label className="text-sm font-medium mb-2 block">Guests</label>
                    <Select value={guests.toString()} onValueChange={(val) => setGuests(parseInt(val))}>
                      <SelectTrigger>
                        <Users className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleSearch} 
                    disabled={loading}
                    className="h-10"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Results Section */}
        {searched && (
          <section className="py-8 flex-1">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-6">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-20 bg-card border rounded-lg p-4">
                    <CategoryFilters filters={filters} setFilters={setFilters} />
                  </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-heading font-bold">
                        {filteredRooms.length} {filteredRooms.length === 1 ? 'Room' : 'Rooms'} Available
                      </h2>
                      {checkIn && checkOut && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')} • {guests} {guests === 1 ? 'Guest' : 'Guests'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mobile Filter */}
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="lg:hidden">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80">
                          <SheetHeader>
                            <SheetTitle>Filters</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4">
                            <CategoryFilters filters={filters} setFilters={setFilters} />
                          </div>
                        </SheetContent>
                      </Sheet>

                      {/* View Toggle */}
                      <div className="hidden md:flex border rounded-lg p-1">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="h-8 px-3"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-8 px-3"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Room Cards */}
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Searching for available rooms...</p>
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          {searched ? 'No rooms available for the selected criteria' : 'Use the search above to find available rooms'}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className={viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                      : 'space-y-6'
                    }>
                      {filteredRooms.map(({ roomType, availableCount }) => (
                        <SimpleRoomCard
                          key={roomType.id}
                          roomType={roomType}
                          availableCount={availableCount}
                          checkIn={checkIn ? format(checkIn, 'yyyy-MM-dd') : undefined}
                          checkOut={checkOut ? format(checkOut, 'yyyy-MM-dd') : undefined}
                          guests={guests}
                          onBookNow={() => handleBookNow(roomType.id)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <DynamicFooter />
      </div>
    </>
  );
};

export default SearchAvailability;
