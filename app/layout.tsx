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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700;800&family=Dancing+Script:wght@700&family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Syncopate:wght@700;800&family=Syne:wght@800;900&display=swap" rel="stylesheet" />
      </head>
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
