-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('pii-documents', 'pii-documents', false),
  ('processed-exports', 'processed-exports', false);

-- Create document processing tables
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  content_preview TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PII entities table
CREATE TABLE public.pii_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  text_content TEXT NOT NULL,
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL,
  confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_category TEXT NOT NULL CHECK (risk_category IN ('high', 'medium', 'low')),
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create processing results table
CREATE TABLE public.processing_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  redacted_text TEXT NOT NULL,
  redaction_method TEXT NOT NULL,
  total_entities INTEGER NOT NULL DEFAULT 0,
  processing_time_ms INTEGER NOT NULL,
  overall_confidence DECIMAL(5,4),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create redaction methods table
CREATE TABLE public.redaction_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  example TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default redaction methods
INSERT INTO public.redaction_methods (name, description, example, sort_order) VALUES
  ('Smart Placeholders', 'Replace with descriptive placeholders maintaining entity relationships', '[EMAIL_1], [PHONE_2], [PERSON_3]', 1),
  ('Contextual Masking', 'Intelligent masking preserving data structure', 'XXX-XX-1234, ████@company.com', 2),
  ('Synthetic Data', 'Replace with realistic fake data maintaining format', 'jane.doe@example.com, (555) 123-4567', 3),
  ('Cryptographic Hash', 'Replace with irreversible hash values', 'a1b2c3d4e5f6...', 4);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pii_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redaction_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view their own documents" 
  ON public.documents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
  ON public.documents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
  ON public.documents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
  ON public.documents FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for PII entities
CREATE POLICY "Users can view PII entities from their documents" 
  ON public.pii_entities FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = pii_entities.document_id 
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can create PII entities for their documents" 
  ON public.pii_entities FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = pii_entities.document_id 
    AND documents.user_id = auth.uid()
  ));

-- Create RLS policies for processing results
CREATE POLICY "Users can view processing results from their documents" 
  ON public.processing_results FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = processing_results.document_id 
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can create processing results for their documents" 
  ON public.processing_results FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = processing_results.document_id 
    AND documents.user_id = auth.uid()
  ));

-- Create RLS policies for redaction methods (public read)
CREATE POLICY "Anyone can view redaction methods" 
  ON public.redaction_methods FOR SELECT 
  USING (true);

-- Create storage policies for documents
CREATE POLICY "Users can upload their own documents" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'pii-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'pii-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'pii-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for exports
CREATE POLICY "Users can create their own exports" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'processed-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own exports" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'processed-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(processing_status);
CREATE INDEX idx_pii_entities_document_id ON public.pii_entities(document_id);
CREATE INDEX idx_pii_entities_type ON public.pii_entities(entity_type);
CREATE INDEX idx_processing_results_document_id ON public.processing_results(document_id);