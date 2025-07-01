import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCurrentSubdomain } from '../hooks/useCurrentSubdomain';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  productCount?: number;
}

export default function Categories() {
  const { getSubdomainApiEndpoint } = useCurrentSubdomain();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(getSubdomainApiEndpoint('/api/categories'));
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultCategories = [
    { 
      id: '1', 
      name: 'Electronics', 
      description: 'Latest gadgets, smartphones, laptops, and tech accessories',
      icon: '📱',
      color: 'from-blue-400 to-blue-600',
      productCount: 1250
    },
    { 
      id: '2', 
      name: 'Fashion', 
      description: 'Trendy clothing, shoes, and accessories for all seasons',
      icon: '👕',
      color: 'from-pink-400 to-pink-600',
      productCount: 2380
    },
    { 
      id: '3', 
      name: 'Home & Garden', 
      description: 'Furniture, decor, appliances, and gardening essentials',
      icon: '🏠',
      color: 'from-green-400 to-green-600',
      productCount: 890
    },
    { 
      id: '4', 
      name: 'Sports & Fitness', 
      description: 'Equipment, clothing, and accessories for active lifestyle',
      icon: '⚽',
      color: 'from-orange-400 to-orange-600',
      productCount: 650
    },
    { 
      id: '5', 
      name: 'Books & Media', 
      description: 'Books, magazines, movies, music, and educational content',
      icon: '📚',
      color: 'from-purple-400 to-purple-600',
      productCount: 3200
    },
    { 
      id: '6', 
      name: 'Beauty & Health', 
      description: 'Skincare, makeup, supplements, and wellness products',
      icon: '💄',
      color: 'from-red-400 to-red-600',
      productCount: 1150
    },
    { 
      id: '7', 
      name: 'Automotive', 
      description: 'Car parts, accessories, tools, and maintenance products',
      icon: '🚗',
      color: 'from-gray-400 to-gray-600',
      productCount: 540
    },
    { 
      id: '8', 
      name: 'Toys & Games', 
      description: 'Fun toys, board games, puzzles, and entertainment for all ages',
      icon: '🎮',
      color: 'from-yellow-400 to-yellow-600',
      productCount: 780
    },
    { 
      id: '9', 
      name: 'Baby & Kids', 
      description: 'Baby care products, toys, clothing, and children essentials',
      icon: '👶',
      color: 'from-teal-400 to-teal-600',
      productCount: 920
    },
    { 
      id: '10', 
      name: 'Food & Beverages', 
      description: 'Gourmet foods, snacks, beverages, and kitchen essentials',
      icon: '🍎',
      color: 'from-lime-400 to-lime-600',
      productCount: 1680
    },
    { 
      id: '11', 
      name: 'Office Supplies', 
      description: 'Stationery, office furniture, and business equipment',
      icon: '🖊️',
      color: 'from-indigo-400 to-indigo-600',
      productCount: 420
    },
    { 
      id: '12', 
      name: 'Pet Supplies', 
      description: 'Food, toys, accessories, and care products for pets',
      icon: '🐕',
      color: 'from-rose-400 to-rose-600',
      productCount: 360
    }
  ];

  const categoriesToShow = categories.length > 0 ? categories : defaultCategories;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>All Categories - ShopHub</title>
        <meta name="description" content="Browse all product categories on ShopHub. Find electronics, fashion, home goods, and more." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        
        
        {/* Header */}
        <section className="bg-gradient-to-r from-blue-900 to-purple-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-5xl font-bold mb-4">All Categories</h1>
              <p className="text-xl opacity-90">Discover millions of products across all categories</p>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {categoriesToShow.map((category, index) => {
                const defaultCategory = defaultCategories.find(dc => dc.name === category.name) || defaultCategories[index % defaultCategories.length];
                
                return (
                  <Link key={category.id} href={`/products?category=${category.id}`}>
                    <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 hover:border-orange-200">
                      <div className={`h-32 bg-gradient-to-br ${defaultCategory.color} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl group-hover:scale-110 transition-transform">
                            {defaultCategory.icon}
                          </span>
                        </div>
                        <div className="absolute top-4 right-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-1">
                          <span className="text-white text-sm font-semibold">
                            {defaultCategory.productCount || '100+'} items
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {category.description || defaultCategory.description}
                        </p>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-orange-600 font-semibold text-sm">
                            Explore Category →
                          </span>
                          <div className="bg-gray-100 group-hover:bg-orange-100 rounded-full p-2 transition-colors">
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular Categories */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-gray-900">Most Popular Categories</h2>
              <p className="text-gray-600 text-lg">Categories our customers love the most</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {defaultCategories.slice(0, 6).map((category, index) => (
                <Link key={index} href={`/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="text-center group cursor-pointer">
                    <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                      <span className="text-white text-3xl">{category.icon}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors text-sm">
                      {category.name}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1">{category.productCount} products</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>


      </div>
    </>
  );
}
