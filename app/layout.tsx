import type { Metadata } from 'next';
import './globals.css';
import './product-details.css';
import './storefront-theme.css';
import { CartProvider } from '../src/components/CartProvider';
import { AuthGateProvider } from '../src/components/AuthGateProvider';
import AppChrome from '../src/components/AppChrome';

export const metadata: Metadata = {
  title: { default: 'DroidStore | Celulares Android', template: '%s | DroidStore' },
  description: 'Celulares Android novos e seminovos, revisados, com garantia e compra protegida.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <AuthGateProvider>
            <AppChrome>{children}</AppChrome>
          </AuthGateProvider>
        </CartProvider>
      </body>
    </html>
  );
}
