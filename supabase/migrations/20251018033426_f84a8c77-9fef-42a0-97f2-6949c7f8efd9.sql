-- Insert Indian holidays for 2025
INSERT INTO public.holidays (name, date, year, is_long_weekend, description) VALUES
  ('New Year', '2025-01-01', 2025, false, 'New Year''s Day'),
  ('Republic Day', '2025-01-26', 2025, true, 'Republic Day of India'),
  ('Holi', '2025-03-14', 2025, false, 'Festival of Colors'),
  ('Good Friday', '2025-04-18', 2025, true, 'Good Friday'),
  ('Eid ul-Fitr', '2025-03-31', 2025, false, 'End of Ramadan'),
  ('Independence Day', '2025-08-15', 2025, false, 'Independence Day of India'),
  ('Janmashtami', '2025-08-16', 2025, true, 'Birth of Lord Krishna'),
  ('Ganesh Chaturthi', '2025-08-27', 2025, false, 'Festival of Lord Ganesha'),
  ('Gandhi Jayanti', '2025-10-02', 2025, false, 'Birth anniversary of Mahatma Gandhi'),
  ('Dussehra', '2025-10-02', 2025, false, 'Victory of good over evil'),
  ('Diwali', '2025-10-20', 2025, true, 'Festival of Lights'),
  ('Guru Nanak Jayanti', '2025-11-05', 2025, false, 'Birth of Guru Nanak'),
  ('Christmas', '2025-12-25', 2025, false, 'Christmas Day'),
  
  -- 2026 holidays
  ('New Year', '2026-01-01', 2026, false, 'New Year''s Day'),
  ('Republic Day', '2026-01-26', 2026, true, 'Republic Day of India'),
  ('Holi', '2026-03-05', 2026, false, 'Festival of Colors'),
  ('Good Friday', '2026-04-03', 2026, true, 'Good Friday'),
  ('Eid ul-Fitr', '2026-03-20', 2026, false, 'End of Ramadan'),
  ('Independence Day', '2026-08-15', 2026, true, 'Independence Day of India'),
  ('Janmashtami', '2026-09-04', 2026, false, 'Birth of Lord Krishna'),
  ('Ganesh Chaturthi', '2026-09-16', 2026, false, 'Festival of Lord Ganesha'),
  ('Gandhi Jayanti', '2026-10-02', 2026, false, 'Birth anniversary of Mahatma Gandhi'),
  ('Dussehra', '2026-10-21', 2026, false, 'Victory of good over evil'),
  ('Diwali', '2026-11-08', 2026, true, 'Festival of Lights'),
  ('Guru Nanak Jayanti', '2026-11-24', 2026, false, 'Birth of Guru Nanak'),
  ('Christmas', '2026-12-25', 2026, false, 'Christmas Day')
ON CONFLICT (date) DO NOTHING;