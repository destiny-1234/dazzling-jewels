'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Product } from '@/lib/types';

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  loading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  lines: [],
  count: 0,
  subtotal: 0,
  loading: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeFromCart: async () => {},
  clearCart: async () => {},
});

const GUEST_CART_KEY = 'fave_guest_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGuestCart = useCallback((): CartLine[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const saveGuestCart = useCallback((cart: CartLine[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    }
  }, []);

  const loadDbCart = useCallback(async (): Promise<CartLine[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('cart_items')
      .select('quantity, products!inner(*)')
      .eq('user_id', user.id);
    return (data || []).map((item: any) => ({
      product: item.products as Product,
      quantity: item.quantity,
    }));
  }, [user]);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const dbLines = await loadDbCart();
        setLines(dbLines);
      } else {
        setLines(loadGuestCart());
      }
    } finally {
      setLoading(false);
    }
  }, [user, loadDbCart, loadGuestCart]);

  // Merge guest cart into DB cart on sign-in
  useEffect(() => {
    if (!user) {
      loadCart();
      return;
    }
    (async () => {
      const guestCart = loadGuestCart();
      if (guestCart.length > 0) {
        for (const line of guestCart) {
          await supabase
            .from('cart_items')
            .upsert(
              { user_id: user.id, product_id: line.product.id, quantity: line.quantity },
              { onConflict: 'user_id,product_id' }
            );
        }
        saveGuestCart([]);
      }
      await loadCart();
    })();
  }, [user, loadCart, loadGuestCart, saveGuestCart]);

  const addToCart = useCallback(async (product: Product, quantity = 1) => {
    if (user) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: product.id, quantity });
      }
      await loadCart();
    } else {
      const cart = loadGuestCart();
      const idx = cart.findIndex((l) => l.product.id === product.id);
      if (idx >= 0) {
        cart[idx].quantity += quantity;
      } else {
        cart.push({ product, quantity });
      }
      saveGuestCart(cart);
      setLines(cart);
    }
  }, [user, loadCart, loadGuestCart, saveGuestCart]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) return;
    if (user) {
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);
      await loadCart();
    } else {
      const cart = loadGuestCart();
      const idx = cart.findIndex((l) => l.product.id === productId);
      if (idx >= 0) {
        cart[idx].quantity = quantity;
        saveGuestCart(cart);
        setLines(cart);
      }
    }
  }, [user, loadCart, loadGuestCart, saveGuestCart]);

  const removeFromCart = useCallback(async (productId: string) => {
    if (user) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      await loadCart();
    } else {
      const cart = loadGuestCart().filter((l) => l.product.id !== productId);
      saveGuestCart(cart);
      setLines(cart);
    }
  }, [user, loadCart, loadGuestCart, saveGuestCart]);

  const clearCart = useCallback(async () => {
    if (user) {
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    } else {
      saveGuestCart([]);
    }
    setLines([]);
  }, [user, saveGuestCart]);

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.product.retail_price * l.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, count, subtotal, loading, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
