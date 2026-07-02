'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, slugify } from '@/lib/format';
import type { Product, Category } from '@/lib/types';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data as Category[];
    },
  });

  const toggleVisibility = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ visible: !product.visible })
      .eq('id', product.id);
    if (error) {
      toast.error('Failed to update visibility');
    } else {
      toast.success('Visibility updated');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-zinc-100">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your product catalog</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Product table */}
      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
            {products?.map((product: Product) => (
              <tr key={product.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                    )}
                    <span className="text-sm text-zinc-200">{product.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">{product.categories?.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">{formatNaira(product.retail_price)}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">{product.stock}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    product.visible
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    {product.visible ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggleVisibility(product)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                      title={product.visible ? 'Hide' : 'Show'}
                    >
                      {product.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingProduct(product); setShowForm(true); }}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-red-900/50 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product form modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories || []}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
    </AdminShell>
  );
}

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [material, setMaterial] = useState(product?.material || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [retailPrice, setRetailPrice] = useState(product?.retail_price?.toString() || '');
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesale_price?.toString() || '');
  const [stock, setStock] = useState(product?.stock?.toString() || '0');
  const [images, setImages] = useState((product?.images || []).join('\n'));
  const [visible, setVisible] = useState(product?.visible ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      slug: product?.slug || slugify(name),
      description,
      material,
      category_id: categoryId || null,
      retail_price: parseFloat(retailPrice) || 0,
      wholesale_price: wholesalePrice ? parseFloat(wholesalePrice) : null,
      stock: parseInt(stock) || 0,
      images: images.split('\n').map((s) => s.trim()).filter(Boolean),
      visible,
      featured,
    };

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(product ? 'Product updated' : 'Product created');
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium text-zinc-100">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-300">Material</label>
              <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500">
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-300">Retail Price</label>
              <input type="number" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300">Wholesale Price</label>
              <input type="number" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300">Stock</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Image URLs (one per line)</label>
            <textarea value={images} onChange={(e) => setImages(e.target.value)} className="mt-1 min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" placeholder="https://..." />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="rounded border-zinc-600" />
              Visible
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="rounded border-zinc-600" />
              Featured
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
