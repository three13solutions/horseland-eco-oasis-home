import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
  const [guestDocuments, setGuestDocuments] = useState<GuestDocument[]>([]);
  const [guestBookings, setGuestBookings] = useState<GuestBooking[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const { toast } = useToast();

  // Load guests
  useEffect(() => {
    loadGuests();
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

      // Load credit notes
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
    setActiveTab('details');
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

      // Reload credit notes
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

  const filteredGuests = guests.filter(guest =>
    `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.phone?.includes(searchTerm)
  );

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guest Management</h1>
          <p className="text-muted-foreground">
            Manage guest profiles, identity documents, booking history, and credit wallet
          </p>
        </div>
        <Button onClick={() => setShowGuestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Guest List</TabsTrigger>
          {selectedGuest && (
            <TabsTrigger value="details">Guest Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Guests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guests Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Guests ({filteredGuests.length})</CardTitle>
              <CardDescription>
                Click on a guest to view their complete profile and booking history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Total Bookings</TableHead>
                    <TableHead>Credit Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => {
                    const guestBookingCount = guestBookings.length; // This would need to be calculated per guest
                    const creditBalance = getAvailableCredit(creditNotes); // This would need to be calculated per guest
                    
                    return (
                      <TableRow
                        key={guest.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleGuestSelect(guest)}
                      >
                        <TableCell>
                          <div className="font-medium">
                            {guest.first_name} {guest.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Joined {format(new Date(guest.created_at), 'MMM yyyy')}
                          </div>
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
                          {getDocumentStatusBadge(guestDocuments)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{guestBookingCount}</Badge>
                        </TableCell>
                        <TableCell>
                          {creditBalance > 0 && (
                            <Badge variant="secondary">
                              ₹{creditBalance.toLocaleString()}
                            </Badge>
                          )}
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
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGuestSelect(guest);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {selectedGuest && (
          <TabsContent value="details" className="space-y-4">
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
                    <p className="text-sm">{selectedGuest.first_name} {selectedGuest.last_name}</p>
                  </div>
                  
                  {selectedGuest.email && (
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedGuest.email}
                      </p>
                    </div>
                  )}
                  
                  {selectedGuest.phone && (
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedGuest.phone}
                      </p>
                    </div>
                  )}
                  
                  {selectedGuest.address && (
                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <p className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedGuest.address}
                      </p>
                    </div>
                  )}
                  
                  {selectedGuest.date_of_birth && (
                    <div>
                      <Label className="text-sm font-medium">Date of Birth</Label>
                      <p className="text-sm">{format(new Date(selectedGuest.date_of_birth), 'PPP')}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
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
                  <CardTitle className="flex items-center gap-2">
                    <IdCard className="h-5 w-5" />
                    Identity Documents
                  </CardTitle>
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
                          </div>
                          <Badge variant={doc.is_verified ? 'default' : 'secondary'}>
                            {doc.is_verified ? 'Verified' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {guestDocuments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No documents uploaded
                      </p>
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
          </TabsContent>
        )}
      </Tabs>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Note</DialogTitle>
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
    </div>
  );
}