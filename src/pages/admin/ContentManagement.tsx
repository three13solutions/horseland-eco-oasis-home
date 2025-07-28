import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Languages, 
  Save, 
  Loader2, 
  RefreshCw, 
  Globe,
  Eye,
  Edit,
  Copy,
  Trash2
} from 'lucide-react';

interface Translation {
  id: string;
  language_code: string;
  section: string;
  key: string;
  value: string;
}

interface TranslationSection {
  section_key: string;
  section_name: string;
  description: string;
}

const ContentManagement = () => {
  const { i18n } = useTranslation();
  const [sections, setSections] = useState<TranslationSection[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('hero');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newTranslations, setNewTranslations] = useState<{[key: string]: string}>({});

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  // Load sections and translations
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
      setSections(sectionsData || []);

      // Load translations
      const { data: translationsData, error: translationsError } = await supabase
        .from('translations')
        .select('*')
        .order('section, key');

      if (translationsError) throw translationsError;
      setTranslations(translationsData || []);
    } catch (error) {
      toast.error('Failed to load content data');
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get translations for current section and language
  const getCurrentTranslations = () => {
    return translations.filter(t => 
      t.section === selectedSection && t.language_code === selectedLanguage
    );
  };

  // Get all unique keys for the selected section (from all languages)
  const getSectionKeys = () => {
    const keys = new Set(
      translations
        .filter(t => t.section === selectedSection)
        .map(t => t.key)
    );
    return Array.from(keys).sort();
  };

  // Save translation
  const saveTranslation = async (key: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('translations')
        .upsert({
          language_code: selectedLanguage,
          section: selectedSection,
          key,
          value
        });

      if (error) throw error;

      // Update local state
      setTranslations(prev => {
        const filtered = prev.filter(t => 
          !(t.language_code === selectedLanguage && t.section === selectedSection && t.key === key)
        );
        return [...filtered, {
          id: '', // Will be generated
          language_code: selectedLanguage,
          section: selectedSection,
          key,
          value
        }];
      });

      toast.success('Translation saved successfully');
      setEditingKey(null);
    } catch (error) {
      toast.error('Failed to save translation');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-translate using Google Translate (placeholder - you'll need to implement actual API)
  const autoTranslate = async (sourceText: string, targetLang: string) => {
    // This is a placeholder - you would integrate with Google Translate API
    // For now, we'll just return the source text with a note
    return `[Auto-translated] ${sourceText}`;
  };

  // Copy translations from another language
  const copyFromLanguage = async (sourceLang: string) => {
    const sourceTranslations = translations.filter(t => 
      t.section === selectedSection && t.language_code === sourceLang
    );

    const newTranslations = sourceTranslations.map(t => ({
      language_code: selectedLanguage,
      section: selectedSection,
      key: t.key,
      value: t.value
    }));

    try {
      const { error } = await supabase
        .from('translations')
        .upsert(newTranslations);

      if (error) throw error;
      
      await loadData();
      toast.success(`Copied ${newTranslations.length} translations from ${sourceLang}`);
    } catch (error) {
      toast.error('Failed to copy translations');
      console.error('Copy error:', error);
    }
  };

  const currentLang = languages.find(l => l.code === selectedLanguage);
  const currentSection = sections.find(s => s.section_key === selectedSection);

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          <Languages className="mr-3 text-primary" />
          Content Management
        </h1>
        <p className="text-muted-foreground">
          Manage website content across all languages with auto-translation support
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading content...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map(section => (
                  <button
                    key={section.section_key}
                    onClick={() => setSelectedSection(section.section_key)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedSection === section.section_key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{section.section_name}</div>
                    <div className="text-xs opacity-80">{section.description}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Language Selector */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Language</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center">
                          <span className="mr-2">{lang.flag}</span>
                          {lang.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Globe className="mr-2 text-primary" />
                      {currentSection?.section_name} - {currentLang?.flag} {currentLang?.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentSection?.description}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadData}
                      disabled={loading}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Action Buttons */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <Select onValueChange={(sourceLang) => copyFromLanguage(sourceLang)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Copy from language..." />
                    </SelectTrigger>
                    <SelectContent>
                      {languages
                        .filter(l => l.code !== selectedLanguage)
                        .map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Translation Fields */}
                <div className="space-y-4">
                  {getSectionKeys().map(key => {
                    const translation = getCurrentTranslations().find(t => t.key === key);
                    const isEditing = editingKey === key;
                    
                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{key}</Badge>
                            {!translation && (
                              <Badge variant="destructive">Missing</Badge>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingKey(isEditing ? null : key)}
                            >
                              {isEditing ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <Textarea
                              value={newTranslations[key] || translation?.value || ''}
                              onChange={(e) => setNewTranslations(prev => ({
                                ...prev,
                                [key]: e.target.value
                              }))}
                              placeholder={`Enter translation for ${key}...`}
                              className="min-h-[100px]"
                            />
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => saveTranslation(key, newTranslations[key] || translation?.value || '')}
                                disabled={saving}
                                size="sm"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingKey(null);
                                  setNewTranslations(prev => {
                                    const copy = { ...prev };
                                    delete copy[key];
                                    return copy;
                                  });
                                }}
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted/50 rounded p-3 text-sm">
                            {translation?.value || (
                              <span className="text-muted-foreground italic">
                                No translation available
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {getSectionKeys().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No content keys found for this section.</p>
                    <p className="text-sm">Add some translations to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;