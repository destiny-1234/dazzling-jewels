import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export function downloadOrderReceipt(order: Order) {
  const doc = new jsPDF();
  const orderRef = order.id.slice(0, 8).toUpperCase();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Fave Dazzling Jewels', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Hand-beaded luxury bags, made by hand in Nigeria', 14, 27);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Receipt', 14, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order Reference: #${orderRef}`, 14, 48);
  doc.text(`Date: ${formatDate(order.created_at)}`, 14, 54);
  doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 14, 60);

  // Shipping details
  doc.setFont('helvetica', 'bold');
  doc.text('Shipping To', 14, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(order.shipping_name || '-', 14, 78);
  doc.text(order.shipping_email || '-', 14, 84);
  doc.text(order.shipping_phone || '-', 14, 90);
  const addressLines = doc.splitTextToSize(order.shipping_address || '-', 90);
  doc.text(addressLines, 14, 96);

  // Items table
  const rows = (order.order_items || []).map((item) => [
    item.product_name,
    String(item.quantity),
    formatNaira(item.unit_price),
    formatNaira(item.unit_price * item.quantity),
  ]);

  autoTable(doc, {
    startY: 115,
    head: [['Item', 'Qty', 'Unit Price', 'Total']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [101, 27, 42] },
    styles: { fontSize: 9 },
  });

  // Totals — placed below the table using its final Y position
  const finalY = (doc as any).lastAutoTable?.finalY || 130;
  let y = finalY + 8;

  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatNaira(order.subtotal)}`, 140, y, { align: 'left' });
  y += 6;
  if (order.discount_amount > 0) {
    doc.text(
      `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${formatNaira(order.discount_amount)}`,
      140,
      y,
      { align: 'left' }
    );
    y += 6;
  }
  doc.text(`Delivery: ${order.delivery_fee ? formatNaira(order.delivery_fee) : 'N/A'}`, 140, y, { align: 'left' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatNaira(order.total)}`, 140, y, { align: 'left' });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for shopping with Fave Dazzling Jewels.', 14, 285);

  doc.save(`fave-jewels-receipt-${orderRef}.pdf`);
}
