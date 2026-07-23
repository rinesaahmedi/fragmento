UPDATE "CatalogArticle" AS target
SET "productInfoPdfPath" = paths.new_path
FROM (
  VALUES
    ('/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf', '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info.pdf'),
    ('/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf', '/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf'),
    ('/product-info/extractor-hoods/fh664621s/fh-664-621-s-product-info.pdf', '/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf'),
    ('/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf', '/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf'),
    ('/product-info/extractor-hoods/khf664611s/khf-664-611-s-chimney-extractor-hood-product-info.pdf', '/product-info/extractor-hoods/khf664611s/khf664611s-product-info.pdf'),
    ('/product-info/washing-machines/ewa34660w/ewa-34660-w-product-info.pdf', '/product-info/washing-machines/ewa34660w/ewa34660w-product-info.pdf'),
    ('/product-info/ovens/ebx943600s/ebx-943-600-s-product-info.pdf', '/product-info/ovens/ebx943600s/ebx943600s-product-info.pdf'),
    ('/product-info/hobs/ol-kmi754000e/ol-kmi-754-000-e-product-info.pdf', '/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf'),
    ('/product-info/lighting/led-set/led-lighting-set-elabel.pdf', '/product-info/lighting/led-set/led-set-elabel.pdf')
) AS paths(old_path, new_path)
WHERE target."productInfoPdfPath" = paths.old_path;

UPDATE "KitchenClaimPart" AS target
SET "productInfoPdfPath" = paths.new_path
FROM (
  VALUES
    ('/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf', '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info.pdf'),
    ('/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf', '/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf'),
    ('/product-info/extractor-hoods/fh664621s/fh-664-621-s-product-info.pdf', '/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf'),
    ('/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf', '/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf'),
    ('/product-info/extractor-hoods/khf664611s/khf-664-611-s-chimney-extractor-hood-product-info.pdf', '/product-info/extractor-hoods/khf664611s/khf664611s-product-info.pdf'),
    ('/product-info/washing-machines/ewa34660w/ewa-34660-w-product-info.pdf', '/product-info/washing-machines/ewa34660w/ewa34660w-product-info.pdf'),
    ('/product-info/ovens/ebx943600s/ebx-943-600-s-product-info.pdf', '/product-info/ovens/ebx943600s/ebx943600s-product-info.pdf'),
    ('/product-info/hobs/ol-kmi754000e/ol-kmi-754-000-e-product-info.pdf', '/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf'),
    ('/product-info/lighting/led-set/led-lighting-set-elabel.pdf', '/product-info/lighting/led-set/led-set-elabel.pdf')
) AS paths(old_path, new_path)
WHERE target."productInfoPdfPath" = paths.old_path;

UPDATE "KitchenItem" AS target
SET "productInfoPdfPath" = paths.new_path
FROM (
  VALUES
    ('/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf', '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info.pdf'),
    ('/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf', '/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf'),
    ('/product-info/extractor-hoods/fh664621s/fh-664-621-s-product-info.pdf', '/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf'),
    ('/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf', '/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf'),
    ('/product-info/extractor-hoods/khf664611s/khf-664-611-s-chimney-extractor-hood-product-info.pdf', '/product-info/extractor-hoods/khf664611s/khf664611s-product-info.pdf'),
    ('/product-info/washing-machines/ewa34660w/ewa-34660-w-product-info.pdf', '/product-info/washing-machines/ewa34660w/ewa34660w-product-info.pdf'),
    ('/product-info/ovens/ebx943600s/ebx-943-600-s-product-info.pdf', '/product-info/ovens/ebx943600s/ebx943600s-product-info.pdf'),
    ('/product-info/hobs/ol-kmi754000e/ol-kmi-754-000-e-product-info.pdf', '/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf'),
    ('/product-info/lighting/led-set/led-lighting-set-elabel.pdf', '/product-info/lighting/led-set/led-set-elabel.pdf')
) AS paths(old_path, new_path)
WHERE target."productInfoPdfPath" = paths.old_path;
