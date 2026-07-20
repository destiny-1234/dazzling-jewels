export type AccountType = 'retail' | 'wholesale';
export type AccountStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'wholesale' | 'retail';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  account_type: AccountType;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  category_id: string | null;
  retail_price: number;
  wholesale_price: number | null;
  stock: number;
  images: string[];
  visible: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  total: number;
  subtotal: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  delivery_zone_id?: string | null;
  delivery_fee: number;
  delivery_status: 'quoted' | 'awaiting_quote';
  delivery_zones?: DeliveryZone | null;
  coupon_code: string | null;
  discount_amount: number;
  // Soft-delete flags: hiding an order from a list never changes revenue.
  // Only excluded_from_revenue actually removes it from revenue totals.
  hidden_from_orders?: boolean;
  hidden_from_transactions?: boolean;
  excluded_from_revenue?: boolean;
  hidden_from_customer?: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  image: string | null;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  location: string | null;
  text: string;
  rating: number;
  visible: boolean;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
  user_id?: string | null;
  message_replies?: MessageReply[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number | null; // null = requires a manual quote
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MessageReply {
  id: string;
  contact_message_id: string;
  sender_type: 'admin' | 'customer';
  body: string;
  created_at: string;
}


export type ReturnRequestStatus = 'new' | 'reviewing' | 'resolved';

export interface ReturnRequest {
  id: string;
  user_id: string | null;
  order_number: string;
  name: string;
  email: string;
  description: string;
  photo_urls: string[];
  status: ReturnRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  active: boolean;
  min_order_amount: number;
  usage_limit: number | null;
  times_used: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
}

export type SiteSettings = Record<string, string>;
