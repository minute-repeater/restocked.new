import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { trackedItemsApi } from '@/api/trackedItems';
import { productsApi } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductImage } from '@/components/ProductImage';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { Plus, Trash2, ExternalLink, Package } from 'lucide-react';
import type { TrackedItem } from '@/types/api';

export function Dashboard() {
  const [url, setUrl] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['trackedItems'],
    queryFn: () => trackedItemsApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => trackedItemsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      setDeleteId(null);
    },
  });

  const handleAddProduct = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First create/fetch the product
      const productResponse = await productsApi.createByUrl(url);
      
      // Then add to tracked items
      await trackedItemsApi.create({
        product_id: productResponse.product.id,
        url: url,
      });

      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      setUrl('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const groupedItems = data?.items.reduce((acc, item) => {
    const productId = item.product_id;
    if (!acc[productId]) {
      acc[productId] = [];
    }
    acc[productId].push(item);
    return acc;
  }, {} as Record<number, TrackedItem[]>);

  return (
    <div>
      <UpgradeBanner />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your tracked products</p>
        </div>

      {/* Add Product Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a Product</CardTitle>
          <CardDescription>Track a product by entering its URL</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/product"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddProduct()}
            />
            <Button onClick={handleAddProduct} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Tracked Items */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading tracked items...</p>
        </div>
      ) : !data?.items.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No tracked items yet</p>
            <p className="text-sm text-gray-400">Use the form above to add a product</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems || {}).map(([productId, items]) => {
            const firstItem = items[0];
            const product = firstItem.product;
            
            return (
              <Card key={productId}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <ProductImage
                      src={product.main_image_url}
                      alt={product.name || 'Product image'}
                      className="w-full h-48 md:h-full rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">
                            {product.name || 'Unnamed Product'}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {product.url}
                            </a>
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/product/${productId}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        {item.product.main_image_url && (
                          <div className="flex-shrink-0 w-16 h-16">
                            <ProductImage
                              src={item.product.main_image_url}
                              alt={item.product.name || 'Product image'}
                              className="w-full h-full rounded-lg"
                              fallbackClassName="rounded-lg"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">
                                {item.variant
                                  ? `Variant: ${Object.values(item.variant.attributes).join(', ')}`
                                  : 'Product (All Variants)'}
                              </p>
                              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                {item.variant?.current_price && (
                                  <span>
                                    Price: {item.variant.current_price}{' '}
                                    {item.variant.attributes.currency || ''}
                                  </span>
                                )}
                                {item.variant?.current_stock_status && (
                                  <span>
                                    Stock: {item.variant.current_stock_status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Last updated: {new Date(item.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {item.variant && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/product/${productId}/history/${item.variant!.id}`)
                              }
                            >
                              View History
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Watchlist?</DialogTitle>
            <DialogDescription>
              This will stop tracking this item. You can add it back later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

