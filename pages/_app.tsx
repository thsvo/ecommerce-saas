import { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { SubdomainProvider } from '../contexts/SubdomainContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Ecommerce App</title>
        <meta name="description" content="Modern ecommerce application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SubdomainProvider>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-grow">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </SubdomainProvider>
    </>
  );
}
