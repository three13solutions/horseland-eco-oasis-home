import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  description?: string;
  distance?: string;
  image?: string;
  is_active: boolean;
  booking_required: boolean;
  tags?: any;
  audience_tags?: any;
  location_name?: string;
  is_on_property?: boolean;
  price_type?: string;
  price_amount?: number;
  price_range_min?: number;
  price_range_max?: number;
  duration_hours?: number;
  duration_minutes?: number;
  timings?: any;
  available_days?: any;
  available_seasons?: any;
  disclaimer?: string;
  rules_regulations?: string;
  activity_tags?: any;
  media_urls?: any;
  booking_type?: string;
}

const ActivitiesManagement = () => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [distance, setDistance] = useState('');
  const [image, setImage] = useState('');
  const [bookingRequired, setBookingRequired] = useState(false);
  const [tags, setTags] = useState<string>('');
  const [audienceTags, setAudienceTags] = useState<string>('');
  const [locationName, setLocationName] = useState('');
  const [isOnProperty, setIsOnProperty] = useState(true);
  const [priceType, setPriceType] = useState<'free' | 'fixed' | 'range'>('free');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceRangeMin, setPriceRangeMin] = useState('');
  const [priceRangeMax, setPriceRangeMax] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [timingsType, setTimingsType] = useState<'24_7' | 'specific'>('24_7');
  const [specificTimings, setSpecificTimings] = useState('');
  const [availableDays, setAvailableDays] = useState<string>('');
  const [availableSeasons, setAvailableSeasons] = useState<string>('');
  const [disclaimer, setDisclaimer] = useState('');
  const [rulesRegulations, setRulesRegulations] = useState('');
  const [activityTags, setActivityTags] = useState<string>('');
  const [mediaUrls, setMediaUrls] = useState<string>('');
  const [bookingType, setBookingType] = useState<'online' | 'reception' | 'both'>('reception');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('title');
      
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activityData = {
        title,
        description,
        distance,
        image,
        location_name: locationName,
        is_on_property: isOnProperty,
        price_type: priceType,
        price_amount: priceAmount ? parseFloat(priceAmount) : null,
        price_range_min: priceRangeMin ? parseFloat(priceRangeMin) : null,
        price_range_max: priceRangeMax ? parseFloat(priceRangeMax) : null,
        duration_hours: durationHours ? parseInt(durationHours) : null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        timings: timingsType === '24_7' ? { type: '24_7' } : { type: 'specific', times: specificTimings.split(',').map(t => t.trim()) },
        available_days: availableDays ? availableDays.split(',').map(d => d.trim()) : [],
        available_seasons: availableSeasons ? availableSeasons.split(',').map(s => s.trim()) : [],
        disclaimer,
        rules_regulations: rulesRegulations,
        booking_required: bookingRequired,
        booking_type: bookingType,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        audience_tags: audienceTags ? audienceTags.split(',').map(tag => tag.trim()) : [],
        activity_tags: activityTags ? activityTags.split(',').map(tag => tag.trim()) : [],
        media_urls: mediaUrls ? mediaUrls.split(',').map(url => url.trim()) : [],
        is_active: true
      };

      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', editingActivity.id);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Activity updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('activities')
          .insert([activityData]);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Activity created successfully",
        });
      }

      resetForm();
      loadActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error",
        description: "Failed to save activity",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Activity ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      loadActivities();
    } catch (error) {
      console.error('Error toggling activity status:', error);
      toast({
        title: "Error",
        description: "Failed to update activity status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDistance('');
    setImage('');
    setBookingRequired(false);
    setTags('');
    setAudienceTags('');
    setLocationName('');
    setIsOnProperty(true);
    setPriceType('free');
    setPriceAmount('');
    setPriceRangeMin('');
    setPriceRangeMax('');
    setDurationHours('');
    setDurationMinutes('');
    setTimingsType('24_7');
    setSpecificTimings('');
    setAvailableDays('');
    setAvailableSeasons('');
    setDisclaimer('');
    setRulesRegulations('');
    setActivityTags('');
    setMediaUrls('');
    setBookingType('reception');
    setEditingActivity(null);
    setShowForm(false);
  };

  const editActivity = (activity: Activity) => {
    setTitle(activity.title);
    setDescription(activity.description || '');
    setDistance(activity.distance || '');
    setImage(activity.image || '');
    setLocationName(activity.location_name || '');
    setIsOnProperty(activity.is_on_property ?? true);
    setPriceType(activity.price_type as 'free' | 'fixed' | 'range' || 'free');
    setPriceAmount(activity.price_amount?.toString() || '');
    setPriceRangeMin(activity.price_range_min?.toString() || '');
    setPriceRangeMax(activity.price_range_max?.toString() || '');
    setDurationHours(activity.duration_hours?.toString() || '');
    setDurationMinutes(activity.duration_minutes?.toString() || '');
    setTimingsType(activity.timings?.type === 'specific' ? 'specific' : '24_7');
    setSpecificTimings(activity.timings?.times ? activity.timings.times.join(', ') : '');
    setAvailableDays(Array.isArray(activity.available_days) ? activity.available_days.join(', ') : '');
    setAvailableSeasons(Array.isArray(activity.available_seasons) ? activity.available_seasons.join(', ') : '');
    setDisclaimer(activity.disclaimer || '');
    setRulesRegulations(activity.rules_regulations || '');
    setBookingRequired(activity.booking_required);
    setBookingType(activity.booking_type as 'online' | 'reception' | 'both' || 'reception');
    setTags(Array.isArray(activity.tags) ? activity.tags.join(', ') : '');
    setAudienceTags(Array.isArray(activity.audience_tags) ? activity.audience_tags.join(', ') : '');
    setActivityTags(Array.isArray(activity.activity_tags) ? activity.activity_tags.join(', ') : '');
    setMediaUrls(Array.isArray(activity.media_urls) ? activity.media_urls.join(', ') : '');
    setEditingActivity(activity);
    setShowForm(true);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && activity.is_active) || 
      (statusFilter === 'inactive' && !activity.is_active);
    const matchesProperty = propertyFilter === 'all' ||
      (propertyFilter === 'on_property' && activity.is_on_property) ||
      (propertyFilter === 'off_property' && !activity.is_on_property);
    return matchesSearch && matchesStatus && matchesProperty;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-3xl font-bold">Activities Management</h1>
        </div>
        
        {!showForm && (
          <Button onClick={() => {resetForm(); setShowForm(true);}} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Activity
          </Button>
        )}
      </div>


      {/* Activity Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="locationName">Location</Label>
                    <Input
                      id="locationName"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g., Pool Area, Garden"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="distance">Distance from Property</Label>
                    <Input
                      id="distance"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="e.g., On Property, 2 km away"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isOnProperty"
                      checked={isOnProperty}
                      onChange={(e) => setIsOnProperty(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="isOnProperty">On Property</Label>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priceType">Price Type</Label>
                    <Select value={priceType} onValueChange={(value: 'free' | 'fixed' | 'range') => setPriceType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="range">Price Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {priceType === 'fixed' && (
                    <div>
                      <Label htmlFor="priceAmount">Price Amount</Label>
                      <Input
                        id="priceAmount"
                        type="number"
                        value={priceAmount}
                        onChange={(e) => setPriceAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  )}
                  {priceType === 'range' && (
                    <>
                      <div>
                        <Label htmlFor="priceRangeMin">Min Price</Label>
                        <Input
                          id="priceRangeMin"
                          type="number"
                          value={priceRangeMin}
                          onChange={(e) => setPriceRangeMin(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priceRangeMax">Max Price</Label>
                        <Input
                          id="priceRangeMax"
                          type="number"
                          value={priceRangeMax}
                          onChange={(e) => setPriceRangeMax(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Duration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="durationHours">Duration (Hours)</Label>
                    <Input
                      id="durationHours"
                      type="number"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="durationMinutes">Duration (Minutes)</Label>
                    <Input
                      id="durationMinutes"
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Timing & Availability */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Timing & Availability</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timingsType">Timings</Label>
                    <Select value={timingsType} onValueChange={(value: '24_7' | 'specific') => setTimingsType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24_7">24/7 Available</SelectItem>
                        <SelectItem value="specific">Specific Times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {timingsType === 'specific' && (
                    <div>
                      <Label htmlFor="specificTimings">Specific Times (comma-separated)</Label>
                      <Input
                        id="specificTimings"
                        value={specificTimings}
                        onChange={(e) => setSpecificTimings(e.target.value)}
                        placeholder="9:00-17:00, 19:00-21:00"
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="availableDays">Available Days (comma-separated)</Label>
                    <Input
                      id="availableDays"
                      value={availableDays}
                      onChange={(e) => setAvailableDays(e.target.value)}
                      placeholder="monday, tuesday, wednesday (leave empty for all days)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="availableSeasons">Available Seasons (comma-separated)</Label>
                    <Input
                      id="availableSeasons"
                      value={availableSeasons}
                      onChange={(e) => setAvailableSeasons(e.target.value)}
                      placeholder="spring, summer, monsoon, winter (leave empty for all seasons)"
                    />
                  </div>
                </div>
              </div>

              {/* Tags & Categories */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tags & Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="audienceTags">Audience Tags (comma-separated)</Label>
                    <Input
                      id="audienceTags"
                      value={audienceTags}
                      onChange={(e) => setAudienceTags(e.target.value)}
                      placeholder="families, couples, solo, kids, adults, seniors"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activityTags">Activity Tags (comma-separated)</Label>
                    <Input
                      id="activityTags"
                      value={activityTags}
                      onChange={(e) => setActivityTags(e.target.value)}
                      placeholder="adventure, relaxing, cultural, sports"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tags">General Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="adventure, nature, family"
                  />
                </div>
              </div>

              {/* Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Media</h3>
                <div>
                  <Label htmlFor="image">Main Image URL</Label>
                  <Input
                    id="image"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <Label htmlFor="mediaUrls">Additional Media URLs (comma-separated)</Label>
                  <Textarea
                    id="mediaUrls"
                    value={mediaUrls}
                    onChange={(e) => setMediaUrls(e.target.value)}
                    placeholder="https://example.com/image1.jpg, https://example.com/video1.mp4"
                    rows={2}
                  />
                </div>
              </div>

              {/* Legal & Booking */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Legal & Booking</h3>
                <div>
                  <Label htmlFor="disclaimer">Disclaimer</Label>
                  <Textarea
                    id="disclaimer"
                    value={disclaimer}
                    onChange={(e) => setDisclaimer(e.target.value)}
                    rows={2}
                    placeholder="Any disclaimers or warnings for this activity"
                  />
                </div>
                <div>
                  <Label htmlFor="rulesRegulations">Rules & Regulations</Label>
                  <Textarea
                    id="rulesRegulations"
                    value={rulesRegulations}
                    onChange={(e) => setRulesRegulations(e.target.value)}
                    rows={3}
                    placeholder="Rules and regulations for this activity"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bookingType">Booking Method</Label>
                    <Select value={bookingType} onValueChange={(value: 'online' | 'reception' | 'both') => setBookingType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online Only</SelectItem>
                        <SelectItem value="reception">Reception Only</SelectItem>
                        <SelectItem value="both">Both Online & Reception</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="bookingRequired"
                      checked={bookingRequired}
                      onChange={(e) => setBookingRequired(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="bookingRequired">Booking Required</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">{editingActivity ? 'Update' : 'Create'} Activity</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingActivity(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={propertyFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPropertyFilter('all')}
                className="h-8 px-3"
              >
                All
              </Button>
              <Button
                variant={propertyFilter === 'on_property' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPropertyFilter('on_property')}
                className="h-8 px-3"
              >
                On Property
              </Button>
              <Button
                variant={propertyFilter === 'off_property' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPropertyFilter('off_property')}
                className="h-8 px-3"
              >
                Off Property
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.map((activity) => (
                <Card key={activity.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{activity.title}</CardTitle>
                        {activity.description && (
                          <CardDescription className="mt-2">
                            {activity.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={activity.is_active ? "default" : "secondary"}>
                        {activity.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {activity.image && (
                      <img 
                        src={activity.image} 
                        alt={activity.title}
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editActivity(activity)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{activity.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-end gap-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(activity.id)}>
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(activity.id, activity.is_active)}
                      >
                        {activity.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.title}</TableCell>
                    <TableCell>{activity.description || '-'}</TableCell>
                    <TableCell>{activity.distance || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={activity.is_active ? "default" : "secondary"}>
                        {activity.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editActivity(activity)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{activity.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-end gap-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(activity.id)}>
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(activity.id, activity.is_active)}
                        >
                          {activity.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {filteredActivities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No activities found.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivitiesManagement;