-- Vacancy labels are private operator metadata, exposed only through admin.
ALTER TABLE cv_attributions ADD COLUMN vacancy TEXT NOT NULL DEFAULT '';
