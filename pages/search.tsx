import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ProductCard from '../components/ProductCard';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  images?: Array<{ url: string; isMain: boolean }>;
  category: {
    id: string;
    name: string;
  };
  averageRating?: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  productCount: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const SearchPage: React.FC = () => {
  const router = useRouter();
  const { q, category } = router.query;
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [filterCategory, setFilterCategory] = useState('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const itemsPerPage = 12;

  useEffect(() => {
    if (router.isReady) {
      setSearchQuery((q as string) || '');
      setFilterCategory((category as string) || 'all');
      fetchCategories();
      performSearch(1, (q as string) || '', (category as string) || 'all', sortBy);
    }
  }, [router.isReady, q, category]);

  useEffect(() => {
    if (router.isReady) {
      performSearch(1, searchQuery, filterCategory, sortBy);
    }
  }, [sortBy, filterCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?limit=100');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const performSearch = async (page = 1, query = '', categoryId = '', sort = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (query.trim()) {
        params.append('search', query.trim());
      }
      
      if (categoryId && categoryId !== 'all') {
        params.append('categoryId', categoryId);
      }

      if (sort && sort !== 'relevance') {
        params.append('sortBy', sort);
      }

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to search products');
      
      const data = await response.json();
      setProducts(data.products || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNext: false,
        hasPrev: false
      });
    } catch (error) {
      console.error('Error searching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    performSearch(1, searchQuery, filterCategory, sortBy);
  };

  const handleAddToCart = async (productId: string) => {
    setAddingToCart(productId);
    try {
      await addToCart(productId, 1);
      if (user) {
        alert('Product added to cart successfully!');
      } else {
        alert('Product added to cart! Please login to checkout.');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add product to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleAddToWishlist = (productId: string) => {
    console.log('Adding to wishlist:', productId);
    // Implement add to wishlist logic
  };

  const handlePageChange = (newPage: number) => {
    performSearch(newPage, searchQuery, filterCategory, sortBy);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (categoryId: string) => {
    setFilterCategory(categoryId);
    if (categoryId === 'all') {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${categoryId}`);
    }
  };

  const handleSortChange = (sortValue: string) => {
    setSortBy(sortValue);
  };

  const getSearchTitle = () => {
    if (searchQuery && filterCategory !== 'all') {
      const cat = categories.find(c => c.id === filterCategory);
      return `"${searchQuery}" in ${cat?.name || 'Category'}`;
    } else if (searchQuery) {
      return `"${searchQuery}"`;
    } else if (filterCategory !== 'all') {
      const cat = categories.find(c => c.id === filterCategory);
      return `${cat?.name || 'Category'}`;
    }
    return 'All Products';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Search Results - Anjum's</title>
        <meta name="description" content="Search results for your query on Anjum's online store" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Search Results</h1>
            <p className="text-xl opacity-90">
              {pagination.totalItems > 0 
                ? `Found ${pagination.totalItems} results for ${getSearchTitle()}`
                : `No results found for ${getSearchTitle()}`
              }
            </p>
          </div>
        </section>

        {/* Search Bar */}
        <section className="py-6 bg-white border-b">
          <div className="container mx-auto px-4">
            <form onSubmit={handleSearch} className="flex gap-4 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search products, brands and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Filters and Sort */}
        <section className="py-6 bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-700">Filter by:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.productCount})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Name A-Z</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              {pagination.totalItems > 0 && (
                <>
                  Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} - {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
                </>
              )}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product: Product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      image: product.images && product.images.length > 0 
                        ? product.images.find(img => img.isMain)?.url || product.images[0].url || product.image
                        : product.image
                    }}
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                    isAddingToCart={addingToCart === product.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-6">🔍</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">No products found</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  We couldn't find any products matching your search. Try adjusting your filters or search terms.
                </p>
                <div className="space-y-4">
                  <p className="text-gray-700 font-medium">Try:</p>
                  <ul className="text-gray-600 space-y-2">
                    <li>• Checking your spelling</li>
                    <li>• Using fewer keywords</li>
                    <li>• Searching for more general terms</li>
                    <li>• Browsing our categories</li>
                  </ul>
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCategory('all');
                        router.push('/products');
                      }}
                      className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
                    >
                      Browse All Products
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    const isCurrentPage = pageNumber === pagination.currentPage;
                    
                    // Show first page, last page, current page, and 2 pages around current
                    if (
                      pageNumber === 1 ||
                      pageNumber === pagination.totalPages ||
                      (pageNumber >= pagination.currentPage - 2 && pageNumber <= pagination.currentPage + 2)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`px-3 py-2 rounded-lg ${
                            isCurrentPage
                              ? 'bg-orange-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    
                    // Show ellipsis
                    if (
                      pageNumber === pagination.currentPage - 3 ||
                      pageNumber === pagination.currentPage + 3
                    ) {
                      return <span key={pageNumber} className="px-2">...</span>;
                    }
                    
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Suggested Categories */}
        {products.length === 0 && (
          <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Browse Popular Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {categories.slice(0, 6).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setFilterCategory(category.id);
                      setSearchQuery('');
                      router.push(`/search?category=${category.id}`);
                    }}
                    className="group bg-gradient-to-br from-gray-50 to-white hover:from-orange-50 hover:to-red-50 p-6 rounded-2xl text-center transition-all duration-300 cursor-pointer border border-gray-100 hover:border-orange-200 hover:shadow-lg transform hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-white text-xl">📦</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 text-sm group-hover:text-orange-600 transition-colors">
                      {category.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{category.productCount} items</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default SearchPage;
