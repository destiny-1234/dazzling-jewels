import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://dazzling-jewels.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: product } = await supabase
    .from('products')
    .select('name, description, retail_price, images')
    .eq('slug', params.slug)
    .eq('visible', true)
    .maybeSingle();

  if (!product) {
    return {
      title: 'Product Not Found — Fave Dazzling Jewels',
    };
  }

  const title = `${product.name} — Fave Dazzling Jewels`;
  const description =
    product.description ||
    'Hand-beaded luxury bags, clutches, and statement pieces, made by hand in Nigeria.';
  const image = product.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${params.slug}`,
      images: image ? [{ url: image, width: 800, height: 1000, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}