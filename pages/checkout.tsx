import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle, MapPin, CreditCard, Truck } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const CheckoutPage: React.FC = () => {
  const { user } = useAuth();
  const cartContext = useCart();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'sslcommerz'>('cod');

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchCartItems();
  }, [user, router]);

  const fetchCartItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCartItems(data);
        if (data.length === 0) {
          router.push('/cart');
        }
      }
    } catch (error) {
      console.error('Failed to fetch cart items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = () => {
    return shippingAddress.fullName &&
           shippingAddress.phone &&
           shippingAddress.address &&
           shippingAddress.city &&
           shippingAddress.state &&
           shippingAddress.zipCode;
  };

  const handlePlaceOrder = async () => {
    if (!isFormValid()) return;

    setPlacing(true);
    try {
      const token = localStorage.getItem('token');
      
      if (paymentMethod === 'sslcommerz') {
        // First create the order
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            shippingAddress: JSON.stringify(shippingAddress),
            paymentMethod: 'SSLCommerz'
          })
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          const createdOrderId = orderData.order.id;
          
          // Initialize SSLCommerz payment
          const paymentResponse = await fetch('/api/payment/sslcommerz/init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: createdOrderId,
              amount: calculateTotal(),
              customerInfo: {
                name: user?.firstName + ' ' + user?.lastName,
                email: user?.email,
                phone: shippingAddress.phone
              },
              shippingAddress: shippingAddress
            })
          });

          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.success) {
              // Redirect to SSLCommerz payment gateway
              window.location.href = paymentData.paymentUrl;
              return;
            } else {
              alert('Failed to initialize payment: ' + paymentData.error);
            }
          } else {
            alert('Failed to initialize payment');
          }
        } else {
          const error = await orderResponse.json();
          alert(error.error || 'Failed to create order');
        }
      } else {
        // Cash on Delivery
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            shippingAddress: JSON.stringify(shippingAddress),
            paymentMethod: 'Cash on Delivery'
          })
        });

        if (response.ok) {
          const data = await response.json();
          setOrderId(data.order.id);
          setOrderPlaced(true);
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to place order');
        }
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
     
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>

      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50">
    
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h2>
              <p className="text-gray-600 mb-2">Your order ID is: <span className="font-semibold">#{orderId}</span></p>
              <p className="text-gray-600 mb-6">You will pay cash on delivery when your order arrives.</p>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Truck className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Expected Delivery</span>
                </div>
                <p className="text-blue-700">3-5 business days</p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/orders')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Track Your Order
                </Button>
                <Button 
                  onClick={() => router.push('/products')} 
                  variant="outline"
                  className="w-full"
                >
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
   
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
    
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={shippingAddress.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    value={shippingAddress.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="ZIP Code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SSLCommerz Payment */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'sslcommerz' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('sslcommerz')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center mr-3">
                        💳
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Online Payment</p>
                        <p className="text-sm text-gray-600">Pay securely with card, mobile banking, or net banking</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      paymentMethod === 'sslcommerz' 
                        ? 'bg-blue-600' 
                        : 'border-2 border-gray-300'
                    }`}>
                      {paymentMethod === 'sslcommerz' && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  {paymentMethod === 'sslcommerz' && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-blue-700">
                        Secured by SSLCommerz. Supports Visa, Mastercard, Mobile Banking (bKash, Rocket, Nagad), and Internet Banking.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cash on Delivery */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'cod' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3">
                        💰
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when your order arrives</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      paymentMethod === 'cod' 
                        ? 'bg-blue-600' 
                        : 'border-2 border-gray-300'
                    }`}>
                      {paymentMethod === 'cod' && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  {paymentMethod === 'cod' && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-blue-700">
                        You'll pay in cash when your order is delivered to your doorstep. Please have the exact amount ready.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-gray-400">📦</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product.name}</p>
                          <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">৳{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>৳{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>৳{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={!isFormValid() || placing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {placing 
                    ? 'Processing...' 
                    : paymentMethod === 'sslcommerz' 
                      ? 'Proceed to Payment' 
                      : 'Place Order'
                  }
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By placing this order, you agree to our terms and conditions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  
    </div>
  );
};

export default CheckoutPage;
