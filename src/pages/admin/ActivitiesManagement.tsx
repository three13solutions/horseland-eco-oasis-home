import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Eye, Edit, Trash2, ToggleLeft, ToggleRight, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, DialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivityType {
  id: string;
  name: string;
  description?: string;
  is_published: boolean;
}

interface Activity {
  id: string;
  name: string;
  description?: string;
  duration?: string;
  location?: string;
  price?: number;
  rating?: number;
  image_url?: string;
  activity_type_id: string;
  age_group?: string;
  is_published: boolean;
  activity_type?: ActivityType;
}

const ActivitiesManagement = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Activity Types State
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeDescription, setTypeDescription] = useState('');

  // Activities State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityLocation, setActivityLocation] = useState('');
  const [activityPrice, setActivityPrice] = useState('');
  const [activityRating, setActivityRating] = useState('');
  const [activityImageUrl, setActivityImageUrl] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [activityAgeGroup, setActivityAgeGroup] = useState('');

  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadActivityTypes();
    loadActivities();
  }, []);

  const loadActivityTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setActivityTypes(data || []);
    } catch (error) {
      console.error('Error loading activity types:', error);
      toast({
        title: "Error",
        description: "Failed to load activity types",
        variant: "destructive",
      });
    }
  };

  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          activity_type:activity_types(*)
        `)
        .order('name');
      
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

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const typeData = {
        name: typeName,
        description: typeDescription,
        is_published: true
      };

      if (editingType) {
        const { error } = await supabase
          .from('activity_types')
          .update(typeData)
          .eq('id', editingType.id);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Activity type updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('activity_types')
          .insert([typeData]);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Activity type created successfully",
        });
      }

      resetTypeForm();
      loadActivityTypes();
    } catch (error) {
      console.error('Error saving activity type:', error);
      toast({
        title: "Error",
        description: "Failed to save activity type",
        variant: "destructive",
      });
    }
  };

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activityData = {
        name: activityName,
        description: activityDescription,
        duration: activityDuration || null,
        location: activityLocation || null,
        price: activityPrice ? parseFloat(activityPrice) : null,
        rating: activityRating ? parseFloat(activityRating) : null,
        image_url: activityImageUrl || null,
        activity_type_id: activityTypeId,
        age_group: activityAgeGroup || null,
        is_published: true
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

      resetActivityForm();
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

  const handleDeleteType = async (id: string) => {
    try {
      // Check if any activities are using this type
      const { data: activitiesUsingType } = await supabase
        .from('activities')
        .select('id')
        .eq('activity_type_id', id);

      if (activitiesUsingType && activitiesUsingType.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This activity type is being used by existing activities",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('activity_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Activity type deleted successfully",
      });
      loadActivityTypes();
    } catch (error) {
      console.error('Error deleting activity type:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity type",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (id: string) => {
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

  const toggleTypePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('activity_types')
        .update({ is_published: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Activity type ${!currentStatus ? 'published' : 'unpublished'} successfully`,
      });
      loadActivityTypes();
    } catch (error) {
      console.error('Error toggling activity type status:', error);
      toast({
        title: "Error",
        description: "Failed to update activity type status",
        variant: "destructive",
      });
    }
  };

  const toggleActivityPublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_published: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Activity ${!currentStatus ? 'published' : 'unpublished'} successfully`,
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

  const resetTypeForm = () => {
    setTypeName('');
    setTypeDescription('');
    setEditingType(null);
    setShowTypeForm(false);
  };

  const resetActivityForm = () => {
    setActivityName('');
    setActivityDescription('');
    setActivityDuration('');
    setActivityLocation('');
    setActivityPrice('');
    setActivityRating('');
    setActivityImageUrl('');
    setActivityTypeId('');
    setActivityAgeGroup('');
    setEditingActivity(null);
    setShowActivityForm(false);
  };

  const editType = (type: ActivityType) => {
    setTypeName(type.name);
    setTypeDescription(type.description || '');
    setEditingType(type);
    setShowTypeForm(true);
  };

  const editActivity = (activity: Activity) => {
    setActivityName(activity.name);
    setActivityDescription(activity.description || '');
    setActivityDuration(activity.duration || '');
    setActivityLocation(activity.location || '');
    setActivityPrice(activity.price?.toString() || '');
    setActivityRating(activity.rating?.toString() || '');
    setActivityImageUrl(activity.image_url || '');
    setActivityTypeId(activity.activity_type_id);
    setActivityAgeGroup(activity.age_group || '');
    setEditingActivity(activity);
    setShowActivityForm(true);
  };

  const filteredTypes = activityTypes.filter(type => {
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && type.is_published) || 
      (statusFilter === 'draft' && !type.is_published);
    return matchesSearch && matchesStatus;
  });

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && activity.is_published) || 
      (statusFilter === 'draft' && !activity.is_published);
    return matchesSearch && matchesStatus;
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
      <div className="mb-8">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Activities Management</h1>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {!showTypeForm && !showActivityForm && (
          <>
            {activeTab === 'types' && (
              <Button onClick={() => {resetTypeForm(); setShowTypeForm(true);}} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Activity Type
              </Button>
            )}
            
            {activeTab === 'activities' && (
              <Button onClick={() => {resetActivityForm(); setShowActivityForm(true);}} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Activity
              </Button>
            )}
          </>
        )}
      </div>

      {/* Activity Type Form */}
      {showTypeForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingType ? 'Edit Activity Type' : 'Add New Activity Type'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="typeName">Name *</Label>
                  <Input
                    id="typeName"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="typeDescription">Description</Label>
                <Textarea
                  id="typeDescription"
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingType ? 'Update' : 'Create'} Activity Type</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowTypeForm(false);
                    setEditingType(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Activity Form */}
      {showActivityForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivitySubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="activityName">Name *</Label>
                  <Input
                    id="activityName"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="activityTypeId">Activity Type *</Label>
                  <Select value={activityTypeId} onValueChange={setActivityTypeId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="activityDuration">Duration</Label>
                  <Input
                    id="activityDuration"
                    value={activityDuration}
                    onChange={(e) => setActivityDuration(e.target.value)}
                    placeholder="e.g., 2 hours"
                  />
                </div>
                <div>
                  <Label htmlFor="activityLocation">Location</Label>
                  <Input
                    id="activityLocation"
                    value={activityLocation}
                    onChange={(e) => setActivityLocation(e.target.value)}
                    placeholder="e.g., On Property"
                  />
                </div>
                <div>
                  <Label htmlFor="activityAgeGroup">Age Group</Label>
                  <Select value={activityAgeGroup} onValueChange={setActivityAgeGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="adult">Adult</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="activityPrice">Price (₹)</Label>
                  <Input
                    id="activityPrice"
                    type="number"
                    value={activityPrice}
                    onChange={(e) => setActivityPrice(e.target.value)}
                    placeholder="1500"
                  />
                </div>
                <div>
                  <Label htmlFor="activityRating">Rating (1-5)</Label>
                  <Input
                    id="activityRating"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={activityRating}
                    onChange={(e) => setActivityRating(e.target.value)}
                    placeholder="4.5"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="activityDescription">Description</Label>
                <Textarea
                  id="activityDescription"
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="activityImageUrl">Image URL</Label>
                <Input
                  id="activityImageUrl"
                  value={activityImageUrl}
                  onChange={(e) => setActivityImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingActivity ? 'Update' : 'Create'} Activity</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowActivityForm(false);
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

      {!showTypeForm && !showActivityForm && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="types">Activity Types</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 mb-6">
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
                  placeholder={activeTab === 'types' ? 'Search activity types...' : 'Search activities...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <TabsContent value="types">
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTypes.map((type) => (
                  <Card key={type.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{type.name}</CardTitle>
                          {type.description && (
                            <CardDescription className="mt-2">
                              {type.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant={type.is_published ? "default" : "secondary"}>
                          {type.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editType(type)}
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
                                <AlertDialogTitle>Delete Activity Type</AlertDialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{type.name}"? This action cannot be undone.
                                </DialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteType(type.id)}>
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTypePublish(type.id, type.is_published)}
                        >
                          {type.is_published ? (
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
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={type.is_published ? "default" : "secondary"}>
                          {type.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editType(type)}
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
                                <AlertDialogTitle>Delete Activity Type</AlertDialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{type.name}"? This action cannot be undone.
                                </DialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteType(type.id)}>
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTypePublish(type.id, type.is_published)}
                          >
                            {type.is_published ? (
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
            
            {filteredTypes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No activity types found.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities">
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map((activity) => (
                  <Card key={activity.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{activity.name}</CardTitle>
                          <CardDescription className="mt-2">
                            Type: {activity.activity_type?.name}
                            {activity.duration && <span> • {activity.duration}</span>}
                            {activity.price && <span> • ₹{activity.price}</span>}
                          </CardDescription>
                        </div>
                        <Badge variant={activity.is_published ? "default" : "secondary"}>
                          {activity.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {activity.image_url && (
                        <img 
                          src={activity.image_url} 
                          alt={activity.name}
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {activity.description}
                        </p>
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
                                <DialogDescription>
                                  Are you sure you want to delete "{activity.name}"? This action cannot be undone.
                                </DialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteActivity(activity.id)}>
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActivityPublish(activity.id, activity.is_published)}
                        >
                          {activity.is_published ? (
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>{activity.activity_type?.name}</TableCell>
                      <TableCell>{activity.duration || '-'}</TableCell>
                      <TableCell>{activity.price ? `₹${activity.price}` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={activity.is_published ? "default" : "secondary"}>
                          {activity.is_published ? 'Published' : 'Draft'}
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
                                <DialogDescription>
                                  Are you sure you want to delete "{activity.name}"? This action cannot be undone.
                                </DialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteActivity(activity.id)}>
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActivityPublish(activity.id, activity.is_published)}
                          >
                            {activity.is_published ? (
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ActivitiesManagement;