import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useCurrentSubdomain } from '../hooks/useCurrentSubdomain';
import Footer from '../components/Footer';
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
  reviewCount?: number;
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

const Products: React.FC = () => {
  const { user } = useAuth();
  const { addToCart, fetchCart } = useCart();
  const { getSubdomainApiEndpoint } = useCurrentSubdomain();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [filterCategory, setFilterCategory] = useState('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 12;

  // Fetch products from API
  const fetchProducts = async (page = 1, categoryId = '', search = '', sort = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (categoryId && categoryId !== 'all') {
        params.append('categoryId', categoryId);
      }
      
      if (search) {
        params.append('search', search);
      }

      if (sort && sort !== 'featured') {
        params.append('sortBy', sort);
      }

      const response = await fetch(getSubdomainApiEndpoint(`/api/products?${params}`));
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await fetch(getSubdomainApiEndpoint('/api/categories?limit=100'));
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts(1, filterCategory, searchTerm, sortBy);
  }, []);

  useEffect(() => {
    fetchProducts(1, filterCategory, searchTerm, sortBy);
  }, [filterCategory, searchTerm, sortBy]);

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
    fetchProducts(newPage, filterCategory, searchTerm, sortBy);
  };

  const handleCategoryChange = (categoryId: string) => {
    setFilterCategory(categoryId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1, filterCategory, searchTerm, sortBy);
  };

  const handleSortChange = (sortValue: string) => {
    setSortBy(sortValue);
    // The useEffect will trigger fetchProducts with the new sort value
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
        <title>Products - ShopHub</title>
        <meta name="description" content="Browse our amazing collection of products" />
      </Head>

      <div className="min-h-screen bg-gray-50">
   
        
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Our Products</h1>
            <p className="text-xl opacity-90">Discover amazing products at great prices</p>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="py-6 bg-white border-b">
          <div className="container mx-auto px-4">
            {/* Search Bar */}
            <div className="mb-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Filters and Sort */}
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
                  <option value="featured">Featured</option>
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
              Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} - {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} products
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
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

            {products.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">Try adjusting your filters or search terms.</p>
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

    
      </div>
    </>
  );
};

export default Products;
