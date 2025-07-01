import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-2 mb-6">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-2xl px-3 py-1 rounded">
                  S
                </div>
                <span className="text-2xl font-bold">ShopHub</span>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Your trusted online shopping destination for quality products at unbeatable prices. 
                Shop smart, save big with millions of products from around the world.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg transition duration-300">
                  <span className="text-xl">📘</span>
                </a>
                <a href="#" className="bg-blue-400 hover:bg-blue-500 p-3 rounded-lg transition duration-300">
                  <span className="text-xl">🐦</span>
                </a>
                <a href="#" className="bg-pink-600 hover:bg-pink-700 p-3 rounded-lg transition duration-300">
                  <span className="text-xl">�</span>
                </a>
                <a href="#" className="bg-red-600 hover:bg-red-700 p-3 rounded-lg transition duration-300">
                  <span className="text-xl">�</span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">🏠</span> Home
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">🛍️</span> All Products
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">📂</span> Categories
                  </Link>
                </li>
                <li>
                  <Link href="/deals" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">🔥</span> Hot Deals
                  </Link>
                </li>
                <li>
                  <Link href="/brands" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">⭐</span> Top Brands
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Customer Care</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">📞</span> Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">❓</span> Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/track-order" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">📦</span> Track Your Order
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">↩️</span> Returns & Refunds
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="text-gray-300 hover:text-orange-400 transition duration-300 flex items-center">
                    <span className="mr-2">🚚</span> Shipping Info
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact & Newsletter */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Stay Connected</h4>
              <div className="space-y-4 mb-6">
                <div className="flex items-center text-gray-300">
                  <span className="mr-3 text-orange-400">📧</span>
                  <span>support@shophub.com</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="mr-3 text-orange-400">📞</span>
                  <span>+1 (800) 123-4567</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="mr-3 text-orange-400">�</span>
                  <span>24/7 Customer Support</span>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h5 className="font-semibold mb-3">Newsletter</h5>
                <p className="text-gray-400 text-sm mb-3">Get exclusive deals and updates</p>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l-lg text-sm outline-none"
                  />
                  <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-r-lg text-sm font-semibold transition-colors">
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 ShopHub. All rights reserved. | Built with ❤️ for amazing shopping experience
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition duration-300">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition duration-300">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-white transition duration-300">
                Cookie Policy
              </Link>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <span className="text-gray-400 text-sm">We Accept:</span>
                <div className="flex space-x-2">
                  <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">VISA</div>
                  <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">MC</div>
                  <div className="bg-blue-800 text-white px-2 py-1 rounded text-xs font-semibold">AMEX</div>
                  <div className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">PayPal</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">Secured by:</span>
                <div className="flex space-x-2">
                  <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">SSL</div>
                  <div className="bg-blue-700 text-white px-2 py-1 rounded text-xs font-semibold">256-bit</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
