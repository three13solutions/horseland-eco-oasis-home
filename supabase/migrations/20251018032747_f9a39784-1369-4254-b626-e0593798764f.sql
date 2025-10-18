-- Create seasons table for configurable season definitions
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create season_periods table for date ranges within seasons
CREATE TABLE IF NOT EXISTS public.season_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  start_day INTEGER NOT NULL CHECK (start_day >= 1 AND start_day <= 31),
  end_month INTEGER NOT NULL CHECK (end_month >= 1 AND end_month <= 12),
  end_day INTEGER NOT NULL CHECK (end_day >= 1 AND end_day <= 31),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create day_types table for different pricing scenarios
CREATE TABLE IF NOT EXISTS public.day_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seasonal_pricing table for room type pricing by season and day type
CREATE TABLE IF NOT EXISTS public.seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  day_type_id UUID NOT NULL REFERENCES public.day_types(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_type_id, season_id, day_type_id)
);

-- Create holidays table for specific holiday dates
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_long_weekend BOOLEAN NOT NULL DEFAULT false,
  year INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasons
CREATE POLICY "Anyone can view active seasons" ON public.seasons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage seasons" ON public.seasons
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid()));

-- RLS Policies for season_periods
CREATE POLICY "Anyone can view season periods" ON public.season_periods
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage season periods" ON public.season_periods
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid()));

-- RLS Policies for day_types
CREATE POLICY "Anyone can view active day types" ON public.day_types
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage day types" ON public.day_types
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid()));

-- RLS Policies for seasonal_pricing
CREATE POLICY "Anyone can view seasonal pricing" ON public.seasonal_pricing
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage seasonal pricing" ON public.seasonal_pricing
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid()));

-- RLS Policies for holidays
CREATE POLICY "Anyone can view holidays" ON public.holidays
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage holidays" ON public.holidays
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid()));

-- Insert default seasons
INSERT INTO public.seasons (name, slug, description, color, display_order) VALUES
  ('Peak Season', 'peak', 'October to May - Pleasant weather, festivals', '#ef4444', 1),
  ('Off-Peak Season', 'off_peak', 'June to September - Monsoon, lush greenery', '#10b981', 2)
ON CONFLICT (slug) DO NOTHING;

-- Insert default season periods
INSERT INTO public.season_periods (season_id, start_month, start_day, end_month, end_day)
SELECT id, 10, 1, 5, 31 FROM public.seasons WHERE slug = 'peak'
ON CONFLICT DO NOTHING;

INSERT INTO public.season_periods (season_id, start_month, start_day, end_month, end_day)
SELECT id, 6, 1, 9, 30 FROM public.seasons WHERE slug = 'off_peak'
ON CONFLICT DO NOTHING;

-- Insert default day types
INSERT INTO public.day_types (name, slug, description, display_order) VALUES
  ('Weekday', 'weekday', 'Monday to Thursday', 1),
  ('Weekend', 'weekend', 'Friday to Sunday', 2),
  ('Holiday', 'holiday', 'Public holidays and special occasions', 3),
  ('Long Weekend', 'long_weekend', 'Extended weekend with holiday', 4)
ON CONFLICT (slug) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seasonal_pricing_updated_at
  BEFORE UPDATE ON public.seasonal_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_season_periods_season_id ON public.season_periods(season_id);
CREATE INDEX idx_seasonal_pricing_room_type ON public.seasonal_pricing(room_type_id);
CREATE INDEX idx_seasonal_pricing_season ON public.seasonal_pricing(season_id);
CREATE INDEX idx_seasonal_pricing_day_type ON public.seasonal_pricing(day_type_id);
CREATE INDEX idx_holidays_date ON public.holidays(date);
CREATE INDEX idx_holidays_year ON public.holidays(year);