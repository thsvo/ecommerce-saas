import React from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PaymentCancelledPage: React.FC = () => {
  const router = useRouter();
  const { orderId, transactionId } = router.query;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            {/* Cancel Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-yellow-600" />
              </div>
            </div>

            {/* Cancel Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Cancelled
            </h1>
            <p className="text-gray-600 mb-6">
              You have cancelled the payment process. Your order has been cancelled and no amount has been charged.
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

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">What happened?</h3>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Payment process was cancelled by you</li>
                <li>• No amount has been charged from your account</li>
                <li>• Your order has been automatically cancelled</li>
                <li>• You can place a new order anytime</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/checkout')} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Payment Again
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
                If you're having trouble with the payment process, please contact our support team.
                We're here to help you complete your purchase.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;
