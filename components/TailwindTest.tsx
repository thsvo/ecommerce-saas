import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="p-8 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg shadow-lg max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">🎉 Tailwind CSS is Working!</h2>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-400 rounded-full"></div>
          <span>Gradient backgrounds ✅</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
          <span>Spacing utilities ✅</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
          <span>Responsive design ✅</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
          <span>Custom colors ✅</span>
        </div>
      </div>
      <button className="mt-6 bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors w-full">
        Hover me! 🚀
      </button>
    </div>
  );
};

export default TailwindTest;
