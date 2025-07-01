import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Package, Clock, CheckCircle, Truck, X } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

interface Order {
  id: string;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  shippingAddress: string;
  createdAt: string;
  orderItems: OrderItem[];
}

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchOrders();
  }, [user, router]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4" />;
      case 'SHIPPED':
        return <Truck className="w-4 h-4" />;
      case 'DELIVERED':
        return <Package className="w-4 h-4" />;
      case 'CANCELLED':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const parseShippingAddress = (addressString: string) => {
    try {
      return JSON.parse(addressString);
    } catch {
      return { fullName: 'N/A', address: addressString };
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

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
    
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="p-8">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h2>
              <p className="text-gray-600 mb-6">You haven't placed any orders yet. Start shopping to see your orders here!</p>
              <Button onClick={() => router.push('/products')} className="bg-blue-600 hover:bg-blue-700">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
     
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
     
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <Button onClick={() => router.push('/products')} variant="outline">
            Continue Shopping
          </Button>
        </div>
        
        <div className="space-y-6">
          {orders.map((order) => {
            const shippingAddr = parseShippingAddress(order.shippingAddress);
            
            return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>Order #{order.id}</span>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex space-x-2">
                        <Badge className={getStatusColor(order.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(order.status)}
                            <span>{order.status}</span>
                          </span>
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      <p className="font-semibold text-lg">৳{order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Items */}
                    <div className="lg:col-span-2">
                      <h4 className="font-medium mb-3">Items Ordered</h4>
                      <div className="space-y-3">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
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
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                              <p className="text-sm text-gray-600">Price: ৳{item.price.toFixed(2)} each</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">৳{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping & Payment Info */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Shipping Address</h4>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">{shippingAddr.fullName}</p>
                          {shippingAddr.phone && <p>{shippingAddr.phone}</p>}
                          <p>{shippingAddr.address}</p>
                          {shippingAddr.city && (
                            <p>{shippingAddr.city}, {shippingAddr.state} {shippingAddr.zipCode}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Payment Method</h4>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <span className="mr-2">💰</span>
                            <span>{order.paymentMethod}</span>
                          </div>
                          {order.paymentMethod === 'Cash on Delivery' && order.paymentStatus === 'PENDING' && (
                            <p className="text-xs mt-1 text-blue-600">Pay when delivered</p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Information */}
                      {order.status === 'SHIPPED' && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center text-blue-800 mb-1">
                            <Truck className="w-4 h-4 mr-2" />
                            <span className="font-medium">Order Shipped</span>
                          </div>
                          <p className="text-xs text-blue-600">Expected delivery in 1-2 business days</p>
                        </div>
                      )}

                      {order.status === 'DELIVERED' && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center text-green-800 mb-1">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Delivered</span>
                          </div>
                          <p className="text-xs text-green-600">Order has been delivered successfully</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
  
    </div>
  );
};

export default OrdersPage;
