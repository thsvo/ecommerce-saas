import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category: {
    name: string;
  };
  averageRating?: number;
  reviewCount: number;
}

export default function Deals() {
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [dailyDeals, setDailyDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      // In a real app, you'd have specific endpoints for deals
      const response = await axios.get('/api/server/products/featured/list');
      const products = response.data.products || [];
      setFlashDeals(products.slice(0, 8));
      setDailyDeals(products.slice(8, 16));
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sample deals data
  const sampleFlashDeals = Array.from({ length: 8 }, (_, i) => ({
    id: `flash-${i}`,
    name: `Flash Deal Product ${i + 1}`,
    price: 29 + i * 15,
    originalPrice: 49 + i * 25,
    discount: 40 + i * 5,
    image: `https://via.placeholder.com/300x200?text=Flash+Deal+${i + 1}`,
    category: { name: ['Electronics', 'Fashion', 'Home', 'Sports'][i % 4] },
    averageRating: 4 + Math.random(),
    reviewCount: 50 + i * 20
  }));

  const sampleDailyDeals = Array.from({ length: 8 }, (_, i) => ({
    id: `daily-${i}`,
    name: `Daily Special ${i + 1}`,
    price: 15 + i * 10,
    originalPrice: 25 + i * 15,
    discount: 30 + i * 3,
    image: `https://via.placeholder.com/300x200?text=Daily+Deal+${i + 1}`,
    category: { name: ['Beauty', 'Books', 'Toys', 'Automotive'][i % 4] },
    averageRating: 4 + Math.random(),
    reviewCount: 30 + i * 15
  }));

  const flashDealsToShow = flashDeals.length > 0 ? flashDeals : sampleFlashDeals;
  const dailyDealsToShow = dailyDeals.length > 0 ? dailyDeals : sampleDailyDeals;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Hot Deals & Flash Sales - ShopHub</title>
        <meta name="description" content="Don't miss out on amazing deals! Flash sales, daily specials, and exclusive offers on ShopHub." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        
        
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-700 text-white py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="container mx-auto px-4 relative">
            <div className="text-center">
              <div className="flex justify-center items-center space-x-3 mb-6">
                <div className="bg-yellow-400 text-red-600 p-4 rounded-full animate-pulse">
                  <span className="text-3xl font-bold">⚡</span>
                </div>
                <h1 className="text-6xl font-bold">
                  MEGA DEALS
                </h1>
              </div>
              <p className="text-2xl mb-8 opacity-90">
                Up to 80% OFF on thousands of products!
              </p>
              
              {/* Countdown Timer */}
              <div className="flex justify-center space-x-4 mb-8">
                <div className="bg-white text-red-600 px-6 py-4 rounded-2xl font-bold text-center min-w-[100px]">
                  <div className="text-3xl">23</div>
                  <div className="text-sm">Hours</div>
                </div>
                <div className="bg-white text-red-600 px-6 py-4 rounded-2xl font-bold text-center min-w-[100px]">
                  <div className="text-3xl">45</div>
                  <div className="text-sm">Minutes</div>
                </div>
                <div className="bg-white text-red-600 px-6 py-4 rounded-2xl font-bold text-center min-w-[100px]">
                  <div className="text-3xl">12</div>
                  <div className="text-sm">Seconds</div>
                </div>
              </div>
              
              <div className="flex justify-center items-center space-x-6 text-lg opacity-90">
                <span>🚚 Free Shipping</span>
                <span>💳 Secure Payment</span>
                <span>↩️ Easy Returns</span>
              </div>
            </div>
          </div>
        </section>

        {/* Deal Categories */}
        <section className="py-8 bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: 'Electronics', icon: '📱', color: 'bg-blue-100 text-blue-600' },
                { name: 'Fashion', icon: '👕', color: 'bg-pink-100 text-pink-600' },
                { name: 'Home & Garden', icon: '🏠', color: 'bg-green-100 text-green-600' },
                { name: 'Sports', icon: '⚽', color: 'bg-orange-100 text-orange-600' },
                { name: 'Beauty', icon: '💄', color: 'bg-red-100 text-red-600' },
                { name: 'Books', icon: '📚', color: 'bg-purple-100 text-purple-600' }
              ].map((category, index) => (
                <Link key={index} href={`/products?category=${category.name.toLowerCase()}&deals=true`}>
                  <div className={`${category.color} px-6 py-3 rounded-full hover:shadow-lg transition-all cursor-pointer flex items-center space-x-2 font-semibold`}>
                    <span>{category.icon}</span>
                    <span>{category.name} Deals</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Flash Deals */}
        <section className="py-16 bg-gradient-to-br from-red-50 to-pink-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center space-x-3 mb-4">
                <span className="text-4xl">⚡</span>
                <h2 className="text-4xl font-bold text-gray-900">Flash Deals</h2>
              </div>
              <p className="text-gray-600 text-lg">Limited time offers - Grab them before they're gone!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {flashDealsToShow.map((product, index) => (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-red-200">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      ⚡ {product.discount || (40 + index * 5)}% OFF
                    </div>
                    <div className="absolute top-3 right-3 bg-yellow-400 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                      FLASH
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center mb-3">
                      <div className="flex text-yellow-400 text-sm">
                        {'★'.repeat(Math.floor(product.averageRating || 0))}{'☆'.repeat(5 - Math.floor(product.averageRating || 0))}
                      </div>
                      <span className="text-gray-600 text-sm ml-2">({product.reviewCount || 0})</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-red-600">৳{product.price}</span>
                        <span className="text-gray-500 line-through text-sm ml-2">
                          ৳{product.originalPrice || (product.price * 1.6).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-lg font-bold hover:from-red-600 hover:to-pink-700 transition-all transform hover:scale-105">
                      🛒 Grab Deal Now!
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Daily Deals */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center space-x-3 mb-4">
                <span className="text-4xl">🌟</span>
                <h2 className="text-4xl font-bold text-gray-900">Daily Specials</h2>
              </div>
              <p className="text-gray-600 text-lg">New deals every day - Check back daily for fresh offers!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dailyDealsToShow.map((product, index) => (
                <div key={product.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-200 hover:border-orange-200">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      -{product.discount || (30 + index * 3)}%
                    </div>
                    <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      TODAY
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center mb-3">
                      <div className="flex text-yellow-400 text-sm">
                        {'★'.repeat(Math.floor(product.averageRating || 0))}{'☆'.repeat(5 - Math.floor(product.averageRating || 0))}
                      </div>
                      <span className="text-gray-600 text-sm ml-2">({product.reviewCount || 0})</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-orange-600">৳{product.price}</span>
                        <span className="text-gray-500 line-through text-sm ml-2">
                          ৳{product.originalPrice || (product.price * 1.4).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-bold hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105">
                      🛍️ Shop Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deal Newsletter */}
        <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-4">Never Miss a Deal!</h2>
              <p className="text-xl mb-8 opacity-90">
                Subscribe to get notified about flash sales, exclusive offers, and daily deals
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email for deal alerts"
                  className="flex-1 px-6 py-4 rounded-xl text-gray-900 outline-none text-lg"
                />
                <button className="bg-yellow-400 text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors">
                  🔔 Get Deal Alerts
                </button>
              </div>
              
              <div className="flex justify-center items-center space-x-6 mt-8 text-sm opacity-80">
                <span>✓ Instant notifications</span>
                <span>✓ Exclusive member deals</span>
                <span>✓ No spam guarantee</span>
              </div>
            </div>
          </div>
        </section>

    
      </div>
    </>
  );
}
