-- Add unique constraint to prevent duplicate submissions by the same student for the same domain
ALTER TABLE public.certificates 
ADD CONSTRAINT certificates_student_domain_unique UNIQUE (student_id, domain_id);
