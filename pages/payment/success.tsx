import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { CheckCircle, Truck, Download, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PaymentSuccessPage: React.FC = () => {
  const router = useRouter();
  const { orderId, transactionId } = router.query;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for your payment. Your order has been confirmed and will be processed shortly.
            </p>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Order ID:</span>
                  <p className="text-gray-600">#{orderId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Transaction ID:</span>
                  <p className="text-gray-600">{transactionId}</p>
                </div>
                {order && (
                  <>
                    <div>
                      <span className="font-medium text-gray-900">Total Amount:</span>
                      <p className="text-gray-600">৳{order.total}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Payment Status:</span>
                      <p className="text-green-600 font-medium">{order.paymentStatus}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-center mb-2">
                <Truck className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Expected Delivery</span>
              </div>
              <p className="text-blue-700">3-5 business days</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/orders')} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Track Your Order
              </Button>
              
              <Button 
                onClick={() => router.push('/products')} 
                variant="outline"
                className="w-full"
              >
                Continue Shopping
              </Button>

              <Button 
                onClick={() => window.print()} 
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
            </div>

            {/* Footer Message */}
            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              <p>
                A confirmation email will be sent to your registered email address shortly.
                If you have any questions, please contact our customer support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
