UPDATE "KitchenItem"
SET "productInfoPdfPath" = '/product-info/khf664611s-chimney-extractor-hood-product-info.pdf'
WHERE "code" = 'HOOD-C-FH664621E'
  AND "productInfoPdfPath" = '/product-info/extractor-hood-chimney-product-info.pdf';

UPDATE "KitchenItem"
SET "productInfoPdfPath" = '/product-info/ewa34660w-washing-machine-product-info.pdf'
WHERE "code" IN ('WM-B-EWA34660W', 'WM-C-EWA34660W')
  AND "productInfoPdfPath" = '/product-info/washing-machine-product-info.pdf';
