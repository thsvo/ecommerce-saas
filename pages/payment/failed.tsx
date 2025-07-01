import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PaymentFailedPage: React.FC = () => {
  const router = useRouter();
  const { orderId, transactionId, reason } = router.query;

  const getErrorMessage = (reason: string | string[] | undefined) => {
    switch (reason) {
      case 'validation_failed':
        return 'Payment validation failed. Please try again.';
      case 'payment_failed':
        return 'Payment was declined. Please check your payment details and try again.';
      case 'server_error':
        return 'A server error occurred. Please try again later.';
      default:
        return 'Payment could not be processed. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {getErrorMessage(reason)}
            </p>

            {/* Transaction Details */}
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
                </div>
              </div>
            )}

            {/* What to do next */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-yellow-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-yellow-700 text-left space-y-1">
                <li>• Your order has been cancelled</li>
                <li>• No amount has been charged</li>
                <li>• You can try placing the order again</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/checkout')} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => router.push('/cart')} 
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cart
              </Button>

              <Button 
                onClick={() => router.push('/products')} 
                variant="outline"
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>

            {/* Help Section */}
            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              <p>
                Need help? Contact our customer support at{' '}
                <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                  support@example.com
                </a>{' '}
                or call us at{' '}
                <a href="tel:+1234567890" className="text-blue-600 hover:underline">
                  +123 456 7890
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentFailedPage;
