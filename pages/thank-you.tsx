import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { CheckCircle, CreditCard, Truck, Package } from 'lucide-react';

const ThankYouPage = () => {
  const router = useRouter();
  const { name, orderId, transactionId, payment } = router.query;
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isPaymentSuccess = payment === 'success';
  const customerName = name ? decodeURIComponent(name as string) : "Customer";

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setLoading(false);
    }
  };

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
              Thank You, {customerName}!
            </h1>
            
            {isPaymentSuccess ? (
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Your payment has been processed successfully and your order has been confirmed.
                </p>
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Payment Completed</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                Your order has been placed successfully. You will pay cash on delivery when your order arrives.
              </p>
            )}

            {/* Order Details */}
            {(orderId || transactionId) && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {orderId && (
                    <div>
                      <span className="font-medium text-gray-900">Order ID:</span>
                      <p className="text-gray-600">#{orderId}</p>
                    </div>
                  )}
                  {transactionId && (
                    <div>
                      <span className="font-medium text-gray-900">Transaction ID:</span>
                      <p className="text-gray-600">{transactionId}</p>
                    </div>
                  )}
                  {orderDetails && (
                    <>
                      <div>
                        <span className="font-medium text-gray-900">Total Amount:</span>
                        <p className="text-gray-600">৳{orderDetails.total}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Status:</span>
                        <p className={`font-medium ${orderDetails.status === 'CONFIRMED' ? 'text-green-600' : 'text-blue-600'}`}>
                          {orderDetails.status}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-3 flex items-center justify-center">
                <Package className="w-5 h-5 mr-2" />
                What happens next?
              </h3>
              <ul className="text-sm text-blue-700 text-left space-y-2">
                {isPaymentSuccess ? (
                  <>
                    <li>• Your payment has been confirmed</li>
                    <li>• Your order is being prepared for shipment</li>
                    <li>• You'll receive tracking information via email</li>
                    <li>• Expected delivery: 3-5 business days</li>
                  </>
                ) : (
                  <>
                    <li>• Your order has been received</li>
                    <li>• We'll process and prepare your order</li>
                    <li>• Delivery agent will contact you before delivery</li>
                    <li>• Pay cash when your order arrives</li>
                  </>
                )}
              </ul>
            </div>

            {/* Delivery Info */}
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-center mb-2">
                <Truck className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Expected Delivery</span>
              </div>
              <p className="text-green-700">3-5 business days</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {orderId && (
                <Button 
                  onClick={() => router.push('/orders')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Track Your Order
                </Button>
              )}
              
              <Button 
                onClick={() => router.push('/')} 
                variant="outline"
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>

            {/* Footer Message */}
            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              <p>
                {isPaymentSuccess 
                  ? "A confirmation email has been sent to your registered email address."
                  : "Keep your phone handy. Our delivery partner will call you before delivery."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThankYouPage;
