'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Template, TemplateCategory } from '@/types';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTemplates = async () => {
      const [templatesRes, categoriesRes] = await Promise.all([
        supabase
          .from('templates')
          .select('*, category:template_categories(*)')
          .eq('is_public', true)
          .order('use_count', { ascending: false }),
        supabase
          .from('template_categories')
          .select('*')
          .order('sort_order'),
      ]);

      if (templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
      setLoading(false);
    };

    fetchTemplates();
  }, [supabase]);

  const getTemplatesByCategory = useCallback((categorySlug: string) => {
    return templates.filter(t => t.category?.slug === categorySlug);
  }, [templates]);

  const incrementUseCount = useCallback(async (templateId: string) => {
    await supabase.rpc('increment_template_use_count', { template_id: templateId });
  }, [supabase]);

  return {
    templates,
    categories,
    loading,
    getTemplatesByCategory,
    incrementUseCount,
  };
}
