# Database Elements Report

Generated: 2026-06-10T11:43:13.828Z
Database: local PostgreSQL `fragmento`, schema `public`.

## Tables
| Table | Rows |
|---|---:|
| AdminUser | 2 |
| HousingCompany | 10 |
| Kitchen | 5 |
| KitchenContract | 15 |
| KitchenItem | 93 |
| Order | 43 |
| OrderItem | 186 |
| Project | 17 |
| PropertyObject | 17 |
| ServiceClaim | 51 |
| ServiceClaimKnowledgeEntry | 123 |
| _prisma_migrations | 36 |

## KitchenItem Columns
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | NO |  |
| kitchenId | text | NO |  |
| itemType | USER-DEFINED | NO |  |
| code | text | NO |  |
| name | text | NO |  |
| price | numeric | NO |  |
| infoText | text | YES |  |
| iconKey | text | YES |  |
| colorKey | text | YES |  |
| componentKey | text | YES |  |
| isLocked | boolean | NO | false |
| isActive | boolean | NO | true |
| sortOrder | integer | NO | 0 |
| createdAt | timestamp without time zone | NO | CURRENT_TIMESTAMP |
| updatedAt | timestamp without time zone | NO |  |
| articleNumber | text | YES |  |
| productInfoPdfPath | text | YES |  |
| productInfoSummary | text | YES |  |
| productInfoExtractedText | text | YES |  |
| productInfoUpdatedAt | timestamp without time zone | YES |  |
| productInfoKeyFacts | jsonb | YES |  |
| productImagePath | text | YES |  |

