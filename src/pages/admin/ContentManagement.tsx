import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, RefreshCw, Copy, Languages, Upload, Download, Globe, Zap, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MigrationControls } from '@/components/admin/MigrationControls';

interface Translation {
  id: string;
  language_code: string;
  section: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

interface TranslationSection {
  section_key: string;
  section_name: string;
  description: string;
}

const ContentManagement = () => {
  const [sections, setSections] = useState<TranslationSection[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [migrating, setMigrating] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'bn', name: 'Bengali' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ur', name: 'Urdu' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'ru', name: 'Russian' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('translation_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      // Load translations
      const { data: translationsData, error: translationsError } = await supabase
        .from('translations')
        .select('*')
        .order('section, key');

      if (translationsError) throw translationsError;

      setSections(sectionsData || []);
      setTranslations(translationsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const migrateFromJSON = async () => {
    setMigrating(true);
    try {
      // Load all JSON translations
      const languages = ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn', 'pa', 'ur', 'ar', 'zh', 'es', 'fr', 'ru'];
      const translations: { [key: string]: any } = {};

      for (const lang of languages) {
        try {
          const response = await fetch(`/locales/${lang}/common.json`);
          if (response.ok) {
            translations[lang] = await response.json();
          }
        } catch (error) {
          console.warn(`Failed to load ${lang} translations:`, error);
        }
      }

      // Call migration function
      const { data, error } = await supabase.functions.invoke('migrate-json-to-db', {
        body: { translations }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Migrated ${data.migratedCount} translations to database`,
      });

      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to migrate translations",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
      setShowMigrateDialog(false);
    }
  };

  const autoTranslate = async (key: string, sourceText: string) => {
    if (selectedLanguage === 'en') return;
    
    setTranslating(key);
    try {
      const { data, error } = await supabase.functions.invoke('auto-translate', {
        body: {
          text: sourceText,
          targetLanguage: selectedLanguage,
          sourceLanguage: 'en'
        }
      });

      if (error) throw error;

      setEditingValues(prev => ({
        ...prev,
        [key]: data.translatedText
      }));

      toast({
        title: "Success",
        description: "Text auto-translated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to auto-translate text",
        variant: "destructive",
      });
    } finally {
      setTranslating(null);
    }
  };

  const autoTranslateAll = async () => {
    if (selectedLanguage === 'en') return;
    
    setShowTranslateDialog(true);
    const sectionKeys = getSectionKeys();
    let completed = 0;
    
    for (const key of sectionKeys) {
      const englishTranslation = translations.find(t => 
        t.key === key && t.language_code === 'en' && t.section === selectedSection
      );
      
      if (englishTranslation) {
        try {
          const { data, error } = await supabase.functions.invoke('auto-translate', {
            body: {
              text: englishTranslation.value,
              targetLanguage: selectedLanguage,
              sourceLanguage: 'en'
            }
          });

          if (!error && data.translatedText) {
            await saveTranslation(key, data.translatedText, false);
          }
        } catch (error) {
          console.warn(`Failed to translate ${key}:`, error);
        }
      }
      
      completed++;
      setTranslateProgress((completed / sectionKeys.length) * 100);
    }

    toast({
      title: "Success",
      description: `Auto-translated ${completed} items`,
    });
    
    setShowTranslateDialog(false);
    setTranslateProgress(0);
    await loadData();
  };

  const exportTranslations = async () => {
    setExporting(true);
    try {
      const exported: { [lang: string]: any } = {};
      const languages = ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn', 'pa', 'ur', 'ar', 'zh', 'es', 'fr', 'ru'];
      
      for (const lang of languages) {
        exported[lang] = {};
        const langTranslations = translations.filter(t => t.language_code === lang);
        
        for (const translation of langTranslations) {
          const keys = translation.key.split('.');
          let current = exported[lang];
          
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
          }
          
          current[keys[keys.length - 1]] = translation.value;
        }
      }

      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translations.json';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Translations exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export translations",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const getCurrentTranslations = () => {
    return translations.filter(t => 
      t.section === selectedSection && t.language_code === selectedLanguage
    );
  };

  const getSectionKeys = () => {
    const keys = new Set(
      translations
        .filter(t => t.section === selectedSection)
        .map(t => t.key)
    );
    return Array.from(keys).sort();
  };

  const saveTranslation = async (key: string, value: string, showToast = true) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from('translations')
        .upsert({
          language_code: selectedLanguage,
          section: selectedSection,
          key,
          value
        }, {
          onConflict: 'language_code,section,key'
        });

      if (error) throw error;

      // Update local state
      setTranslations(prev => {
        const existing = prev.find(t => 
          t.language_code === selectedLanguage && 
          t.section === selectedSection && 
          t.key === key
        );

        if (existing) {
          return prev.map(t => 
            t.id === existing.id ? { ...t, value } : t
          );
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            language_code: selectedLanguage,
            section: selectedSection,
            key,
            value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];
        }
      });

      // Clear editing value
      setEditingValues(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      if (showToast) {
        toast({
          title: "Success",
          description: "Translation saved successfully",
        });
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to save translation",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(null);
    }
  };

  const copyFromLanguage = async (sourceLang: string) => {
    try {
      const sourceTranslations = translations.filter(t => 
        t.section === selectedSection && t.language_code === sourceLang
      );

      for (const sourceTranslation of sourceTranslations) {
        await saveTranslation(sourceTranslation.key, sourceTranslation.value, false);
      }

      toast({
        title: "Success",
        description: `Copied ${sourceTranslations.length} translations from ${sourceLang}`,
      });

      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy translations",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Content Management</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowMigrateDialog(true)} 
              variant="outline" 
              size="sm"
              disabled={migrating}
            >
              <Upload className="h-4 w-4 mr-2" />
              {migrating ? 'Migrating...' : 'Import JSON'}
            </Button>
            <Button 
              onClick={exportTranslations} 
              variant="outline" 
              size="sm"
              disabled={exporting}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Migration Controls */}
        <MigrationControls />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.section_key}
                  onClick={() => setSelectedSection(section.section_key)}
                  className={`w-full text-left p-2 rounded ${
                    selectedSection === section.section_key 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <div className="font-medium">{section.section_name}</div>
                  <div className="text-sm text-muted-foreground">{section.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Main content */}
          <Card className="md:col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Translations</CardTitle>
                  <CardDescription>
                    Manage content for {selectedSection || 'selected section'}
                  </CardDescription>
                </div>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedSection ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      <span className="text-lg font-medium">
                        {selectedSection} ({selectedLanguage.toUpperCase()})
                      </span>
                      <Badge variant="secondary">
                        {getSectionKeys().length} keys
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {selectedLanguage !== 'en' && (
                        <Button
                          onClick={autoTranslateAll}
                          variant="outline"
                          size="sm"
                          disabled={translating !== null}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Auto-translate All
                        </Button>
                      )}
                      <Button
                        onClick={() => copyFromLanguage('en')}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy from English
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {getSectionKeys().map((key) => {
                      const currentTranslation = getCurrentTranslations().find(t => t.key === key);
                      const englishTranslation = translations.find(t => 
                        t.key === key && t.language_code === 'en' && t.section === selectedSection
                      );

                      return (
                        <div key={key} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Label className="font-medium">{key}</Label>
                            <div className="flex items-center gap-2">
                              {currentTranslation ? (
                                <Badge variant="default">Translated</Badge>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </div>
                          </div>
                          <Input
                            value={editingValues[key] ?? currentTranslation?.value ?? ''}
                            onChange={(e) => setEditingValues(prev => ({
                              ...prev,
                              [key]: e.target.value
                            }))}
                            placeholder={`Enter ${selectedLanguage} translation for ${key}`}
                            className="mb-2"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {englishTranslation ? `EN: ${englishTranslation.value}` : 'No English version'}
                            </span>
                            <div className="flex gap-2">
                              {selectedLanguage !== 'en' && englishTranslation && (
                                <Button
                                  onClick={() => autoTranslate(key, englishTranslation.value)}
                                  disabled={translating === key}
                                  variant="outline"
                                  size="sm"
                                >
                                  {translating === key ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Globe className="h-4 w-4 mr-2" />
                                  )}
                                  Auto-translate
                                </Button>
                              )}
                              <Button
                                onClick={() => saveTranslation(key, editingValues[key] ?? currentTranslation?.value ?? '')}
                                disabled={saving === key || (!editingValues[key] && !currentTranslation?.value)}
                                size="sm"
                              >
                                {saving === key ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {getSectionKeys().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No content keys found for this section.</p>
                      <p className="text-sm mt-2">Import JSON data to get started.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-4">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-medium text-foreground mb-2">Content Management</h3>
                    <p className="mb-4">Select a section from the left sidebar to view and edit content keys.</p>
                    <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                      <p className="font-medium text-foreground">Current Status:</p>
                      <p>📁 {sections.length} sections available</p>
                      <p>🌐 {translations.length} total translations</p>
                      <p>🔤 {languages.length} languages supported</p>
                    </div>
                    {sections.length > 0 && (
                      <p className="mt-4 text-sm">
                        👈 Click on a section like <strong>"{sections[0]?.section_name}"</strong> to get started
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Migration Dialog */}
      <Dialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Translations from JSON</DialogTitle>
            <DialogDescription>
              This will import all translations from the JSON files in the public/locales folder 
              to the database. This will overwrite existing translations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={migrateFromJSON} disabled={migrating}>
              {migrating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import Translations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-translate Dialog */}
      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-translating Content</DialogTitle>
            <DialogDescription>
              Please wait while we auto-translate all content in this section...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Progress value={translateProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round(translateProgress)}% complete
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;