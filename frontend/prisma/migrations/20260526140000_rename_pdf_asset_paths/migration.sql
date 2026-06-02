UPDATE "KitchenItem"
SET "productInfoPdfPath" = CASE "productInfoPdfPath"
  WHEN '/product-info/A-EGSPV597210_Produktinformation_Eco21.pdf' THEN '/product-info/a-egspv597210-product-info-eco21.pdf'
  WHEN '/product-info/EBX_943_600_S_Produktinformation.pdf' THEN '/product-info/ebx-943-600-s-product-info.pdf'
  WHEN '/product-info/FH_664_621_S_Produktinformation.pdf' THEN '/product-info/fh-664-621-s-product-info.pdf'
  WHEN '/product-info/KGC_15495_S_Produktinformation_Eco21.pdf' THEN '/product-info/kgc-15495-s-product-info-eco21.pdf'
  WHEN '/product-info/OL-KMI_754_000_E_Produktinformation.pdf' THEN '/product-info/ol-kmi-754-000-e-product-info.pdf'
  WHEN '/product-info/khf664611s-chimney-extractor-hood-product-info.pdf' THEN '/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf'
  WHEN '/product-info/extractor-hood-chimney-product-info.pdf' THEN '/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf'
  WHEN '/product-info/ewa34660w-washing-machine-product-info.pdf' THEN '/product-info/ewa-34660-w-product-info.pdf'
  WHEN '/product-info/washing-machine-product-info.pdf' THEN '/product-info/ewa-34660-w-product-info.pdf'
  WHEN '/product-info/led-lighting-set-label.pdf' THEN '/product-info/led-lighting-set-elabel.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" IN (
  '/product-info/A-EGSPV597210_Produktinformation_Eco21.pdf',
  '/product-info/EBX_943_600_S_Produktinformation.pdf',
  '/product-info/FH_664_621_S_Produktinformation.pdf',
  '/product-info/KGC_15495_S_Produktinformation_Eco21.pdf',
  '/product-info/OL-KMI_754_000_E_Produktinformation.pdf',
  '/product-info/khf664611s-chimney-extractor-hood-product-info.pdf',
  '/product-info/extractor-hood-chimney-product-info.pdf',
  '/product-info/ewa34660w-washing-machine-product-info.pdf',
  '/product-info/washing-machine-product-info.pdf',
  '/product-info/led-lighting-set-label.pdf'
);
