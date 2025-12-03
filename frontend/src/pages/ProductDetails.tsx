import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/products';
import { trackedItemsApi } from '@/api/trackedItems';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductImage } from '@/components/ProductImage';
import { Plus, ArrowLeft, ExternalLink } from 'lucide-react';

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getById(productId),
    enabled: !!productId,
  });

  const trackProductMutation = useMutation({
    mutationFn: () => trackedItemsApi.create({ product_id: productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      alert('Product added to watchlist!');
    },
  });

  const trackVariantMutation = useMutation({
    mutationFn: (variantId: number) =>
      trackedItemsApi.create({ product_id: productId, variant_id: variantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      alert('Variant added to watchlist!');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Product not found</p>
      </div>
    );
  }

  const { product, variants } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <ProductImage
              src={product.main_image_url}
              alt={product.name || 'Product image'}
              className="w-full h-64 lg:h-96 rounded-t-lg"
            />
            <CardHeader>
              <CardTitle className="text-2xl">{product.name || 'Unnamed Product'}</CardTitle>
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
            </CardHeader>
            <CardContent>
              {product.description && (
                <p className="text-gray-700 mb-4">{product.description}</p>
              )}
              {product.vendor && (
                <p className="text-sm text-gray-600">Vendor: {product.vendor}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={() => trackProductMutation.mutate()}
                disabled={trackProductMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {trackProductMutation.isPending ? 'Adding...' : 'Track This Product'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
          <CardDescription>
            {variants.length} variant{variants.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <p className="text-gray-500">No variants found</p>
          ) : (
            <div className="space-y-4">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="font-medium">Variant #{variant.id}</h4>
                      {variant.sku && (
                        <span className="text-sm text-gray-500">SKU: {variant.sku}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-gray-600">{String(value)}</span>
                        </div>
                      ))}
                      {variant.current_price && (
                        <div className="text-lg font-semibold text-green-600">
                          {variant.current_price} {variant.currency || ''}
                        </div>
                      )}
                      {variant.current_stock_status && (
                        <div className="text-sm">
                          <span className="font-medium">Stock:</span>{' '}
                          <span
                            className={
                              variant.current_stock_status === 'in_stock'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {variant.current_stock_status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/product/${productId}/history/${variant.id}`)}
                    >
                      View History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => trackVariantMutation.mutate(variant.id)}
                      disabled={trackVariantMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Track
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

