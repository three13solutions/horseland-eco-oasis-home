import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Grid, List, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  description?: string;
  distance?: string;
  image?: string;
  is_active: boolean;
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

interface MediaFile {
  url: string;
  name: string;
  isFeatured: boolean;
}

interface FormData {
  title: string;
  description: string;
  distance: string;
  location_name: string;
  is_on_property: boolean;
  price_type: 'free' | 'fixed' | 'range';
  price_amount?: number;
  price_range_min?: number;
  price_range_max?: number;
  duration_hours?: number;
  duration_minutes?: number;
  timings_type: '24_7' | 'specific';
  specific_timings?: string;
  available_days: string[];
  available_seasons: string[];
  disclaimer: string;
  rules_regulations: string;
  booking_type: 'reception' | 'online' | 'both' | 'third_party' | 'no_booking';
  audience_tags: string[];
  activity_tags: string[];
  media_files: MediaFile[];
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SEASONS = ['spring', 'summer', 'monsoon', 'winter'];

// Sample existing tags for autocomplete
const EXISTING_AUDIENCE_TAGS = ['families', 'couples', 'solo', 'kids', 'adults', 'seniors', 'teens', 'groups'];
const EXISTING_ACTIVITY_TAGS = ['adventure', 'relaxing', 'cultural', 'sports', 'nature', 'indoor', 'outdoor', 'educational'];

const ActivitiesManagement = () => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      distance: '',
      location_name: '',
      is_on_property: true,
      price_type: 'free',
      timings_type: '24_7',
      available_days: [],
      available_seasons: [],
      disclaimer: '',
      rules_regulations: '',
      booking_type: 'reception',
      audience_tags: [],
      activity_tags: [],
      media_files: [],
    }
  });

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

  const handleSubmit = async (data: FormData) => {
    try {
      const featuredMedia = data.media_files.find(m => m.isFeatured);
      
      const activityData = {
        title: data.title,
        description: data.description,
        distance: data.is_on_property ? '' : data.distance,
        image: featuredMedia?.url || data.media_files[0]?.url || '',
        location_name: data.location_name,
        is_on_property: data.is_on_property,
        price_type: data.price_type,
        price_amount: data.price_amount || null,
        price_range_min: data.price_range_min || null,
        price_range_max: data.price_range_max || null,
        duration_hours: data.duration_hours || null,
        duration_minutes: data.duration_minutes || null,
        timings: data.timings_type === '24_7' ? { type: '24_7' } : { type: 'specific', times: data.specific_timings?.split(',').map(t => t.trim()) || [] },
        available_days: data.available_days,
        available_seasons: data.available_seasons,
        disclaimer: data.disclaimer,
        rules_regulations: data.rules_regulations,
        booking_type: data.booking_type,
        audience_tags: data.audience_tags,
        activity_tags: data.activity_tags,
        media_urls: data.media_files.map(m => m.url),
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    
    setUploading(true);
    const newMediaFiles: MediaFile[] = [];
    
    try {
      // Import the upload hook functionality inline
      for (const file of Array.from(files)) {
        // Validate file
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast({
            title: "Error",
            description: "Invalid file type. Please select images or videos only.",
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `activity-media/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('activity-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('activity-media')
          .getPublicUrl(filePath);

        // Create entry in gallery_images
        const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        const urlField = mediaType === 'image' ? 'image_url' : 'video_url';
        
        const insertData: any = {
          title: file.name,
          category: 'hotel',
          caption: `Activity media - ${file.name}`,
          media_type: mediaType,
          source_type: 'upload',
          is_hardcoded: false,
        };

        if (mediaType === 'image') {
          insertData.image_url = publicUrl;
        } else {
          insertData.video_url = publicUrl;
          insertData.image_url = '';
        }

        // Get activities category ID
        const { data: activityCategory } = await supabase
          .from('gallery_categories')
          .select('id')
          .eq('slug', 'activities')
          .single();

        if (activityCategory) {
          insertData.category_id = activityCategory.id;
        }

        await supabase
          .from('gallery_images')
          .insert(insertData);

        newMediaFiles.push({
          url: publicUrl,
          name: file.name,
          isFeatured: false
        });
      }

      const currentFiles = form.getValues('media_files');
      form.setValue('media_files', [...currentFiles, ...newMediaFiles]);
      
      toast({
        title: "Success",
        description: `${newMediaFiles.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
    form.reset();
    setEditingActivity(null);
    setShowForm(false);
  };

  const editActivity = (activity: Activity) => {
    const mediaFiles: MediaFile[] = [];
    if (activity.image) {
      mediaFiles.push({ url: activity.image, name: 'Featured Image', isFeatured: true });
    }
    if (Array.isArray(activity.media_urls)) {
      activity.media_urls.forEach((url: string, index: number) => {
        if (url !== activity.image) {
          mediaFiles.push({ url, name: `Media ${index + 1}`, isFeatured: false });
        }
      });
    }

    form.reset({
      title: activity.title,
      description: activity.description || '',
      distance: activity.distance || '',
      location_name: activity.location_name || '',
      is_on_property: activity.is_on_property ?? true,
      price_type: activity.price_type as 'free' | 'fixed' | 'range' || 'free',
      price_amount: activity.price_amount || undefined,
      price_range_min: activity.price_range_min || undefined,
      price_range_max: activity.price_range_max || undefined,
      duration_hours: activity.duration_hours || undefined,
      duration_minutes: activity.duration_minutes || undefined,
      timings_type: activity.timings?.type === 'specific' ? 'specific' : '24_7',
      specific_timings: activity.timings?.times ? activity.timings.times.join(', ') : '',
      available_days: Array.isArray(activity.available_days) ? activity.available_days : [],
      available_seasons: Array.isArray(activity.available_seasons) ? activity.available_seasons : [],
      disclaimer: activity.disclaimer || '',
      rules_regulations: activity.rules_regulations || '',
      booking_type: activity.booking_type as any || 'reception',
      audience_tags: Array.isArray(activity.audience_tags) ? activity.audience_tags : [],
      activity_tags: Array.isArray(activity.activity_tags) ? activity.activity_tags : [],
      media_files: mediaFiles,
    });
    
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <FormControl>
                            <Input {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Pool Area, Garden" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distance from Property</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., 2 km, Walking distance"
                              disabled={form.watch('is_on_property')}
                              className={form.watch('is_on_property') ? 'opacity-50' : ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_on_property"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 pt-8">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>On Property</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Available Days */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Availability</h3>
                  <FormField
                    control={form.control}
                    name="available_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Days</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value.length === DAYS_OF_WEEK.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange(DAYS_OF_WEEK);
                                } else {
                                  field.onChange([]);
                                }
                              }}
                            />
                            <Label>All Days</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value.includes('saturday') && field.value.includes('sunday')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newDays = [...field.value.filter(d => !['saturday', 'sunday'].includes(d)), 'saturday', 'sunday'];
                                  field.onChange(newDays);
                                } else {
                                  field.onChange(field.value.filter(d => !['saturday', 'sunday'].includes(d)));
                                }
                              }}
                            />
                            <Label>Weekends</Label>
                          </div>
                          {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(day)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, day]);
                                  } else {
                                    field.onChange(field.value.filter(d => d !== day));
                                  }
                                }}
                              />
                              <Label className="capitalize">{day}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="available_seasons"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Seasons</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value.length === SEASONS.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange(SEASONS);
                                } else {
                                  field.onChange([]);
                                }
                              }}
                            />
                            <Label>All Seasons</Label>
                          </div>
                          {SEASONS.map((season) => (
                            <div key={season} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(season)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, season]);
                                  } else {
                                    field.onChange(field.value.filter(s => s !== season));
                                  }
                                }}
                              />
                              <Label className="capitalize">{season}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tags</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="audience_tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audience Tags</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                >
                                  {field.value.length > 0 ? `${field.value.length} selected` : "Select audience tags"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search audience tags..." />
                                <CommandList>
                                  <CommandEmpty>No tags found.</CommandEmpty>
                                  <CommandGroup>
                                    {EXISTING_AUDIENCE_TAGS.map((tag) => (
                                      <CommandItem
                                        key={tag}
                                        onSelect={() => {
                                          const currentTags = field.value;
                                          if (currentTags.includes(tag)) {
                                            field.onChange(currentTags.filter(t => t !== tag));
                                          } else {
                                            field.onChange([...currentTags, tag]);
                                          }
                                        }}
                                      >
                                        <Checkbox
                                          checked={field.value.includes(tag)}
                                          className="mr-2"
                                        />
                                        {tag}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                                <X
                                  className="ml-1 h-3 w-3 cursor-pointer"
                                  onClick={() => field.onChange(field.value.filter(t => t !== tag))}
                                />
                              </Badge>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="activity_tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Type Tags</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                >
                                  {field.value.length > 0 ? `${field.value.length} selected` : "Select activity tags"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search activity tags..." />
                                <CommandList>
                                  <CommandEmpty>No tags found.</CommandEmpty>
                                  <CommandGroup>
                                    {EXISTING_ACTIVITY_TAGS.map((tag) => (
                                      <CommandItem
                                        key={tag}
                                        onSelect={() => {
                                          const currentTags = field.value;
                                          if (currentTags.includes(tag)) {
                                            field.onChange(currentTags.filter(t => t !== tag));
                                          } else {
                                            field.onChange([...currentTags, tag]);
                                          }
                                        }}
                                      >
                                        <Checkbox
                                          checked={field.value.includes(tag)}
                                          className="mr-2"
                                        />
                                        {tag}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                                <X
                                  className="ml-1 h-3 w-3 cursor-pointer"
                                  onClick={() => field.onChange(field.value.filter(t => t !== tag))}
                                />
                              </Badge>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Media Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Media</h3>
                  <FormField
                    control={form.control}
                    name="media_files"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Images/Videos</FormLabel>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                          <div className="text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-4">
                              <label htmlFor="media-upload" className="cursor-pointer">
                                <span className="mt-2 block text-sm font-medium text-gray-900">
                                  {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                                </span>
                                <input
                                  id="media-upload"
                                  type="file"
                                  multiple
                                  accept="image/*,video/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e.target.files)}
                                  disabled={uploading}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        {field.value.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {field.value.map((file, index) => (
                              <div key={index} className="relative border rounded-lg p-2">
                                <img 
                                  src={file.url} 
                                  alt={file.name}
                                  className="w-full h-24 object-cover rounded"
                                />
                                <div className="absolute top-1 right-1 flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={file.isFeatured ? "default" : "outline"}
                                    onClick={() => {
                                      const newFiles = field.value.map((f, i) => ({
                                        ...f,
                                        isFeatured: i === index
                                      }));
                                      field.onChange(newFiles);
                                    }}
                                    className="h-6 w-6 p-0 text-xs"
                                  >
                                    ★
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      field.onChange(field.value.filter((_, i) => i !== index));
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-xs mt-1 truncate">{file.name}</p>
                                {file.isFeatured && <p className="text-xs text-blue-600">Featured</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Booking Method */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Booking Information</h3>
                  <FormField
                    control={form.control}
                    name="booking_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="reception">At Reception</SelectItem>
                            <SelectItem value="online">Online (Prior Only)</SelectItem>
                            <SelectItem value="both">Both Reception & Online</SelectItem>
                            <SelectItem value="third_party">Third Party Vendor</SelectItem>
                            <SelectItem value="no_booking">No Advance Booking Required</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="fixed">Fixed Price</SelectItem>
                              <SelectItem value="range">Price Range</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('price_type') === 'fixed' && (
                      <FormField
                        control={form.control}
                        name="price_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {form.watch('price_type') === 'range' && (
                      <>
                        <FormField
                          control={form.control}
                          name="price_range_min"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="price_range_max"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Duration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="duration_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Timing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Timing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timings_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timings</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="24_7">24/7 Available</SelectItem>
                              <SelectItem value="specific">Specific Times</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('timings_type') === 'specific' && (
                      <FormField
                        control={form.control}
                        name="specific_timings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specific Times (comma-separated)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="9:00-17:00, 19:00-21:00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Legal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Legal Information</h3>
                  <FormField
                    control={form.control}
                    name="disclaimer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disclaimer</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Any disclaimers or warnings for this activity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rules_regulations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rules & Regulations</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Rules and regulations for this activity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={uploading}>{editingActivity ? 'Update' : 'Create'} Activity</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">No activities found matching your criteria.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivitiesManagement;