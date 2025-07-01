import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    category?: {
      name: string;
    };
    averageRating?: number;
    reviewCount?: number;
  };
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  isAddingToCart?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onAddToWishlist,
  isAddingToCart = false
}) => {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product.id);
    }
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToWishlist) {
      onAddToWishlist(product.id);
    }
  };

  const rating = product.averageRating || 4;
  const reviewCount = product.reviewCount || 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 group relative">
      <Link href={`/product/${product.id}`}>
        <div className="relative overflow-hidden">
          <Image
            src={product.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(product.name)}`}
            alt={product.name}
            width={300}
            height={200}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Wishlist Button */}
          <button
            onClick={handleAddToWishlist}
            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4 text-gray-600 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Sale Badge */}
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
            Sale
          </div>

          {/* Quick View Button */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Quick View
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Category */}
          {product.category && (
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {product.category.name}
            </span>
          )}
          
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center mb-3">
            <div className="flex text-yellow-400 text-sm">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i}>
                  {i < Math.floor(rating) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <span className="text-gray-600 text-sm ml-2">
              ({reviewCount})
            </span>
          </div>
          
          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-orange-600">
                ৳{product.price}
              </span>
              <span className="text-gray-500 line-through text-sm">
                ৳{(product.price * 1.3).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Add to Cart Button */}
      <div className="p-4 pt-0">
        <button
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
