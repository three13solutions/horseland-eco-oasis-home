import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Search, 
  Plus, 
  Edit, 
  CreditCard, 
  FileText, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  IdCard,
  AlertTriangle,
  Eye,
  History,
  Wallet,
  ArrowLeft,
  Grid,
  List,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ImageUpload from '@/components/ImageUpload';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  nationality: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  special_requirements: string;
  is_blacklisted: boolean;
  blacklist_reason: string;
  created_at: string;
  updated_at: string;
}

interface GuestDocument {
  id: string;
  document_type: string;
  document_number: string;
  document_image_url: string;
  is_verified: boolean;
  verified_at: string;
  expiry_date: string;
  notes: string;
}

interface GuestBooking {
  id: string;
  booking_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  guest_id: string;
}

interface CreditNote {
  id: string;
  amount: number;
  reason: string;
  expires_at: string;
  is_redeemed: boolean;
  redeemed_amount: number;
  redeemed_at: string;
  created_at: string;
}

export default function GuestManagement() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [guestDocuments, setGuestDocuments] = useState<GuestDocument[]>([]);
  const [guestBookings, setGuestBookings] = useState<GuestBooking[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [allBookings, setAllBookings] = useState<GuestBooking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active-stay');
  const { toast } = useToast();

  // Guest form state
  const [guestForm, setGuestForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    special_requirements: '',
    is_blacklisted: false,
    blacklist_reason: ''
  });

  // Document form state
  const [documentForm, setDocumentForm] = useState({
    document_type: '',
    document_number: '',
    expiry_date: '',
    document_image_url: '',
    notes: ''
  });

  // Load guests and all bookings
  useEffect(() => {
    loadGuests();
    loadAllBookings();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (error: any) {
      console.error('Error loading guests:', error);
      toast({
        title: "Error",
        description: "Failed to load guests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('check_in', { ascending: false });

      if (error) throw error;
      setAllBookings(data || []);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadGuestDetails = async (guestId: string) => {
    try {
      // Load documents
      const { data: docs } = await supabase
        .from('guest_identity_documents')
        .select('*')
        .eq('guest_id', guestId);

      // Load bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false });

      // Load credit notes for this specific guest
      const { data: credits } = await supabase
        .from('guest_credit_notes')
        .select('*')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false });

      setGuestDocuments(docs || []);
      setGuestBookings(bookings || []);
      setCreditNotes(credits || []);
    } catch (error: any) {
      console.error('Error loading guest details:', error);
      toast({
        title: "Error",
        description: "Failed to load guest details",
        variant: "destructive",
      });
    }
  };

  const handleGuestSelect = async (guest: Guest) => {
    setSelectedGuest(guest);
    setShowGuestDetails(true);
    await loadGuestDetails(guest.id);
  };

  const createCreditNote = async (guestId: string, amount: number, reason: string, expiryDate: string) => {
    try {
      const { error } = await supabase
        .from('guest_credit_notes')
        .insert([{
          guest_id: guestId,
          amount,
          reason,
          expires_at: expiryDate,
        }]);

      if (error) throw error;

      toast({
        title: "Credit Note Created",
        description: `₹${amount} credit added to guest wallet`,
      });

      // Reload credit notes for the selected guest
      if (selectedGuest) {
        await loadGuestDetails(selectedGuest.id);
      }
      setShowCreditDialog(false);
    } catch (error: any) {
      console.error('Error creating credit note:', error);
      toast({
        title: "Error",
        description: "Failed to create credit note",
        variant: "destructive",
      });
    }
  };

  const createDocument = async () => {
    if (!selectedGuest) return;

    try {
      const { error } = await supabase
        .from('guest_identity_documents')
        .insert({
          guest_id: selectedGuest.id,
          document_type: documentForm.document_type,
          document_number: documentForm.document_number,
          expiry_date: documentForm.expiry_date || null,
          document_image_url: documentForm.document_image_url || null,
          notes: documentForm.notes || null,
        });

      if (error) throw error;

      toast({
        title: "Document Added",
        description: "Identity document has been added successfully.",
      });

      // Reload guest details
      await loadGuestDetails(selectedGuest.id);
      setShowDocumentDialog(false);
      setDocumentForm({
        document_type: '',
        document_number: '',
        expiry_date: '',
        document_image_url: '',
        notes: ''
      });
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: "Failed to add document",
        variant: "destructive",
      });
    }
  };

  const handleAddGuest = () => {
    setEditingGuest(null);
    setGuestForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      nationality: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      special_requirements: '',
      is_blacklisted: false,
      blacklist_reason: ''
    });
    setShowGuestDialog(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestForm({
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email || '',
      phone: guest.phone || '',
      address: guest.address || '',
      date_of_birth: guest.date_of_birth || '',
      nationality: guest.nationality || '',
      emergency_contact_name: guest.emergency_contact_name || '',
      emergency_contact_phone: guest.emergency_contact_phone || '',
      special_requirements: guest.special_requirements || '',
      is_blacklisted: guest.is_blacklisted,
      blacklist_reason: guest.blacklist_reason || ''
    });
    setShowGuestDialog(true);
  };

  const saveGuest = async () => {
    try {
      if (editingGuest) {
        // Update existing guest
        const { error } = await supabase
          .from('guests')
          .update(guestForm)
          .eq('id', editingGuest.id);

        if (error) throw error;

        toast({
          title: "Guest Updated",
          description: "Guest information has been updated successfully.",
        });
      } else {
        // Create new guest
        const { error } = await supabase
          .from('guests')
          .insert([guestForm]);

        if (error) throw error;

        toast({
          title: "Guest Added",
          description: "New guest has been added successfully.",
        });
      }

      setShowGuestDialog(false);
      loadGuests();
    } catch (error: any) {
      console.error('Error saving guest:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save guest",
        variant: "destructive",
      });
    }
  };

  // Filter guests based on search term
  const searchFilteredGuests = guests.filter(guest =>
    `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.phone?.includes(searchTerm)
  );

  // Get booking status for a guest
  const getGuestBookingStatus = (guestId: string) => {
    const guestBookings = allBookings.filter(booking => 
      booking.guest_id === guestId && 
      booking.payment_status !== 'cancelled'
    );
    
    if (guestBookings.length === 0) return 'no-bookings';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check for active stay (check-in <= today <= check-out)
    const activeBooking = guestBookings.find(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      return checkIn <= today && checkOut >= today;
    });
    
    if (activeBooking) return 'active-stay';
    
    // Check for upcoming bookings
    const upcomingBooking = guestBookings.find(booking => {
      const checkIn = new Date(booking.check_in);
      checkIn.setHours(0, 0, 0, 0);
      return checkIn > today;
    });
    
    if (upcomingBooking) return 'upcoming';
    
    return 'past';
  };

  // Filter guests based on active tab
  const getFilteredGuests = () => {
    let filtered = searchFilteredGuests;
    
    if (activeTab === 'active-stay') {
      filtered = searchFilteredGuests.filter(guest => 
        getGuestBookingStatus(guest.id) === 'active-stay'
      );
    } else if (activeTab === 'upcoming') {
      filtered = searchFilteredGuests.filter(guest => 
        getGuestBookingStatus(guest.id) === 'upcoming'
      );
    }
    // 'all-guests' shows all searchFilteredGuests
    
    return filtered;
  };

  const filteredGuests = getFilteredGuests();

  // Calculate available credit for the currently selected guest only
  const getAvailableCredit = (creditNotes: CreditNote[]) => {
    return creditNotes
      .filter(note => !note.is_redeemed && new Date(note.expires_at) > new Date())
      .reduce((sum, note) => sum + (note.amount - note.redeemed_amount), 0);
  };

  const getDocumentStatusBadge = (docs: GuestDocument[]) => {
    const verifiedDocs = docs.filter(doc => doc.is_verified).length;
    const totalDocs = docs.length;
    
    if (totalDocs === 0) {
      return <Badge variant="secondary">No Documents</Badge>;
    }
    
    if (verifiedDocs === totalDocs) {
      return <Badge variant="default">Verified ({verifiedDocs}/{totalDocs})</Badge>;
    }
    
    return <Badge variant="outline">Partial ({verifiedDocs}/{totalDocs})</Badge>;
  };

  // Guest List Content Component
  const GuestListContent = () => (
    <>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Tab Filter */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'active-stay' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('active-stay')}
          >
            Active Stay
          </Button>
          <Button
            variant={activeTab === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={activeTab === 'all-guests' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all-guests')}
          >
            All Guests
          </Button>
        </div>
        
        {/* Search and View Controls */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-72"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Guest List Content */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.map((guest) => (
            <Card key={guest.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{guest.first_name} {guest.last_name}</CardTitle>
                    <Badge variant="outline" className="text-xs capitalize">
                      {getGuestBookingStatus(guest.id).replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {guest.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                  )}
                  {guest.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {guest.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(guest.created_at), 'MMM yyyy')}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  {guest.is_blacklisted && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Blacklisted
                    </Badge>
                  )}
                  <Button onClick={() => handleGuestSelect(guest)} className="ml-auto">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Booking Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">
                    {guest.first_name} {guest.last_name}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {guest.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {guest.email}
                        </div>
                      )}
                      {guest.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {guest.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {getGuestBookingStatus(guest.id).replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(guest.created_at), 'MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    {guest.is_blacklisted ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Blacklisted
                      </Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleGuestSelect(guest)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredGuests.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No guests found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'No guests match your search criteria.' 
                : activeTab === 'active-stay' 
                ? 'No guests currently staying at the property.'
                : activeTab === 'upcoming'
                ? 'No guests with upcoming bookings.'
                : 'Start by adding your first guest.'
              }
            </p>
            {!searchTerm && activeTab === 'all-guests' && (
              <Button onClick={() => handleAddGuest()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Guest
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );

  // Guest Details Content Component
  const GuestDetailsContent = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Guest Profile */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Guest Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-sm">{selectedGuest?.first_name} {selectedGuest?.last_name}</p>
            </div>
            
            {selectedGuest?.email && (
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {selectedGuest.email}
                </p>
              </div>
            )}
            
            {selectedGuest?.phone && (
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-sm flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {selectedGuest.phone}
                </p>
              </div>
            )}
            
            {selectedGuest?.address && (
              <div>
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedGuest.address}
                </p>
              </div>
            )}
            
            {selectedGuest?.date_of_birth && (
              <div>
                <Label className="text-sm font-medium">Date of Birth</Label>
                <p className="text-sm">{format(new Date(selectedGuest.date_of_birth), 'PPP')}</p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEditGuest(selectedGuest!)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreditDialog(true)}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Add Credit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                Identity Documents
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDocumentDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {guestDocuments.map((doc) => (
                <div key={doc.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium capitalize">
                        {doc.document_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_number}
                      </p>
                      {doc.expiry_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(new Date(doc.expiry_date), 'PPP')}
                        </p>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant={doc.is_verified ? 'default' : 'secondary'}>
                      {doc.is_verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  {doc.document_image_url && (
                    <div className="mt-2">
                      <img 
                        src={doc.document_image_url} 
                        alt="Document" 
                        className="w-full h-20 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {guestDocuments.length === 0 && (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit Wallet */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Credit Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">
                  ₹{getAvailableCredit(creditNotes).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Available Credit</p>
              </div>
              
              <div className="space-y-2">
                {creditNotes.slice(0, 3).map((credit) => (
                  <div key={credit.id} className="border rounded p-2">
                    <div className="flex justify-between">
                      <span className="font-medium">₹{credit.amount}</span>
                      <Badge variant={credit.is_redeemed ? 'secondary' : 'default'}>
                        {credit.is_redeemed ? 'Redeemed' : 'Active'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{credit.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires: {format(new Date(credit.expires_at), 'PPP')}
                    </p>
                  </div>
                ))}
                
                {creditNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No credit notes found
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Booking History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guestBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.booking_id}</TableCell>
                  <TableCell>{format(new Date(booking.check_in), 'PPP')}</TableCell>
                  <TableCell>{format(new Date(booking.check_out), 'PPP')}</TableCell>
                  <TableCell>{booking.guests_count}</TableCell>
                  <TableCell>₹{booking.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        booking.payment_status === 'confirmed' ? 'default' :
                        booking.payment_status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {booking.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(booking.created_at), 'PPP')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {guestBookings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bookings found for this guest</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guest Management</h1>
          <p className="text-muted-foreground">
            Manage guest profiles, identity documents, booking history, and credit wallet
          </p>
        </div>
        <Button onClick={() => handleAddGuest()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>

      <div className="space-y-4">
        <GuestListContent />
      </div>

      {/* Guest Details Modal/Overlay */}
      <Dialog open={showGuestDetails} onOpenChange={setShowGuestDetails}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Guest Details - {selectedGuest?.first_name} {selectedGuest?.last_name}
            </DialogTitle>
          </DialogHeader>
          <GuestDetailsContent />
        </DialogContent>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Note</DialogTitle>
            <DialogDescription>
              Add a credit note to {selectedGuest?.first_name} {selectedGuest?.last_name}'s account
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const amount = parseFloat(formData.get('amount') as string);
              const reason = formData.get('reason') as string;
              const expiryDate = formData.get('expiryDate') as string;
              
              if (selectedGuest) {
                createCreditNote(selectedGuest.id, amount, reason, expiryDate);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Enter credit amount"
              />
            </div>
            
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                name="reason"
                required
                placeholder="Reason for credit (e.g., Cancellation refund, Compensation, etc.)"
              />
            </div>
            
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                name="expiryDate"
                type="date"
                required
                min={format(new Date(), 'yyyy-MM-dd')}
                defaultValue={format(new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Credit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Guest Dialog */}
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? 'Edit Guest' : 'Add New Guest'}
            </DialogTitle>
            <DialogDescription>
              {editingGuest 
                ? 'Update guest information and details.'
                : 'Add a new guest to the system with their personal information.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={guestForm.first_name}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={guestForm.last_name}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestForm.email}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={guestForm.phone}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Address and Personal Details */}
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={guestForm.address}
                onChange={(e) => setGuestForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={guestForm.date_of_birth}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={guestForm.nationality}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="Enter nationality"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={guestForm.emergency_contact_name}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={guestForm.emergency_contact_phone}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>

            {/* Special Requirements */}
            <div>
              <Label htmlFor="special_requirements">Special Requirements</Label>
              <Textarea
                id="special_requirements"
                value={guestForm.special_requirements}
                onChange={(e) => setGuestForm(prev => ({ ...prev, special_requirements: e.target.value }))}
                placeholder="Any special requirements or notes"
                rows={3}
              />
            </div>

            {/* Blacklist Section */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_blacklisted"
                  checked={guestForm.is_blacklisted}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, is_blacklisted: e.target.checked }))}
                />
                <Label htmlFor="is_blacklisted" className="font-medium text-destructive">
                  Blacklist this guest
                </Label>
              </div>
              {guestForm.is_blacklisted && (
                <div>
                  <Label htmlFor="blacklist_reason">Blacklist Reason *</Label>
                  <Textarea
                    id="blacklist_reason"
                    value={guestForm.blacklist_reason}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, blacklist_reason: e.target.value }))}
                    placeholder="Enter reason for blacklisting this guest"
                    required={guestForm.is_blacklisted}
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowGuestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveGuest} disabled={!guestForm.first_name || !guestForm.last_name}>
                {editingGuest ? 'Update Guest' : 'Add Guest'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Identity Document</DialogTitle>
            <DialogDescription>
              Add a new identity document for {selectedGuest?.first_name} {selectedGuest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="document_type">Document Type</Label>
                <Select 
                  value={documentForm.document_type} 
                  onValueChange={(value) => 
                    setDocumentForm(prev => ({ ...prev, document_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="aadhar">Aadhar Card</SelectItem>
                    <SelectItem value="pan">PAN Card</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                    <SelectItem value="voter_id">Voter ID</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="document_number">Document Number</Label>
                <Input
                  id="document_number"
                  value={documentForm.document_number}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, document_number: e.target.value }))}
                  placeholder="Enter document number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
              <Input
                id="expiry_date"
                type="date"
                value={documentForm.expiry_date}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
            <div>
              <ImageUpload
                label="Document Image"
                value={documentForm.document_image_url}
                onChange={(url) => setDocumentForm(prev => ({ ...prev, document_image_url: url }))}
                bucketName="uploads"
                folder="documents"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={documentForm.notes}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this document"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createDocument}>
                Add Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}