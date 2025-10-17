import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Database, Image, Video } from 'lucide-react';

interface MediaStats {
  total: number;
  used: number;
  unused: number;
  byType: {
    pages: number;
    blogs: number;
    rooms: number;
    packages: number;
    activities: number;
    spa: number;
    meals: number;
  };
  byMediaType: {
    images: number;
    videos: number;
  };
}

interface UnusedMediaDashboardProps {
  stats: MediaStats;
}

export const UnusedMediaDashboard: React.FC<UnusedMediaDashboardProps> = ({ stats }) => {
  const usagePercentage = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Media</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {stats.byMediaType.images}
            </span>
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              {stats.byMediaType.videos}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Used Media</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.used}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {usagePercentage}% utilization
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unused Media</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.unused}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.unused > 0 ? 'Consider cleanup' : 'All media in use!'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Usage Breakdown</p>
            <div className="space-y-1 text-xs">
              {stats.byType.pages > 0 && (
                <div className="flex justify-between">
                  <span>Pages</span>
                  <span className="font-medium">{stats.byType.pages}</span>
                </div>
              )}
              {stats.byType.blogs > 0 && (
                <div className="flex justify-between">
                  <span>Blog Posts</span>
                  <span className="font-medium">{stats.byType.blogs}</span>
                </div>
              )}
              {stats.byType.rooms > 0 && (
                <div className="flex justify-between">
                  <span>Rooms</span>
                  <span className="font-medium">{stats.byType.rooms}</span>
                </div>
              )}
              {stats.byType.packages > 0 && (
                <div className="flex justify-between">
                  <span>Packages</span>
                  <span className="font-medium">{stats.byType.packages}</span>
                </div>
              )}
              {stats.byType.activities > 0 && (
                <div className="flex justify-between">
                  <span>Activities</span>
                  <span className="font-medium">{stats.byType.activities}</span>
                </div>
              )}
              {stats.byType.spa > 0 && (
                <div className="flex justify-between">
                  <span>Spa Services</span>
                  <span className="font-medium">{stats.byType.spa}</span>
                </div>
              )}
              {stats.byType.meals > 0 && (
                <div className="flex justify-between">
                  <span>Meals</span>
                  <span className="font-medium">{stats.byType.meals}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
