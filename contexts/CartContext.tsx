import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
    category: {
      name: string;
    };
  };
}

interface LocalCartItem {
  productId: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  loading: boolean;
  localCartCount: number;
  addToLocalCart: (productId: string, quantity?: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [localCartItems, setLocalCartItems] = useState<LocalCartItem[]>([]);
  const { user, token } = useAuth();

  // Load local cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('guestCart');
    if (savedCart) {
      try {
        setLocalCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse local cart:', error);
        localStorage.removeItem('guestCart');
      }
    }
  }, []);

  // Save local cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('guestCart', JSON.stringify(localCartItems));
  }, [localCartItems]);

  useEffect(() => {
    if (user && token) {
      fetchCart();
      // Merge local cart with server cart when user logs in
      mergeLocalCartWithServer();
    } else {
      setCartItems([]);
    }
  }, [user, token]);

  const fetchCart = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems(response.data || []);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merge local cart with server cart when user logs in
  const mergeLocalCartWithServer = async () => {
    if (!token || localCartItems.length === 0) return;

    try {
      setLoading(true);
      // Add all local cart items to server
      for (const localItem of localCartItems) {
        await axios.post('/api/cart', {
          productId: localItem.productId,
          quantity: localItem.quantity
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      // Clear local cart after successful merge
      setLocalCartItems([]);
      localStorage.removeItem('guestCart');
      // Refresh server cart
      await fetchCart();
    } catch (error) {
      console.error('Failed to merge local cart with server:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add item to local cart (for guest users)
  const addToLocalCart = (productId: string, quantity: number = 1) => {
    setLocalCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === productId);
      let updatedItems;
      if (existingItem) {
        updatedItems = prevItems.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updatedItems = [...prevItems, { productId, quantity }];
      }
      
      // Save to localStorage immediately
      localStorage.setItem('guestCart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    // If user is not logged in, add to local cart
    if (!token) {
      addToLocalCart(productId, quantity);
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/cart', {
        productId,
        quantity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    if (!token) return;

    try {
      setLoading(true);
      await axios.put(`/api/cart/${itemId}`, { quantity }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update cart item');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!token) return;

    try {
      setLoading(true);
      await axios.delete(`/api/cart/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to remove item from cart');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!token) return;

    try {
      setLoading(true);
      await axios.delete('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems([]);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to clear cart');
    } finally {
      setLoading(false);
    }
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const localCartCount = localCartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCart,
    loading,
    localCartCount,
    addToLocalCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
