import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useCurrentSubdomain } from "../hooks/useCurrentSubdomain";
const Navbar: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { cartItems, cartCount, localCartCount } = useCart();
  const { 
    isAdminStore, 
    isCustomDomain, 
    customDomain, 
    subdomain, 
    isSubdomainAdmin,
    getStoreDisplayName,
    storeName 
  } = useCurrentSubdomain();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Hide navbar on admin routes
  // if (router.pathname.startsWith('/admin')) {
  //   return null;
  // }
  
  // Use cartCount for logged-in users, localCartCount for guests
  const cartItemsCount = user ? cartCount : localCartCount;
  const isAdmin = user?.role === "ADMIN";
  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-xs py-2">
        
        <div className="container mx-auto px-4 flex justify-between items-center">
          
          <div className="flex space-x-4">
            {isAdminStore && (
              <>
                <span className="text-orange-400 font-semibold">
                  🏪 {storeName || 'Store'}
                  {isCustomDomain ? (
                    <span className="ml-2 px-2 py-1 bg-green-600 rounded text-xs">Custom Domain</span>
                  ) : (
                    <span className="ml-2 px-2 py-1 bg-blue-600 rounded text-xs">Subdomain</span>
                  )}
                </span>
                <span>•</span>
              </>
            )}
            <span>Free shipping on orders over ৳50</span> <span>•</span>
            <span>24/7 Customer Support</span>
          </div>
          <div className="flex space-x-4">
            
            <Link href="/help" className="hover:text-gray-300">
              Help
            </Link>
            <Link href="/track-order" className="hover:text-gray-300">
              Track Order
            </Link>
          </div>
        </div>
      </div>
      {/* Main Navigation */}
      <div className="container mx-auto px-4">
        
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-2xl px-3 py-1 rounded">
              
              S
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Anjum's
            </span>
          </Link>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            
            <Link
              href="/"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              
              Home
            </Link>
            <Link
              href="/categories"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              
              Categories
            </Link>
            <Link
              href="/deals"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              
              Deals
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              
              Contact
            </Link>
          </div>
          {/* Right Section */}
          <div className="flex items-center space-x-4">
            
            {/* Cart */}
            <Link href="/cart" className="relative">
              
              <div className="flex items-center space-x-1 text-gray-700 hover:text-orange-600">
                
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8v6a1 1 0 001 1h8a1 1 0 001-1v-6M7 13v-2a5 5 0 1110 0v2"
                  />
                </svg>
                <span className="font-medium">Cart</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    
                    {cartItemsCount}
                  </span>
                )}
              </div>
            </Link>
            {/* User Menu */}
            {user ? (
              <div className="relative">
                
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-orange-600"
                >
                  
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    
                    {user.firstName?.charAt(0) || "U"}
                  </div>
                  <span className="font-medium">{user.firstName}</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      
                      My Profile
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      
                      My Orders
                    </Link>
                    <Link
                      href="/wishlist"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      
                      Wishlist
                    </Link>
                    {(isAdmin || isSubdomainAdmin) && (
                      <>
                        
                        <hr className="my-1" />
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-orange-600 hover:bg-gray-100 font-semibold"
                        >
                          
                          {isAdminStore ? `Admin Panel (${customDomain || subdomain})` : 'Admin Dashboard'}
                        </Link>
                      </>
                    )}
                    <hr className="my-1" />
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-orange-600 font-medium"
                >
                  
                  Login
                </Link>
                <span className="text-gray-400">|</span>
                <Link
                  href="/auth/register"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  
                  Sign Up
                </Link>
              </div>
            )}
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-700 hover:text-orange-600"
            >
              
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                Home
              </Link>
              <Link
                href="/categories"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                Categories
              </Link>
              <Link
                href="/deals"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                Deals
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                Contact
              </Link>
              {(isAdmin || isSubdomainAdmin) && (
                <Link
                  href="/admin"
                  className="text-orange-600 hover:text-orange-700 font-semibold"
                >
                  {isAdminStore ? `Admin Panel (${customDomain || subdomain})` : 'Admin Dashboard'}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
