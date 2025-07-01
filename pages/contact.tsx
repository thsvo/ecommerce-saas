import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us - Anjum's</title>
        <meta name="description" content="Get in touch with Anjum's customer support. We're here to help with your questions, orders, and feedback." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">Contact Us</h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
              We're here to help! Reach out to us with any questions, concerns, or feedback. Our team is ready to assist you.
            </p>
          </div>
        </section>

        {/* Contact Methods Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Get In Touch</h2>
              <p className="text-gray-600 text-lg">Choose the best way to reach us</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              <div className="text-center group">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Phone Support</h3>
                <p className="text-gray-600 mb-2">Call us for immediate assistance</p>
                <p className="text-orange-600 font-semibold">+880 1234-567890</p>
                <p className="text-gray-500 text-sm">Mon-Fri, 9AM-6PM</p>
              </div>

              <div className="text-center group">
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">✉️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Email Support</h3>
                <p className="text-gray-600 mb-2">Send us a detailed message</p>
                <p className="text-orange-600 font-semibold">support@anjums.com</p>
                <p className="text-gray-500 text-sm">Response within 24 hours</p>
              </div>

              <div className="text-center group">
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Live Chat</h3>
                <p className="text-gray-600 mb-2">Chat with our support team</p>
                <button className="text-orange-600 font-semibold hover:text-orange-700">Start Chat</button>
                <p className="text-gray-500 text-sm">Available 24/7</p>
              </div>

              <div className="text-center group">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Visit Us</h3>
                <p className="text-gray-600 mb-2">Our office location</p>
                <p className="text-orange-600 font-semibold">Dhaka, Bangladesh</p>
                <p className="text-gray-500 text-sm">Mon-Fri, 9AM-5PM</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form & Info Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-3xl font-bold text-gray-900 mb-6">Send us a Message</h3>
                
                {submitStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">✅</span>
                      <span>Thank you! Your message has been sent successfully. We'll get back to you soon.</span>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">❌</span>
                      <span>Sorry, there was an error sending your message. Please try again.</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="order">Order Support</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing Question</option>
                      <option value="returns">Returns & Refunds</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Brief description of your inquiry"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      placeholder="Please provide details about your inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              </div>

              {/* Contact Info & FAQ */}
              <div className="space-y-8">
                {/* Quick Contact Info */}
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <span className="text-orange-600 text-xl">🏢</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Head Office</p>
                        <p className="text-gray-600">123 Commerce Street, Dhaka 1000, Bangladesh</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <span className="text-orange-600 text-xl">⏰</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Business Hours</p>
                        <p className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM</p>
                        <p className="text-gray-600">Saturday: 10:00 AM - 4:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <span className="text-orange-600 text-xl">🌐</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Social Media</p>
                        <div className="flex space-x-3 mt-2">
                          <a href="#" className="text-blue-500 hover:text-blue-600">Facebook</a>
                          <a href="#" className="text-blue-400 hover:text-blue-500">Twitter</a>
                          <a href="#" className="text-pink-500 hover:text-pink-600">Instagram</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">How can I track my order?</h4>
                      <p className="text-gray-600 text-sm">You can track your order using the tracking number sent to your email, or by logging into your account.</p>
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">What is your return policy?</h4>
                      <p className="text-gray-600 text-sm">We offer a 30-day return policy for most items. Items must be in original condition.</p>
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Do you offer international shipping?</h4>
                      <p className="text-gray-600 text-sm">Yes, we ship to over 50 countries worldwide. Shipping costs vary by location.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">How can I cancel my order?</h4>
                      <p className="text-gray-600 text-sm">Orders can be cancelled within 1 hour of placement. Contact our support team for assistance.</p>
                    </div>
                  </div>
                  <Link 
                    href="/faq" 
                    className="inline-block mt-4 text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    View All FAQs →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Contact Section */}
        <section className="py-12 bg-gradient-to-r from-red-500 to-pink-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-2xl font-bold mb-4">Need Urgent Help?</h3>
            <p className="text-lg opacity-90 mb-6">
              For urgent order issues or emergencies, contact our 24/7 hotline
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="tel:+8801234567890" 
                className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                📞 Call Now: +880 1234-567890
              </a>
              <a 
                href="mailto:emergency@anjums.com" 
                className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors"
              >
                📧 Emergency Email
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ContactPage;
