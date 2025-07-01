import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { format } from 'date-fns';
import { useCurrentSubdomain } from '../../../hooks/useCurrentSubdomain';

interface Order {
  id: string;
  status: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      image: string;
    };
  }>;
}

const AdminOrdersPage = () => {
  const { adminId, isAdminSubdomain } = useCurrentSubdomain();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (isAdminSubdomain) {
      if (adminId) {
        fetchOrders();
      } else {
        // Wait for adminId to load
        setLoading(true);
        setError(null);
      }
    } else {
      setLoading(false);
      setError('Not an admin subdomain');
    }
  }, [adminId, isAdminSubdomain]);

  // Only show loading if we're waiting for adminId or actively fetching
  const isLoadingData = loading || (isAdminSubdomain && !adminId);

  const fetchOrders = async () => {
    if (!adminId) {
      console.error('No adminId available');
      setError('Admin ID not available');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('Fetching orders for adminId:', adminId);
      const response = await fetch(`/api/admin/orders?adminId=${adminId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Orders fetched:', data);
        setOrders(data);
      } else {
        console.error('Failed to fetch orders:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError(`Failed to load orders: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Network error while fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}?adminId=${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
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

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  // Show error state
  if (error) {
    return (
      <AdminLayout title="Orders Management">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-600 text-lg mb-4">Error: {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (isLoadingData) {
    return (
      <AdminLayout title="Orders Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <div className="flex space-x-4">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customerName}</div>
                        <div className="text-sm text-gray-500">{order.customerEmail}</div>
                        <div className="text-sm text-gray-500">{order.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.orderItems.map((item, index) => (
                            <div key={item.id} className="flex items-center space-x-2 mb-1">
                              <img 
                                src={item.product.image || '/placeholder.jpg'} 
                                alt={item.product.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                              <span>{item.product.name} x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ৳{order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed Orders</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.status === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🚚</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shipped Orders</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.status === 'SHIPPED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Delivered Orders</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.status === 'DELIVERED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg shadow-sm">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrdersPage;
