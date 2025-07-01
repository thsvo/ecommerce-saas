import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Image from 'next/image';
import Link from 'next/link';

interface LocalCartItem {
  productId: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
}

const CartPage: React.FC = () => {
  const { user } = useAuth();
  const { cartItems, updateCartItem, removeFromCart, clearCart, cartTotal, loading: cartLoading } = useCart();
  const router = useRouter();
  const [localCartItems, setLocalCartItems] = useState<LocalCartItem[]>([]);
  const [localCartProducts, setLocalCartProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    if (user) {
      setLoading(cartLoading);
    } else {
      loadLocalCart();
    }
  }, [user, cartLoading]);

  // Debug: Log cart state changes
  useEffect(() => {
    if (!user) {
      console.log('Local cart items:', localCartItems);
      console.log('Local cart products:', localCartProducts);
      console.log('localStorage guestCart:', localStorage.getItem('guestCart'));
    }
  }, [localCartItems, localCartProducts, user]);

  const loadLocalCart = async () => {
    try {
      const savedCart = localStorage.getItem('guestCart');
      if (savedCart) {
        const localItems = JSON.parse(savedCart) as LocalCartItem[];
        setLocalCartItems(localItems);
        
        if (localItems.length > 0) {
          // Fetch product details for local cart items with better error handling
          const productPromises = localItems.map(async (item) => {
            try {
              const response = await fetch(`/api/products/${item.productId}`);
              if (response.ok) {
                return await response.json();
              } else {
                console.error(`Failed to fetch product ${item.productId}`);
                return null;
              }
            } catch (error) {
              console.error(`Error fetching product ${item.productId}:`, error);
              return null;
            }
          });
          
          const products = await Promise.all(productPromises);
          const validProducts = products.filter(p => p !== null);
          setLocalCartProducts(validProducts);
          
          // Remove items from cart if their products couldn't be fetched
          if (validProducts.length < localItems.length) {
            const validProductIds = validProducts.map(p => p.id);
            const filteredItems = localItems.filter(item => validProductIds.includes(item.productId));
            setLocalCartItems(filteredItems);
            localStorage.setItem('guestCart', JSON.stringify(filteredItems));
          }
        }
      }
    } catch (error) {
      console.error('Error loading local cart:', error);
      // Clear corrupted cart data
      localStorage.removeItem('guestCart');
      setLocalCartItems([]);
      setLocalCartProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLocalCartItem = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeLocalCartItem(productId);
      return;
    }

    const updatedItems = localCartItems.map(item =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    );
    setLocalCartItems(updatedItems);
    localStorage.setItem('guestCart', JSON.stringify(updatedItems));
    
    // Show save status
    setSaveStatus('Cart updated and saved!');
    setTimeout(() => setSaveStatus(''), 2000);
    
    // Force a re-render to ensure UI is updated
    setTimeout(() => {
      const savedCart = localStorage.getItem('guestCart');
      if (savedCart) {
        setLocalCartItems(JSON.parse(savedCart));
      }
    }, 100);
  };

  const removeLocalCartItem = (productId: string) => {
    const updatedItems = localCartItems.filter(item => item.productId !== productId);
    setLocalCartItems(updatedItems);
    localStorage.setItem('guestCart', JSON.stringify(updatedItems));
    setLocalCartProducts(prev => prev.filter(p => p.id !== productId));
    
    // Show save status
    setSaveStatus('Item removed and saved!');
    setTimeout(() => setSaveStatus(''), 2000);
    
    // If cart is empty, clear everything
    if (updatedItems.length === 0) {
      clearLocalCart();
    }
  };

  const clearLocalCart = () => {
    setLocalCartItems([]);
    setLocalCartProducts([]);
    localStorage.removeItem('guestCart');
    setSaveStatus('Cart cleared!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const getLocalCartTotal = () => {
    return localCartItems.reduce((total, item) => {
      const product = localCartProducts.find(p => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const handleQuantityChange = async (itemId: string, productId: string, newQuantity: number) => {
    if (user) {
      setUpdating(itemId);
      try {
        await updateCartItem(itemId, newQuantity);
      } catch (error) {
        console.error('Error updating cart item:', error);
        alert('Failed to update cart item');
      } finally {
        setUpdating(null);
      }
    } else {
      updateLocalCartItem(productId, newQuantity);
    }
  };

  const handleRemoveItem = async (itemId: string, productId: string) => {
    if (user) {
      setUpdating(itemId);
      try {
        await removeFromCart(itemId);
      } catch (error) {
        console.error('Error removing cart item:', error);
        alert('Failed to remove cart item');
      } finally {
        setUpdating(null);
      }
    } else {
      removeLocalCartItem(productId);
    }
  };

  const handleClearCart = async () => {
    if (user) {
      try {
        await clearCart();
      } catch (error) {
        console.error('Error clearing cart:', error);
        alert('Failed to clear cart');
      }
    } else {
      clearLocalCart();
    }
  };

  const handleCheckout = () => {
    if (!user) {
      alert('Please login to proceed to checkout');
      router.push('/auth/login');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  const displayItems = user ? cartItems : localCartProducts.map(product => {
    const localItem = localCartItems.find(item => item.productId === product.id);
    return {
      id: product.id,
      productId: product.id,
      quantity: localItem?.quantity || 0,
      product: product
    };
  }).filter(item => item.quantity > 0);

  const totalAmount = user ? cartTotal : getLocalCartTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          <p className="text-gray-600">
            {displayItems.length} {displayItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
          {!user && saveStatus && (
            <div className="mt-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
              {saveStatus}
            </div>
          )}
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <Link
              href="/products"
              className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Cart Items</h2>
                    <button
                      onClick={handleClearCart}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Clear Cart
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {displayItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                        <div className="flex-shrink-0">
                          <Image
                            src={item.product.image || '/placeholder-product.jpg'}
                            alt={item.product.name}
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-500">In stock: {item.product.stock}</p>
                          <p className="text-lg font-semibold text-orange-600 mt-1">
                            ${item.product.price.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.productId, item.quantity - 1)}
                            disabled={updating === item.id}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-orange-500 disabled:opacity-50"
                          >
                            <span className="text-lg">-</span>
                          </button>
                          
                          <span className="w-12 text-center font-medium">
                            {updating === item.id ? '...' : item.quantity}
                          </span>
                          
                          <button
                            onClick={() => handleQuantityChange(item.id, item.productId, item.quantity + 1)}
                            disabled={updating === item.id || item.quantity >= item.product.stock}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-orange-500 disabled:opacity-50"
                          >
                            <span className="text-lg">+</span>
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </p>
                          <button
                            onClick={() => handleRemoveItem(item.id, item.productId)}
                            disabled={updating === item.id}
                            className="text-red-600 hover:text-red-800 text-sm mt-1 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {totalAmount >= 50 ? 'Free' : '$5.99'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">${(totalAmount * 0.1).toFixed(2)}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${(totalAmount + (totalAmount >= 50 ? 0 : 5.99) + totalAmount * 0.1).toFixed(2)}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-6"
                >
                  {user ? 'Proceed to Checkout' : 'Login to Checkout'}
                </button>
                
                <Link
                  href="/products"
                  className="block w-full text-center bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors mt-3"
                >
                  Continue Shopping
                </Link>

                {!user && displayItems.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Guest Mode:</strong> Your cart is saved locally. 
                      <Link href="/auth/login" className="underline ml-1">Login</Link> to checkout and sync your cart.
                    </p>
                  </div>
                )}

                {/* Debug info for guest users */}
                {!user && process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Debug Info:</h4>
                    <p className="text-xs text-gray-600">Local items count: {localCartItems.length}</p>
                    <p className="text-xs text-gray-600">Products loaded: {localCartProducts.length}</p>
                    <p className="text-xs text-gray-600 break-all">
                      localStorage: {localStorage.getItem('guestCart')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default CartPage;
