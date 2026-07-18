'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Product } from '@/lib/types';

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartActionResult {
  finalQuantity: number;
  limited: boolean;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  loading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<CartActionResult>;
  updateQuantity: (productId: string, quantity: number) => Promise<CartActionResult>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  lines: [],
  count: 0,
  subtotal: 0,
  loading: false,
  addToCart: async () => ({ finalQuantity: 0, limited: false }),
  updateQuantity: async () => ({ finalQuantity: 0, limited: false }),
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

  const addToCart = useCallback(async (product: Product, quantity = 1): Promise<CartActionResult> => {
    const stock = product.stock ?? 0;

    if (user) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      const existingQty = existing?.quantity ?? 0;
      const finalQuantity = Math.max(0, Math.min(stock, existingQty + quantity));
      const limited = finalQuantity < existingQty + quantity;

      if (finalQuantity === existingQty) {
        return { finalQuantity, limited };
      }

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: finalQuantity })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: product.id, quantity: finalQuantity });
      }
      await loadCart();
      return { finalQuantity, limited };
    } else {
      const cart = loadGuestCart();
      const idx = cart.findIndex((l) => l.product.id === product.id);
      const existingQty = idx >= 0 ? cart[idx].quantity : 0;
      const finalQuantity = Math.max(0, Math.min(stock, existingQty + quantity));
      const limited = finalQuantity < existingQty + quantity;

      if (finalQuantity === existingQty) {
        return { finalQuantity, limited };
      }

      if (idx >= 0) {
        cart[idx].quantity = finalQuantity;
      } else {
        cart.push({ product, quantity: finalQuantity });
      }
      saveGuestCart(cart);
      setLines(cart);
      return { finalQuantity, limited };
    }
  }, [user, loadCart, loadGuestCart, saveGuestCart]);

  const updateQuantity = useCallback(async (productId: string, quantity: number): Promise<CartActionResult> => {
    if (quantity < 1) return { finalQuantity: 0, limited: false };

    const existingLine = lines.find((l) => l.product.id === productId);
    const stock = existingLine?.product.stock ?? quantity;
    const finalQuantity = Math.min(stock, quantity);
    const limited = finalQuantity < quantity;

    if (user) {
      await supabase
        .from('cart_items')
        .update({ quantity: finalQuantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);
      await loadCart();
    } else {
      const cart = loadGuestCart();
      const idx = cart.findIndex((l) => l.product.id === productId);
      if (idx >= 0) {
        cart[idx].quantity = finalQuantity;
        saveGuestCart(cart);
        setLines(cart);
      }
    }
    return { finalQuantity, limited };
  }, [user, lines, loadCart, loadGuestCart, saveGuestCart]);

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