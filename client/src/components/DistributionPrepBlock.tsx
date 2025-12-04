import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Globe, Video, Mail, Save, DollarSign } from "lucide-react";
import type { Product, DistributionData } from "@shared/schema";

interface DistributionPrepBlockProps {
  stageId: string;
  projectId: string;
  distributionData: DistributionData | null;
}

export function DistributionPrepBlock({ 
  stageId, 
  projectId, 
  distributionData 
}: DistributionPrepBlockProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [productPrices, setProductPrices] = useState<Record<string, number>>(
    distributionData?.productPrices || {}
  );
  const [websiteDescription, setWebsiteDescription] = useState(
    distributionData?.websiteDescription || ""
  );
  const [videoDescription, setVideoDescription] = useState(
    distributionData?.videoDescription || ""
  );
  const [mailingText, setMailingText] = useState(
    distributionData?.mailingText || ""
  );
  const [hasChanges, setHasChanges] = useState(false);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/projects", projectId, "products"],
  });

  useEffect(() => {
    if (distributionData) {
      setProductPrices(distributionData.productPrices || {});
      setWebsiteDescription(distributionData.websiteDescription || "");
      setVideoDescription(distributionData.videoDescription || "");
      setMailingText(distributionData.mailingText || "");
    }
  }, [distributionData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/stages/${stageId}`, {
        distributionData: {
          productPrices,
          websiteDescription,
          videoDescription,
          mailingText,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setHasChanges(false);
      toast({ title: t("distribution.saved") });
    },
    onError: () => {
      toast({ 
        title: t("distribution.saveFailed"), 
        variant: "destructive" 
      });
    },
  });

  const handlePriceChange = (productId: string, value: string) => {
    if (value === "" || value === undefined) {
      const newPrices = { ...productPrices };
      delete newPrices[productId];
      setProductPrices(newPrices);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setProductPrices(prev => ({
          ...prev,
          [productId]: numValue,
        }));
      }
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (productsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" />
            {t("distribution.productPrices")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products && products.length > 0 ? (
            <div className="space-y-3">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`distribution-product-${product.id}`}
                >
                  <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    {product.article && (
                      <p className="text-sm text-muted-foreground">
                        {t("distribution.article")}: {product.article}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-32 text-right"
                      value={productPrices[product.id] || ""}
                      onChange={(e) => handlePriceChange(product.id, e.target.value)}
                      data-testid={`input-price-${product.id}`}
                    />
                    <span className="text-muted-foreground">₽</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              {t("distribution.noProducts")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-primary" />
            {t("distribution.websiteDescription")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t("distribution.websiteDescriptionPlaceholder")}
            value={websiteDescription}
            onChange={(e) => {
              setWebsiteDescription(e.target.value);
              setHasChanges(true);
            }}
            className="min-h-[120px]"
            data-testid="textarea-website-description"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-5 w-5 text-primary" />
            {t("distribution.videoDescription")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t("distribution.videoDescriptionPlaceholder")}
            value={videoDescription}
            onChange={(e) => {
              setVideoDescription(e.target.value);
              setHasChanges(true);
            }}
            className="min-h-[120px]"
            data-testid="textarea-video-description"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-primary" />
            {t("distribution.mailingText")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t("distribution.mailingTextPlaceholder")}
            value={mailingText}
            onChange={(e) => {
              setMailingText(e.target.value);
              setHasChanges(true);
            }}
            className="min-h-[120px]"
            data-testid="textarea-mailing-text"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending || !hasChanges}
          data-testid="button-save-distribution"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
