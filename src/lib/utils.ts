import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const generateWhatsAppLink = (orderId: string, phone: string, total: number, items: any[], address: string, status?: string, deliveryFee: number = 0, notes?: string) => {
  const statusText = status ? `*Estado:* ${status}\n` : '';
  const notesText = notes ? `\n*Notas:* ${notes}\n` : '';
  const deliveryText = deliveryFee > 0 ? `*Delivery:* ${formatCurrency(deliveryFee)}\n` : `*Delivery:* GRATIS\n`;
  
  const message = `*RECADITO - DETALLE DE COBRO / FACTURA*\n\n` +
    `*ID Pedido:* ${orderId.slice(0, 8)}\n` +
    statusText +
    `*Dirección:* ${address}\n` +
    notesText +
    `\n*Productos:*\n` +
    items.map(item => `- ${item.product.name} (${item.quantity} ${item.product.type}): ${formatCurrency(item.product.price * item.quantity)}`).join('\n') +
    `\n\n--------------------------\n` +
    deliveryText +
    `*MONTO TOTAL A PAGAR: ${formatCurrency(total)}*\n` +
    `--------------------------\n\n` +
    `¡Gracias por tu compra!`;
  
  const encodedMessage = encodeURIComponent(message);
  // Remove non-numeric characters from phone
  const cleanPhone = phone.replace(/\D/g, '');
  // Ensure it has the country code for Panama if not present
  const fullPhone = cleanPhone.startsWith('507') ? cleanPhone : `507${cleanPhone}`;
  
  return `https://wa.me/${fullPhone}?text=${encodedMessage}`;
};
