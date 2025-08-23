import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardContent() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-card-foreground mb-6 font-heading">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-all duration-200 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground font-heading">New Booking</CardTitle>
            <CardDescription>Create a new reservation</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Create Booking</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground font-heading">Add Guest</CardTitle>
            <CardDescription>Register a new guest profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Add Guest</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground font-heading">Process Payment</CardTitle>
            <CardDescription>Record a new payment</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Process Payment</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}