## KitchenItem Data
| Kitchen | Sort | Type | Code | Article | Name | Price | Icon | Color | Component | Locked | Active |
|---|---:|---|---|---|---|---:|---|---|---|---|---|
| fragmento-default | 10 | COMPONENT | DISH-600-STD | - | Spülmaschine | 579 | dishwasher | #001f7f | - | false | true |
| fragmento-default | 20 | COMPONENT | REF-545-1800-700 | - | Kühlschrank | 579 | refrigerator | black | - | false | true |
| fragmento-default | 30 | COMPONENT | CAB-BASE-030 | - | Unterschrank 30cm | 175 | base_cabinet_30 | #ffbf00 | - | false | true |
| fragmento-default | 40 | COMPONENT | CAB-WALL-L-060 | - | Oberschrank (links) | 115 | wall_cabinet_l | #00ffbf | - | false | true |
| fragmento-default | 50 | COMPONENT | CAB-WALL-R-060 | - | Oberschrank (rechts) | 115 | wall_cabinet_r | #394c00 | - | false | true |
| fragmento-default | 60 | COMPONENT | HOOD-600-FLAT | - | Dunstabzugshaube | 349 | extractor_hood | #ff7f9f | - | false | true |
| fragmento-default | 100 | ACCESSORY | ACC-WASTE-001 | - | Mülltrennsystem | 89 | waste_system | - | - | false | true |
| fragmento-default | 110 | ACCESSORY | ACC-CUTLERY-001 | - | Besteckeinsatz 30cm | 19 | cutlery_insert | - | - | false | true |
| fragmento-default | 120 | ACCESSORY | ACC-LIGHT-003 | - | Beleuchtungsset 3 LED-Spots | 69 | lighting_set | - | - | false | true |
| fragmento-default | 200 | SERVICE | SVC-MONTAGE-001 | - | Lieferung, Vertragen, Montage und Anschluss | 349 | delivery_assembly | - | - | false | true |
| fragmento-default | 210 | SERVICE | SVC-PICKUP-001 | - | Abholung an Logistikstandort | 0 | pickup | - | - | false | true |
| kitchen-model-b | 10 | COMPONENT | CAB-WALL-B-L-600 | - | Wall Cabinet left (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #00ffbf | wall-cabinet-1 | false | true |
| kitchen-model-b | 20 | COMPONENT | CAB-WALL-B-ML-600 | - | Wall Cabinet mid-left (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #00ffbf | wall-cabinet-2 | false | true |
| kitchen-model-b | 30 | COMPONENT | CAB-WALL-B-MR-600 | - | Wall Cabinet mid-right (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #394c00 | wall-cabinet-3 | false | true |
| kitchen-model-b | 40 | COMPONENT | CAB-HOOD-B-600 | - | Hood Wall Cabinet (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #394c00 | wall-cabinet-4 | false | true |
| kitchen-model-b | 50 | COMPONENT | CAB-WALL-B-R-600 | - | Wall Cabinet right (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #ff7f9f | wall-cabinet-5 | false | true |
| kitchen-model-b | 52 | COMPONENT | HOOD-B-FH664621E | FH 664 621 S | FH664621E Extractor Hood | 349 | extractor_hood | #394c00 | extractor-hood | false | true |
| kitchen-model-b | 55 | COMPONENT | LIGHT-B-LED-001 | KA220043_S3 | LED Lighting Set | 69 | under_cabinet_light | #666666 | under-cabinet-light | false | true |
| kitchen-model-b | 60 | COMPONENT | WM-B-EWA34660W | EWA34660W | Washing Machine (600 x 600 x 878 mm) | 548 | washing_machine_base | springgreen | base-module-1 | false | true |
| kitchen-model-b | 70 | COMPONENT | SINKBASE-B-600 | - | Sink Base Cabinet (600 x 600 x 878 mm) | 0 | sink_base | springgreen | base-module-2 | true | true |
| kitchen-model-b | 80 | COMPONENT | DISH-B-600-STD | A-EGSPV597210 | Dishwasher (600 x 600 x 878 mm) | 579 | dishwasher_base | #001f7f | base-module-3 | false | true |
| kitchen-model-b | 85 | COMPONENT | TOP-B-3036 | - | Worktop (40 x 600 x 3036 mm) | 0 | worktop | springgreen | worktop | true | true |
| kitchen-model-b | 90 | COMPONENT | OVEN-B-600-HOB | - | Built-in Oven and Hob (600 x 600 x 878 mm) | 449 | oven_base | springgreen | oven-module | true | true |
| kitchen-model-b | 100 | COMPONENT | CAB-BASE-B-STR | - | Base Storage Cabinet (600 x 600 x 878 mm) | 1150 | drawer_base | #ffbf00 | drawer-module | false | true |
| kitchen-model-b | 110 | COMPONENT | REF-B-545-1800-700 | KGC 15495 S | Refrigerator (545 x 1800 x 700 mm) | 579 | tall_refrigerator | black | refrigerator | false | true |
| kitchen-model-b | 120 | COMPONENT | SINK-B-BOTTON-45 | 517467 | Sink and Waste System | 89 | sink_faucet | black | sink-faucet | true | true |
| kitchen-model-b | 200 | ACCESSORY | ACC-WASTE-001 | - | Mülltrennsystem | 89 | waste_system | - | - | false | true |
| kitchen-model-b | 210 | ACCESSORY | ACC-CUTLERY-ZB60SG | ZB60SG | Besteckeinsatz ZB60SG | 25 | cutlery_insert | - | - | false | true |
| kitchen-model-b | 220 | ACCESSORY | ACC-LIGHT-003 | KA220043_S3 | Beleuchtungsset 3 LED-Spots | 69 | lighting_set | - | - | false | true |
| kitchen-model-b | 300 | SERVICE | SVC-MONTAGE-001 | - | Lieferung, Vertragen, Montage und Anschluss | 349 | delivery_assembly | - | - | false | true |
| kitchen-model-b | 310 | SERVICE | SVC-PICKUP-001 | - | Abholung an Logistikstandort | 0 | pickup | - | - | false | true |
| kitchen-model-c | 10 | COMPONENT | REF-C-545-1800-700 | KGC 15495 S | Refrigerator (545 x 1800 x 700 mm) | 579 | tall_refrigerator | black | refrigerator | false | true |
| kitchen-model-c | 20 | COMPONENT | HOOD-C-FH664621E | KHF 664 611 S Stripe X | KHF664611S Chimney Extractor Hood | 349 | extractor_hood_chimney | #8a6b34 | extractor-hood | false | true |
| kitchen-model-c | 30 | COMPONENT | CAB-COOK-C-L-600 | - | Base Cabinet (2 Drawers) Left (600 x 600 x 878 mm) | 199 | drawer_base_two | #f0a500 | cook-base-left | false | true |
| kitchen-model-c | 40 | COMPONENT | OVEN-C-600-HOB | - | Built-in Oven and Hob (600 x 600 x 878 mm) | 449 | oven_base | #00c76a | oven-base | true | true |
| kitchen-model-c | 50 | COMPONENT | CAB-COOK-C-R-600 | - | Base Cabinet (2 Drawers) Right (600 x 600 x 878 mm) | 199 | drawer_base_two | #ffbf00 | cook-base-right | false | true |
| kitchen-model-c | 60 | COMPONENT | CAB-WALL-C-L-600 | - | Wall Cabinet left (600 x 723 x 320 mm) | 139 | wall_cabinet_standard | #00ffbf | wall-cabinet-1 | false | true |
| kitchen-model-c | 70 | COMPONENT | CAB-WALL-C-ML-600 | - | Wall Cabinet mid-left (600 x 723 x 320 mm) | 139 | wall_cabinet_standard | #00ffbf | wall-cabinet-2 | false | true |
| kitchen-model-c | 80 | COMPONENT | CAB-WALL-C-MR-600 | - | Wall Cabinet mid-right (600 x 723 x 320 mm) | 139 | wall_cabinet_standard | #394c00 | wall-cabinet-3 | false | true |
| kitchen-model-c | 90 | COMPONENT | CAB-WALL-C-R-600 | - | Wall Cabinet right (600 x 723 x 320 mm) | 139 | wall_cabinet_standard | #ff7f9f | wall-cabinet-4 | false | true |
| kitchen-model-c | 100 | COMPONENT | LIGHT-C-LED-001 | KA220043_S3 | LED Lighting Set | 69 | under_cabinet_light | #666666 | under-cabinet-light | false | true |
| kitchen-model-c | 110 | COMPONENT | WM-C-EWA34660W | EWA34660W | Washing Machine (600 x 600 x 878 mm) | 548 | washing_machine_base | springgreen | wm-base | false | true |
| kitchen-model-c | 120 | COMPONENT | SINKBASE-C-600 | - | Sink Base Cabinet (600 x 600 x 878 mm) | 0 | sink_base | springgreen | sink-base | true | true |
| kitchen-model-c | 130 | COMPONENT | DISH-C-600-STD | A-EGSPV597210 | Dishwasher (600 x 600 x 878 mm) | 579 | dishwasher_base | #001f7f | dishwasher-base | false | true |
| kitchen-model-c | 135 | COMPONENT | TOP-C-4000 | - | Worktop (40 x 600 x 4000 mm) | 0 | worktop | springgreen | worktop | true | true |
| kitchen-model-c | 140 | COMPONENT | CAB-DRAWER-C-3D | - | Base Cabinet (3 Drawers) (600 x 600 x 878 mm) | 229 | drawer_base_three | #ffbf00 | drawer-base-3 | false | true |
| kitchen-model-c | 150 | COMPONENT | SINK-C-BOTTON-45 | 517467 | Sink and Waste System | 89 | sink_faucet | black | sink-faucet | true | true |
| kitchen-model-c | 200 | ACCESSORY | ACC-WASTE-001 | - | Mülltrennsystem | 89 | waste_system | - | - | false | true |
| kitchen-model-c | 210 | ACCESSORY | ACC-CUTLERY-001 | ZB60SG | Besteckeinsatz 30cm | 19 | cutlery_insert | - | - | false | true |
| kitchen-model-c | 220 | ACCESSORY | ACC-LIGHT-003 | KA220043_S3 | Beleuchtungsset 3 LED-Spots | 69 | lighting_set | - | - | false | true |
| kitchen-model-c | 300 | SERVICE | SVC-MONTAGE-001 | - | Lieferung, Vertragen, Montage und Anschluss | 349 | delivery_assembly | - | - | false | true |
| kitchen-model-c | 310 | SERVICE | SVC-PICKUP-001 | - | Abholung an Logistikstandort | 0 | pickup | - | - | false | true |
| test-3d-kitchen | 10 | COMPONENT | T3D-CAB-WALL-01 | - | TEST 3D Wall Cabinet 1 (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #7bc6a0 | t3d-wall-1 | false | true |
| test-3d-kitchen | 20 | COMPONENT | T3D-CAB-WALL-02 | - | TEST 3D Wall Cabinet 2 (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #7bc6a0 | t3d-wall-2 | false | true |
| test-3d-kitchen | 30 | COMPONENT | T3D-CAB-WALL-03 | - | TEST 3D Wall Cabinet 3 (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #7bc6a0 | t3d-wall-3 | false | true |
| test-3d-kitchen | 40 | COMPONENT | T3D-CAB-WALL-04 | - | TEST 3D Wall Cabinet 4 (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #7bc6a0 | t3d-wall-4 | false | true |
| test-3d-kitchen | 50 | COMPONENT | T3D-CAB-WALL-05 | - | TEST 3D Wall Cabinet 5 (600 x 723 x 320 mm) | 139 | wall_cabinet_plain | #7bc6a0 | t3d-wall-5 | false | true |
| test-3d-kitchen | 55 | COMPONENT | T3D-LIGHT-001 | KA220043_S3 | TEST 3D LED Lighting Set | 69 | under_cabinet_light | #8fa0a3 | t3d-light | false | true |
| test-3d-kitchen | 60 | COMPONENT | T3D-WASHER-001 | EWA34660W | TEST 3D Washing Machine (600 x 600 x 878 mm) | 548 | washing_machine_base | #77b696 | t3d-washer | false | true |
| test-3d-kitchen | 70 | COMPONENT | T3D-SINKBASE-001 | - | TEST 3D Sink Base Cabinet (600 x 600 x 878 mm) | 0 | sink_base | #77b696 | t3d-sink-base | false | true |
| test-3d-kitchen | 80 | COMPONENT | T3D-DISH-001 | A-EGSPV597210 | TEST 3D Dishwasher (600 x 600 x 878 mm) | 579 | dishwasher_base | #77b696 | t3d-dishwasher | false | true |
| test-3d-kitchen | 90 | COMPONENT | T3D-OVEN-HOB-001 | - | TEST 3D Built-in Oven and Hob (600 x 600 x 878 mm) | 449 | oven_base | #77b696 | t3d-oven | false | true |
| test-3d-kitchen | 100 | COMPONENT | T3D-CAB-STORAGE-001 | - | TEST 3D Base Storage Cabinet (600 x 600 x 878 mm) | 229 | drawer_base | #77b696 | t3d-storage | false | true |
| test-3d-kitchen | 110 | COMPONENT | T3D-TOP-MAIN-001 | - | TEST 3D Main Worktop (40 x 600 x 3036 mm) | 0 | worktop | #9fb5ad | t3d-worktop-main | false | true |
| test-3d-kitchen | 120 | COMPONENT | T3D-SINK-001 | 517467 | TEST 3D Sink and Waste System | 89 | sink_faucet | #9fb5ad | t3d-sink | false | true |
| test-3d-kitchen | 130 | COMPONENT | T3D-HOOD-001 | FH 664 621 S | TEST 3D Extractor Hood | 349 | extractor_hood | #8fa0a3 | t3d-hood | false | true |
| test-3d-kitchen | 140 | COMPONENT | T3D-CAB-CORNER-001 | - | TEST 3D Corner Base Cabinet (600 x 600 x 878 mm) | 249 | drawer_base | #77b696 | t3d-corner | false | true |
| test-3d-kitchen | 150 | COMPONENT | T3D-CAB-BASE-001 | - | TEST 3D Return Base Cabinet (600 x 600 x 878 mm) | 199 | drawer_base_two | #77b696 | t3d-base | false | true |
| test-3d-kitchen | 160 | COMPONENT | T3D-CAB-DRAWERS-001 | - | TEST 3D Drawer Base Cabinet (600 x 600 x 878 mm) | 229 | drawer_base_three | #77b696 | t3d-drawers | false | true |
| test-3d-kitchen | 170 | COMPONENT | T3D-TOP-RETURN-001 | - | TEST 3D Return Worktop (40 x 600 x 1800 mm) | 0 | worktop | #9fb5ad | t3d-worktop-return | false | true |
| test-3d-kitchen | 220 | ACCESSORY | T3D-ACC-WASTE-001 | - | TEST 3D Waste Separation System | 89 | waste_system | - | - | false | true |
| test-3d-kitchen | 230 | ACCESSORY | T3D-ACC-CUTLERY-001 | ZB60SG | TEST 3D Cutlery Insert | 25 | cutlery_insert | - | - | false | true |
| test-3d-kitchen | 300 | SERVICE | SVC-MONTAGE-001 | - | Lieferung, Vertragen, Montage und Anschluss | 349 | delivery_assembly | - | - | false | true |
| test-3d-kitchen | 310 | SERVICE | SVC-PICKUP-001 | - | Abholung an Logistikstandort | 0 | pickup | - | - | false | true |
| l-shaped-kitchen | 10 | COMPONENT | CAB-WALL-LS-400 | H4002L | H4002L Wall Cabinet left (400 x 723 mm) | 139 | wall_cabinet_standard | #00ffbf | wall-cabinet-1 | false | true |
| l-shaped-kitchen | 20 | COMPONENT | CAB-HOOD-LS-600 | HD6002L | HD6002L Hood Wall Cabinet (600 x 723 mm) | 139 | wall_cabinet_plain | #394c00 | wall-cabinet-2 | false | true |
| l-shaped-kitchen | 30 | COMPONENT | CAB-WALL-LS-500 | H5002R | H5002R Wall Cabinet right (500 x 723 mm) | 139 | wall_cabinet_standard | #00ffbf | wall-cabinet-3 | false | true |
| l-shaped-kitchen | 40 | COMPONENT | CAB-WALL-LS-600 | H6002R | H6002R Wall Cabinet right (600 x 723 mm) | 139 | wall_cabinet_standard | #ff7f9f | wall-cabinet-4 | false | true |
| l-shaped-kitchen | 50 | COMPONENT | HOOD-LS-FH664621E | FH664621E | FH664621E Flat Pull-Out Extractor Hood (173 x 599 x 303 mm) | 349 | extractor_hood | #394c00 | under-cabinet-light | false | true |
| l-shaped-kitchen | 60 | COMPONENT | REF-LS-KGCN388140E | OL-KGCN388140E | Kuehl-/Gefrierkombi (545 x 1800 mm) | 579 | tall_refrigerator | black | refrigerator | false | true |
| l-shaped-kitchen | 70 | COMPONENT | TOP-LS-PLR | PLR60 / PLR80 | PLR Worktops (40 mm, 1571 x 600 mm + 2200 x 800 mm) | 0 | worktop | springgreen | worktop | true | true |
| l-shaped-kitchen | 80 | COMPONENT | CAB-BASE-LS-400 | US40L | US40L Base Cabinet left (400 x 723 mm) | 199 | drawer_base_two | #f0a500 | base-module-1 | false | true |
| l-shaped-kitchen | 90 | COMPONENT | OVEN-LS-600-HOB | UHK / EH92364E-A / 9EC744100C | Built-in Oven and Ceramic Hob with UHK Base (600 x 600 mm) | 449 | oven_base | #00c76a | oven-base | true | true |
| l-shaped-kitchen | 100 | COMPONENT | CAB-BASE-LS-500 | US50R | US50R Base Cabinet right (500 x 723 mm) | 199 | drawer_base_two | #ffbf00 | base-module-2 | false | true |
| l-shaped-kitchen | 110 | COMPONENT | CORNER-LS-650 | UPEF65 | UPEF65 Corner Filler (560 x 650 mm) | 0 | base_cabinet_30 | springgreen | corner-base | true | true |
| l-shaped-kitchen | 120 | COMPONENT | SINKBASE-LS-600 | SP60L | SP60L Sink Base Cabinet (600 x 723 mm) | 0 | sink_base | springgreen | base-module-3 | false | true |
| l-shaped-kitchen | 130 | COMPONENT | DISH-LS-600-STD | A-EGSPV597210 | Dishwasher (600 x 600 x 878 mm) | 579 | dishwasher_base | #001f7f | dishwasher-base | false | true |
| l-shaped-kitchen | 140 | COMPONENT | CAB-DRAWER-LS-300 | US2A30 | US2A30 Base Cabinet with Drawers (300 x 723 mm) | 229 | drawer_base_three | #ffbf00 | drawer-base | false | true |
| l-shaped-kitchen | 200 | ACCESSORY | SINK-LS-TIPO45 | 526335 | BLANCO TIPO 45 S Sink | 89 | sink_faucet | - | - | false | true |
| l-shaped-kitchen | 210 | ACCESSORY | TAP-LS-DARAS-F-HD | 521751 | BLANCO DARAS-F HD Tap | 0 | sink_faucet | - | - | false | true |
| l-shaped-kitchen | 220 | ACCESSORY | FILTER-LS-FWK124 | FWK124 | FWK124 Charcoal Filter Set | 0 | extractor_hood | - | - | false | true |
| l-shaped-kitchen | 300 | SERVICE | SVC-MONTAGE-001 | - | Lieferung, Vertragen, Montage und Anschluss | 349 | delivery_assembly | - | - | false | true |
| l-shaped-kitchen | 310 | SERVICE | SVC-PICKUP-001 | - | Abholung an Logistikstandort | 0 | pickup | - | - | false | true |