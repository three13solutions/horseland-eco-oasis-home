import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const MigrationControls = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  const handleMigration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-json-to-db', {
        body: {
          translations: {
            en: {
              navigation: {
                stay: "Stay",
                experiences: "Experiences",
                dining: "Dining",
                wellness: "Wellness",
                about: "About",
                journal: "Journal",
                contact: "Contact",
                bookNow: "Book Now"
              },
              hero: {
                title: "Escape to Nature's Embrace",
                subtitle: "A mindful retreat in Matheran's no-car eco zone",
                checkIn: "Check-in",
                checkOut: "Check-out",
                guests: "Guests",
                exploreStay: "Explore Stay"
              },
              welcome: {
                title: "Welcome to Horseland",
                description: "Nestled in the heart of Matheran's car-free paradise, Horseland represents more than comfortable accommodation—it's a sanctuary where sustainable elegance meets authentic mountain hospitality."
              },
              packages: {
                title: "Curated Experiences",
                subtitle: "Choose Your Perfect Mountain Getaway",
                "romantic.tag": "ROMANTIC",
                "romantic.title": "Romantic Retreat",
                "romantic.description": "Intimate escapes with candlelit dinners, couple spa treatments, and scenic views",
                "family.tag": "FAMILY",
                "family.title": "Family Adventure",
                "family.description": "Fun-filled activities for all ages with spacious accommodations and kid-friendly amenities"
              },
              experiences: {
                title: "Curated",
                titleHighlight: "Experiences",
                subtitle: "Every moment at Horseland is thoughtfully designed to create lasting memories"
              },
              reviews: {
                title: "What Our",
                titleHighlight: "Guests",
                titleSuffix: "Say",
                subtitle: "See why families and couples choose Horseland for their Matheran stay"
              },
              footer: {
                description: "Where the forest whispers you awake. Experience mindful comfort in Matheran's pristine car-free sanctuary.",
                quickLinks: "Quick Links",
                contact: "Contact",
                followUs: "Follow Us",
                rights: "© 2024 Horseland Resort. All rights reserved."
              }
            },
            hi: {
              navigation: {
                stay: "रुकें",
                experiences: "अनुभव",
                dining: "भोजन",
                wellness: "कल्याण",
                about: "हमारे बारे में",
                journal: "पत्रिका",
                contact: "संपर्क",
                bookNow: "अभी बुक करें"
              },
              hero: {
                title: "माथेरान का जादू खोजें",
                subtitle: "जहाँ हर पल एक कीमती यादगार बन जाता है",
                checkIn: "चेक इन",
                checkOut: "चेक आउट",
                guests: "मेहमान",
                exploreStay: "रुकना देखें"
              },
              packages: {
                title: "चुनिंदा अनुभव",
                subtitle: "अपना आदर्श पर्वतीय पलायन चुनें"
              },
              footer: {
                description: "पश्चिमी घाट के हृदय में हॉर्सलैंड होटल एंड माउंटेन स्पा में विलासिता का अनुभव करें।",
                quickLinks: "त्वरित लिंक",
                contact: "संपर्क",
                followUs: "हमें फॉलो करें",
                rights: "सभी अधिकार सुरक्षित।"
              }
            }
          }
        }
      });

      if (error) {
        setResult({
          success: false,
          message: `Migration failed: ${error.message}`
        });
      } else {
        setResult({
          success: true,
          message: data.message,
          count: data.migratedCount
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Translation Migration</CardTitle>
        <CardDescription>
          Migrate existing JSON translations to the database for content management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleMigration} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Migrating...
            </>
          ) : (
            'Migrate JSON to Database'
          )}
        </Button>

        {result && (
          <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
              {result.message}
              {result.count && (
                <div className="mt-1 font-medium">
                  Successfully migrated {result.count} translation entries
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};