import type { Metadata } from 'next';
import './globals.css';
import './product-details.css';
import './storefront-theme.css';
import { CartProvider } from '../src/components/CartProvider';
import { AuthGateProvider } from '../src/components/AuthGateProvider';
import { SiteContentProvider } from '../src/components/SiteContentProvider';
import AppChrome from '../src/components/AppChrome';

export const metadata: Metadata = {
  title: { default: 'Aura Tech | Tecnologia e celulares', template: '%s | Aura Tech' },
  description: 'Tecnologia, celulares, acessórios e seminovos com garantia e compra protegida.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    shortcut: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Caveat:wght@600;700;800&family=Dancing+Script:wght@700&family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Syncopate:wght@700;800&family=Syne:wght@800;900&display=swap" rel="stylesheet" />
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
      </head>
      <body>
        <CartProvider>
          <AuthGateProvider>
            <SiteContentProvider>
              <AppChrome>{children}</AppChrome>
            </SiteContentProvider>
          </AuthGateProvider>
        </CartProvider>
      </body>
    </html>
  );
}
