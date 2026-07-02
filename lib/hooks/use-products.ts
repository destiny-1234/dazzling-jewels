'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Product, Category, Testimonial } from '@/lib/types';

export function useProducts(filters?: {
  category?: string;
  search?: string;
  maxPrice?: number;
  inStockOnly?: boolean;
}) {
  return useQuery<Product[]>({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories(*)')
        .eq('visible', true)
        .order('created_at', { ascending: false });

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('categories.slug', filters.category);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.maxPrice) {
        query = query.lte('retail_price', filters.maxPrice);
      }
      if (filters?.inStockOnly) {
        query = query.gt('stock', 0);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useFeaturedProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('visible', true)
        .eq('featured', true)
        .limit(4);
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductBySlug(slug: string) {
  return useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('slug', slug)
        .eq('visible', true)
        .maybeSingle();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useTestimonials() {
  return useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('visible', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Testimonial[];
    },
  });
}
