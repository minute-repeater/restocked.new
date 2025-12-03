import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { historyApi } from '@/api/history';
import { productsApi } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { ArrowLeft } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function ProductHistory() {
  const { id, variantId } = useParams<{ id: string; variantId: string }>();
  const productId = parseInt(id || '0', 10);
  const variantIdNum = parseInt(variantId || '0', 10);
  const navigate = useNavigate();

  const { data: productData } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getById(productId),
    enabled: !!productId,
  });

  const { data: variantData, isLoading: historyLoading } = useQuery({
    queryKey: ['variantHistory', variantIdNum],
    queryFn: () => historyApi.getVariantWithHistory(variantIdNum),
    enabled: !!variantIdNum,
  });

  const priceHistory = variantData?.priceHistory || [];
  const stockHistory = variantData?.stockHistory || [];

  const variant = productData?.variants.find((v) => v.id === variantIdNum);

  const priceChartData = {
    labels: priceHistory.map((entry) =>
      new Date(entry.recorded_at).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Price',
        data: priceHistory.map((entry) => entry.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const stockChartData = {
    labels: stockHistory.map((entry) =>
      new Date(entry.recorded_at).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Stock Status',
        data: stockHistory.map((entry) =>
          entry.status === 'in_stock' ? 1 : 0
        ),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(`/product/${productId}`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Product
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            History for Variant #{variantIdNum}
            {variant && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                ({Object.values(variant.attributes).join(', ')})
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="price" className="space-y-4">
        <TabsList>
          <TabsTrigger value="price">Price History</TabsTrigger>
          <TabsTrigger value="stock">Stock History</TabsTrigger>
          <TabsTrigger value="table">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="price">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>Price changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <p>Loading price history...</p>
              ) : !priceHistory.length ? (
                <p className="text-gray-500">No price history available</p>
              ) : (
                <Line data={priceChartData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Stock History</CardTitle>
              <CardDescription>Stock availability over time</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <p>Loading stock history...</p>
              ) : !stockHistory.length ? (
                <p className="text-gray-500">No stock history available</p>
              ) : (
                <Bar data={stockChartData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Price History Table</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p>Loading...</p>
                ) : !priceHistory.length ? (
                  <p className="text-gray-500">No price history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Price</th>
                          <th className="text-left p-2">Currency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map((entry) => (
                          <tr key={entry.id} className="border-b">
                            <td className="p-2">
                              {new Date(entry.recorded_at).toLocaleString()}
                            </td>
                            <td className="p-2">{entry.price}</td>
                            <td className="p-2">{entry.currency || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock History Table</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p>Loading...</p>
                ) : !stockHistory.length ? (
                  <p className="text-gray-500">No stock history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockHistory.map((entry) => (
                          <tr key={entry.id} className="border-b">
                            <td className="p-2">
                              {new Date(entry.recorded_at).toLocaleString()}
                            </td>
                            <td className="p-2">
                              <span
                                className={
                                  entry.status === 'in_stock'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }
                              >
                                {entry.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

