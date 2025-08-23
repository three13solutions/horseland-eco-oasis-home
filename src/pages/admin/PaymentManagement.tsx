import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Search, 
  Filter, 
  ArrowLeft, 
  Eye, 
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Banknote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_reference: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  status: string;
  notes: string;
  invoices?: {
    invoice_number: string;
  };
  bookings?: {
    booking_id: string;
    guest_name: string;
    guest_email: string;
  };
  admin_profiles?: {
    email: string;
  } | null;
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  cashPayments: number;
  onlinePayments: number;
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    cashPayments: 0,
    onlinePayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthentication();
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, methodFilter, statusFilter, dateFilter]);

  const checkAuthentication = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (!profile) {
        toast({
          title: "Access denied",
          description: "Admin privileges required.",
          variant: "destructive"
        });
        navigate('/admin/login');
        return;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/admin/login');
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices (
            invoice_number
          ),
          bookings (
            booking_id,
            guest_name,
            guest_email
          ),
          admin_profiles:received_by (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments((data || []) as unknown as Payment[]);
      calculateStats((data || []) as unknown as Payment[]);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: Payment[]) => {
    const totalPayments = paymentsData.length;
    const totalAmount = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
    const cashPayments = paymentsData.filter(payment => payment.payment_method === 'cash').length;
    const onlinePayments = paymentsData.filter(payment => 
      ['card', 'upi', 'net_banking', 'razorpay'].includes(payment.payment_method)
    ).length;

    setStats({
      totalPayments,
      totalAmount,
      cashPayments,
      onlinePayments,
    });
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.bookings?.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.bookings?.booking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.invoices?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === methodFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(payment => 
            new Date(payment.payment_date) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(payment => 
            new Date(payment.payment_date) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(payment => 
            new Date(payment.payment_date) >= filterDate
          );
          break;
      }
    }

    setFilteredPayments(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const methodColors = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      upi: 'bg-purple-100 text-purple-800',
      net_banking: 'bg-indigo-100 text-indigo-800',
      razorpay: 'bg-orange-100 text-orange-800',
    };

    const methodLabels = {
      cash: 'Cash',
      card: 'Card',
      upi: 'UPI',
      net_banking: 'Net Banking',
      razorpay: 'Razorpay',
    };

    return (
      <Badge className={methodColors[method as keyof typeof methodColors] || methodColors.cash}>
        {methodLabels[method as keyof typeof methodLabels] || method.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-serif font-semibold">Payment Management</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
              <p className="text-xs text-muted-foreground">
                All payment transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total payments received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cashPayments}</div>
              <p className="text-xs text-muted-foreground">
                Cash transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onlinePayments}</div>
              <p className="text-xs text-muted-foreground">
                Digital transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments, guests, transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="net_banking">Net Banking</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payments ({filteredPayments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || methodFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? 'No payments match your filters'
                    : 'No payments found'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Transaction Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/50">
                        <TableCell>
                          {format(parseISO(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.invoices?.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.bookings?.guest_name}</p>
                            <p className="text-sm text-muted-foreground">{payment.bookings?.guest_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.bookings?.booking_id}
                        </TableCell>
                        <TableCell className="font-medium">₹{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {getMethodBadge(payment.payment_method)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.transaction_reference || payment.razorpay_payment_id || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.admin_profiles?.email || 'System'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}