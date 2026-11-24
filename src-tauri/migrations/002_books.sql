-- 002_books.sql (M10, DESIGN_SPEC §5, §7.9)
-- A folder is a book when book_format is set to a format id from §7.9.
ALTER TABLE folders ADD COLUMN book_format TEXT;
