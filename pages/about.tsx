import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

const AboutPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>About Us - Anjum's</title>
        <meta name="description" content="Learn about Anjum's - Your trusted online shopping destination with quality products and exceptional service." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">About Anjum's</h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
              Your trusted partner in online shopping, delivering quality products and exceptional experiences since day one.
            </p>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Founded with a vision to revolutionize online shopping, Anjum's started as a small venture with big dreams. 
                  We believed that everyone deserves access to quality products at affordable prices, delivered right to their doorstep.
                </p>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Today, we've grown into a trusted e-commerce platform serving customers worldwide, but our core values remain unchanged: 
                  quality, affordability, and exceptional customer service.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">50M+</div>
                    <div className="text-gray-600">Products Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">1M+</div>
                    <div className="text-gray-600">Happy Customers</div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-8 shadow-2xl">
                  <div className="bg-white rounded-2xl p-8 text-center">
                    <div className="text-6xl mb-4">🛍️</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                    <p className="text-gray-600">
                      To make quality products accessible to everyone, everywhere, with unmatched convenience and service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
              <p className="text-gray-600 text-lg">The principles that guide everything we do</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow group">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🤝</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Trust & Integrity</h3>
                <p className="text-gray-600">
                  We build lasting relationships through honest communication, transparent pricing, and reliable service.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow group">
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quality First</h3>
                <p className="text-gray-600">
                  Every product in our catalog meets our strict quality standards, ensuring you get value for your money.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow group">
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">💡</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Innovation</h3>
                <p className="text-gray-600">
                  We continuously improve our platform and services to provide you with the best shopping experience.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow group">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">❤️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Focus</h3>
                <p className="text-gray-600">
                  Our customers are at the heart of everything we do. Your satisfaction is our top priority.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow group">
                <div className="bg-gradient-to-br from-red-400 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🌍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Global Reach</h3>
                <p className="text-gray-600">
                  Connecting customers worldwide with the products they love, no matter where they are.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow group">
                <div className="bg-gradient-to-br from-teal-400 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🌱</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sustainability</h3>
                <p className="text-gray-600">
                  Committed to eco-friendly practices and supporting sustainable products for a better future.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
              <p className="text-gray-600 text-lg">The passionate people behind Anjum's</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  name: "Anjum Rahman",
                  role: "Founder & CEO",
                  image: "👨‍💼",
                  description: "Visionary leader with 10+ years of e-commerce experience."
                },
                {
                  name: "Sarah Johnson",
                  role: "Head of Operations",
                  image: "👩‍💼",
                  description: "Operations expert ensuring smooth customer experiences."
                },
                {
                  name: "Mike Chen",
                  role: "Head of Technology",
                  image: "👨‍💻",
                  description: "Tech innovator building cutting-edge shopping solutions."
                },
                {
                  name: "Emily Davis",
                  role: "Customer Success Manager",
                  image: "👩‍🎓",
                  description: "Customer advocate dedicated to exceptional service."
                }
              ].map((member, index) => (
                <div key={index} className="text-center group">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <span className="text-5xl">{member.image}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-orange-600 font-semibold mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements Section */}
        <section className="py-16 bg-gradient-to-r from-orange-500 to-red-600 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Achievements</h2>
              <p className="text-xl opacity-90">Milestones we're proud of</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">2019</div>
                <div className="text-lg opacity-90">Company Founded</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">100K+</div>
                <div className="text-lg opacity-90">First 100K Customers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">50+</div>
                <div className="text-lg opacity-90">Countries Served</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">4.9/5</div>
                <div className="text-lg opacity-90">Customer Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to Start Shopping?</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Join millions of satisfied customers and discover amazing products at unbeatable prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/products"
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105"
              >
                Shop Now
              </Link>
              <Link 
                href="/contact"
                className="bg-white text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-lg font-semibold hover:border-orange-500 hover:text-orange-600 transition-all"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AboutPage;
