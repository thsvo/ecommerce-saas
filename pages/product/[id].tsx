import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  category: {
    id: string;
    name: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    user: {
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  }>;
  averageRating?: number;
  reviewCount?: number;
  images?: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
}

const ProductDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderData, setOrderData] = useState({
    shippingAddress: '',
    phoneNumber: '',
    customerName: '',
    customerEmail: ''
  });
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [showPaymentCheckout, setShowPaymentCheckout] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState({
    shippingAddress: '',
    phoneNumber: '',
    customerName: '',
    customerEmail: ''
  });

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${id}`);
      
      if (!response.ok) {
        throw new Error('Product not found');
      }
      
      const data = await response.json();
      setProduct(data);
      
      // Set the main image as selected by default
      if (data.images && data.images.length > 0) {
        const mainImageIndex = data.images.findIndex((img: any) => img.isMain);
        setSelectedImage(mainImageIndex >= 0 ? mainImageIndex : 0);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      // Show success message based on user login status
      if (user) {
        alert('Product added to cart successfully!');
      } else {
        alert('Product added to cart! Please login to checkout.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    setShowCheckout(true);
  };

  const handleBuyNowWithPayment = () => {
    setShowPaymentCheckout(true);
  };

  const handlePaymentOrder = async () => {
    if (!product || !paymentOrderData.shippingAddress || !paymentOrderData.phoneNumber || !paymentOrderData.customerName) {
      alert('Please fill in all required fields');
      return;
    }

    setBuyingNow(true);
    try {
      // Prepare order data for direct purchase
      const orderPayload = {
        items: [{
          productId: product.id,
          quantity: quantity,
          price: product.price
        }],
        total: product.price * quantity,
        shippingAddress: JSON.stringify({
          fullName: paymentOrderData.customerName,
          phone: paymentOrderData.phoneNumber,
          address: paymentOrderData.shippingAddress,
          city: 'Customer City',
          state: 'Customer State',
          zipCode: '12345',
          country: 'Bangladesh'
        }),
        paymentMethod: 'SSLCommerz',
        customerInfo: {
          name: paymentOrderData.customerName,
          phone: paymentOrderData.phoneNumber,
          email: paymentOrderData.customerEmail || 'customer@example.com'
        },
        isDirectOrder: true
      };

      // Create order first
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

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
          amount: product.price * quantity,
          customerInfo: {
            name: paymentOrderData.customerName,
            email: paymentOrderData.customerEmail || 'customer@example.com',
            phone: paymentOrderData.phoneNumber
          },
          shippingAddress: {
            fullName: paymentOrderData.customerName,
            phone: paymentOrderData.phoneNumber,
            address: paymentOrderData.shippingAddress,
            city: 'Customer City',
            state: 'Customer State',
            zipCode: '12345',
            country: 'Bangladesh'
          }
        })
      });

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        if (paymentData.success) {
          // Redirect to SSLCommerz payment gateway
          window.location.href = paymentData.paymentUrl;
          return;
        } else {
          throw new Error('Failed to initialize payment: ' + paymentData.error);
        }
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Error with buy now payment:', error);
      alert(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBuyingNow(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!product || !orderData.shippingAddress || !orderData.phoneNumber || !orderData.customerName) {
      alert('Please fill in all required fields');
      return;
    }

    setIsOrdering(true);
    try {
      const orderPayload = {
        items: [{
          productId: product.id,
          quantity: quantity,
          price: product.price
        }],
        total: product.price * quantity,
        shippingAddress: orderData.shippingAddress,
        paymentMethod: 'Cash on Delivery',
        customerInfo: {
          name: orderData.customerName,
          phone: orderData.phoneNumber,
          email: orderData.customerEmail || ''
        },
        isDirectOrder: true
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      setOrderSuccess(true);
      setShowCheckout(false);
      setOrderData({ shippingAddress: '', phoneNumber: '', customerName: '', customerEmail: '' });
      setQuantity(1);
      router.push(`/thank-you?name=${orderData.customerName}`);
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsOrdering(false);
    }
  };

  const renderStars = (rating: number | undefined) => {
    const validRating = rating || 0;
    const stars = [];
    const fullStars = Math.floor(validRating);
    const hasHalfStar = validRating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">★</span>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">☆</span>
      );
    }

    const emptyStars = 5 - Math.ceil(validRating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">☆</span>
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
       
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
      
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>{product.name} - E-Commerce Store</title>
        <meta name="description" content={product.description} />
      </Head>

    

      <main className="flex-1">
        {orderSuccess && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Order placed successfully!</strong> Your order has been received and will be processed shortly. You will pay cash on delivery.
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button onClick={() => setOrderSuccess(false)} className="text-green-400 hover:text-green-600">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <a href="/" className="text-gray-400 hover:text-gray-500">Home</a>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <a href="/products" className="ml-4 text-gray-400 hover:text-gray-500">Products</a>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-gray-500">{product.category.name}</span>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-gray-700 font-medium">{product.name}</span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            {/* Image gallery */}
            <div className="flex flex-col-reverse">
              {/* Image selector - thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
                  <div className="grid grid-cols-4 gap-6">
                    {product.images.map((image, idx) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImage(idx)}
                        className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-offset-4 focus:ring-opacity-50 ${
                          selectedImage === idx ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <span className="sr-only">Image {idx + 1}</span>
                        <span className="absolute inset-0 rounded-md overflow-hidden">
                          <Image
                            src={image.url}
                            alt={`${product.name} view ${idx + 1}`}
                            fill
                            className="w-full h-full object-center object-cover"
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main image */}
              <div className="w-full aspect-w-1 aspect-h-1">
                <div className="relative h-96 w-full sm:h-[500px] lg:h-[600px]">
                  <Image
                    src={
                      product.images && product.images.length > 0
                        ? product.images[selectedImage]?.url || 
                          product.images.find(img => img.isMain)?.url ||
                          product.images[0]?.url ||
                          product.image
                        : product.image || '/placeholder-product.jpg'
                    }
                    alt={product.name}
                    fill
                    className="w-full h-full object-center object-cover sm:rounded-lg"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Product info */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>

              <div className="mt-3">
                <h2 className="sr-only">Product information</h2>
                <p className="text-3xl tracking-tight text-gray-900">৳{product.price.toFixed(2)}</p>
              </div>

              {/* Reviews */}
              <div className="mt-3">
                <h3 className="sr-only">Reviews</h3>
                <div className="flex items-center">
                  <div className="flex items-center">
                    {renderStars(product.averageRating)}
                  </div>
                  <p className="sr-only">{product.averageRating || 0} out of 5 stars</p>
                  <a href="#reviews" className="ml-3 text-sm font-medium text-blue-600 hover:text-blue-500">
                    {product.reviewCount || 0} reviews
                  </a>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="sr-only">Description</h3>
                <div className="text-base text-gray-700 space-y-6">
                  <p>{product.description}</p>
                </div>
              </div>

              {/* Stock status */}
              <div className="mt-6">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.stock > 0 
                      ? product.stock > 10 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock > 0 
                      ? product.stock > 10 
                        ? 'In Stock' 
                        : `Only ${product.stock} left`
                      : 'Out of Stock'
                    }
                  </span>
                  {product.stock > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({product.stock} available)
                    </span>
                  )}
                </div>
              </div>

              {product.stock > 0 && (
                <div className="mt-8">
                  {/* Quantity selector */}
                  <div className="flex items-center space-x-4 mb-6">
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-md">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="p-2 text-gray-600 hover:text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="px-4 py-2 text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock}
                        className="p-2 text-gray-600 hover:text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col space-y-4">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="w-full bg-yellow-400 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-black hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      {addingToCart ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Adding to Cart...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                          Add to Cart
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBuyNowWithPayment}
                      disabled={buyingNow}
                      className="w-full bg-blue-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {buyingNow ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Buy Now with Card Payment
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="w-full bg-orange-500 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Buy Now - Cash on Delivery
                    </button>
                  </div>

                  {/* Additional product info */}
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Free delivery on orders over ৳50</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-700">30-day return policy</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-sm text-gray-700">Secure payment</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reviews section */}
          {product.reviews.length > 0 && (
            <div id="reviews" className="mt-16 lg:mt-24">
              <div className="max-w-2xl mx-auto lg:max-w-7xl">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Customer Reviews</h2>
                
                <div className="mt-6 space-y-10 divide-y divide-gray-200 border-b border-t border-gray-200 pb-10">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="pt-10 lg:grid lg:grid-cols-12 lg:gap-x-8">
                      <div className="lg:col-start-5 lg:col-span-8 xl:col-start-4 xl:col-span-9 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:items-start">
                        <div className="flex items-center xl:col-span-1">
                          <div className="flex items-center">
                            {renderStars(review.rating)}
                          </div>
                          <p className="ml-3 text-sm text-gray-700">
                            Rated {review.rating} out of 5 stars
                          </p>
                        </div>

                        <div className="mt-4 lg:mt-6 xl:mt-0 xl:col-span-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {review.user.firstName} {review.user.lastName}
                          </h3>

                          <div className="mt-3 space-y-6 text-sm text-gray-500">
                            <p>{review.comment}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center text-sm lg:mt-0 lg:col-start-1 lg:col-span-4 lg:row-start-1 lg:flex-col lg:items-start xl:col-span-3">
                        <p className="font-medium text-gray-900">
                          {review.user.firstName} {review.user.lastName}
                        </p>
                        <time className="ml-4 border-l border-gray-200 pl-4 text-gray-500 lg:ml-0 lg:mt-2 lg:border-0 lg:pl-0">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Modal */}
        {showCheckout && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCheckout(false)} />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Complete Your Order
                      </h3>
                      
                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-4">
                          <Image
                            src={
                              product.images?.find(img => img.isMain)?.url ||
                              product.images?.[0]?.url ||
                              product.image ||
                              '/placeholder-product.jpg'
                            }
                            alt={product.name}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-500">Quantity: {quantity}</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ৳{(product.price * quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Customer Details Form */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={orderData.customerName}
                            onChange={(e) => setOrderData({ ...orderData, customerName: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            value={orderData.phoneNumber}
                            onChange={(e) => setOrderData({ ...orderData, phoneNumber: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your phone number"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={orderData.customerEmail}
                            onChange={(e) => setOrderData({ ...orderData, customerEmail: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delivery Address *
                          </label>
                          <textarea
                            value={orderData.shippingAddress}
                            onChange={(e) => setOrderData({ ...orderData, shippingAddress: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter your complete delivery address"
                            required
                          />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex">
                            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Cash on Delivery</h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                <p>You will pay ৳{(product.price * quantity).toFixed(2)} when the product is delivered.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isOrdering || !orderData.shippingAddress || !orderData.phoneNumber || !orderData.customerName}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isOrdering ? 'Placing Order...' : 'Place Order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Checkout Modal */}
        {showPaymentCheckout && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPaymentCheckout(false)} />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Complete Your Payment Order
                      </h3>
                      
                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-4">
                          <Image
                            src={
                              product.images?.find(img => img.isMain)?.url ||
                              product.images?.[0]?.url ||
                              product.image ||
                              '/placeholder-product.jpg'
                            }
                            alt={product.name}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-500">Quantity: {quantity}</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ৳{(product.price * quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Customer Details Form */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={paymentOrderData.customerName}
                            onChange={(e) => setPaymentOrderData({ ...paymentOrderData, customerName: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            value={paymentOrderData.phoneNumber}
                            onChange={(e) => setPaymentOrderData({ ...paymentOrderData, phoneNumber: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your phone number"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={paymentOrderData.customerEmail}
                            onChange={(e) => setPaymentOrderData({ ...paymentOrderData, customerEmail: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delivery Address *
                          </label>
                          <textarea
                            value={paymentOrderData.shippingAddress}
                            onChange={(e) => setPaymentOrderData({ ...paymentOrderData, shippingAddress: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter your complete delivery address"
                            required
                          />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex">
                            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800">Card Payment</h3>
                              <div className="mt-1 text-sm text-blue-700">
                                <p>You will be redirected to secure payment gateway to pay ৳{(product.price * quantity).toFixed(2)}.</p>
                                <p className="mt-1">Supported: Visa, MasterCard, Mobile Banking</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handlePaymentOrder}
                    disabled={buyingNow || !paymentOrderData.shippingAddress || !paymentOrderData.phoneNumber || !paymentOrderData.customerName || !paymentOrderData.customerEmail}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {buyingNow ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Proceed to Payment
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentCheckout(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default ProductDetail;
