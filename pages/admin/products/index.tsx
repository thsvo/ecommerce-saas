import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import axios from 'axios';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Search, Image, X, Upload, Check } from 'lucide-react';
import { useCurrentSubdomain } from '../../../hooks/useCurrentSubdomain';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  featured: boolean;
  category: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    url: string;
    isMain: boolean;
  }[];
  averageRating?: number;
  reviewCount?: number;
}

interface Category {
  id: string;
  name: string;
}

const AdminProducts: React.FC = () => {
  const { getSubdomainApiEndpoint } = useCurrentSubdomain();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    stock: '',
    featured: false
  });
  
  const [uploadedImages, setUploadedImages] = useState<{id: string, url: string, isMain: boolean}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, searchTerm, selectedCategory]);

  useEffect(() => {
    if (imageFiles.length > 0) {
      const newImagePreviews = imageFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(newImagePreviews);

      // Clean up object URLs on component unmount or imageFiles change
      return () => {
        newImagePreviews.forEach(url => URL.revokeObjectURL(url));
      };
    } else {
      setImagePreviews([]);
    }
  }, [imageFiles]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && selectedCategory !== 'all' && { categoryId: selectedCategory })
      });

      const response = await axios.get(getSubdomainApiEndpoint(`/api/admin/subdomain-products?${params}`));
      setProducts(response.data.products);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(getSubdomainApiEndpoint('/api/categories?limit=100'));
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.price || !formData.categoryId) {
        setError('Please fill in all required fields (Name, Price, Category)');
        setSubmitting(false);
        return;
      }

      // Prepare data for API
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        image: formData.image.trim(),
        stock: parseInt(formData.stock) || 0,
        featured: formData.featured
      };

      // Validate price
      if (isNaN(submitData.price) || submitData.price <= 0) {
        setError('Please enter a valid price greater than 0');
        setSubmitting(false);
        return;
      }

      // Validate stock
      if (isNaN(submitData.stock) || submitData.stock < 0) {
        setError('Please enter a valid stock quantity (0 or greater)');
        setSubmitting(false);
        return;
      }

      let response;
      if (editingProduct) {
        response = await axios.put(`/api/products/${editingProduct.id}`, submitData);
        
        // If there are new images without a product ID, update them with the product ID
        if (uploadedImages.some(img => img.id.startsWith('temp_'))) {
          // Logic to link temporary images to the product would go here
          // In a real implementation, you'd need to handle this in your API
        }
      } else {
        response = await axios.post('/api/products', submitData);
        
      // If we have uploaded images for a new product, associate them with the product
        if (uploadedImages.length > 0 && response.data.id) {
          const productId = response.data.id;
          
          // Filter temporary images that need to be associated with the new product
          const tempImages = uploadedImages.filter(img => img.id.startsWith('temp_'));
          
          if (tempImages.length > 0) {
            // Update the product with the temporary images
            await axios.put(`/api/products/${productId}`, {
              tempImages: tempImages.map(img => ({
                url: img.url,
                isMain: img.isMain
              }))
            });
          }
        }
      }

      if (response.status === 200 || response.status === 201) {
        await fetchProducts();
        resetForm();
        setIsDialogOpen(false);
        // You could add a success message here if needed
      }
    } catch (error: any) {
      console.error('Failed to save product:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to save product. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      categoryId: product.category.id,
      image: product.image,
      stock: product.stock.toString(),
      featured: product.featured
    });
    
    // Reset image state
    setImageFiles([]);
    setImagePreviews([]);
    
    // Load product images if available
    if (product.images && product.images.length > 0) {
      setUploadedImages(product.images);
    } else {
      setUploadedImages([]);
    }
    
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      image: '',
      stock: '',
      featured: false
    });
    setUploadedImages([]);
    setImageFiles([]);
    setImagePreviews([]);
    setImageError('');
    setEditingProduct(null);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check file types
    const invalidFiles = Array.from(files).filter(file => !file.type.match(/^image\/(jpeg|png|jpg|webp)$/));
    if (invalidFiles.length > 0) {
      setImageError('Only JPG, PNG, and WebP images are allowed');
      return;
    }

    // Check file sizes (max 5MB per file)
    const oversizedFiles = Array.from(files).filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setImageError('Images must be less than 5MB in size');
      return;
    }
    
    // Update imageFiles state
    setImageFiles(Array.from(files));
    
    uploadFiles(files);
  };

  const uploadFiles = async (files: FileList) => {
    if (!editingProduct && !formData.name.trim()) {
      setError('Please enter a product name before uploading images');
      return;
    }

    setIsUploading(true);
    setImageError('');

    try {
      const formData = new FormData();
      
      // Add each file to form data
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      // Add product ID if editing, or indicate it's for a new product
      if (editingProduct) {
        formData.append('productId', editingProduct.id);
      } else {
        formData.append('isNew', 'true');
      }
      
      // Set first image as main if no images exist yet
      formData.append('isMain', (!uploadedImages || uploadedImages.length === 0).toString());

      const response = await axios.post('/api/products/upload-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadedImages(prev => [...prev, ...response.data.images]);
    } catch (error: any) {
      console.error('Failed to upload images:', error);
      setImageError(error.response?.data?.error || 'Failed to upload images');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      if (imageId.startsWith('temp_')) {
        // Remove from local state only for newly added images that aren't saved yet
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        // Delete from server for existing images
        await axios.delete(`/api/products/images?productId=${editingProduct?.id}&imageId=${imageId}`);
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      setImageError('Failed to delete image');
    }
  };

  const setMainImage = async (imageId: string) => {
    try {
      if (editingProduct) {
        await axios.put(`/api/products/images?productId=${editingProduct.id}`, { imageId });
        
        // Update local state
        setUploadedImages(prev => 
          prev.map(img => ({
            ...img,
            isMain: img.id === imageId
          }))
        );
      } else {
        // For new products, just update local state
        setUploadedImages(prev => 
          prev.map(img => ({
            ...img,
            isMain: img.id === imageId
          }))
        );
      }
    } catch (error) {
      console.error('Failed to set main image:', error);
      setImageError('Failed to set main image');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Products">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Products">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products Management</h1>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-200 relative">
                {product.images && product.images.length > 0 ? (
                  // Show the main image if available, otherwise show the first image
                  <img
                    src={product.images.find(img => img.isMain)?.url || product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No Image
                  </div>
                )}
                {product.featured && (
                  <Badge className="absolute top-2 right-2 bg-yellow-500">
                    Featured
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-green-600">
                      ৳{product.price.toFixed(2)}
                    </span>
                    <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                      Stock: {product.stock}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{product.category.name}</span>
                    <span>⭐ {product.averageRating ? product.averageRating.toFixed(1) : '0.0'} ({product.reviewCount || 0})</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? 'Update the product information below.' 
                : 'Fill in the details to add a new product to your inventory.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={!formData.name.trim() && error ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className={(!formData.price || parseFloat(formData.price) <= 0) && error ? 'border-red-500' : ''}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger className={!formData.categoryId && error ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="image">Image URL (Legacy support)</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label>Product Images</Label>
              <div className="mt-2 border border-dashed border-gray-300 rounded-md p-4">
                {imageError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                    {imageError}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3 mb-4">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="w-24 h-24 rounded-md overflow-hidden border border-gray-200">
                        <img 
                          src={image.url} 
                          alt="Product" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="p-1 bg-white rounded-full"
                          onClick={() => setMainImage(image.id)}
                          title="Set as main image"
                        >
                          {image.isMain ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Image className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="p-1 bg-white rounded-full"
                          onClick={() => handleDeleteImage(image.id)}
                          title="Delete image"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      {image.isMain && (
                        <div className="absolute -top-1 -right-1">
                          <Badge className="bg-green-500">Main</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="imageUpload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Images
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Upload JPG, PNG, or WebP images (max 5MB each)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              />
              <Label htmlFor="featured">Featured Product</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingProduct ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Add Product'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminProducts;
