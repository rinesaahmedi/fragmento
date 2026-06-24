CREATE OR REPLACE FUNCTION pg_temp.extract_cabinet_width_from_code(value text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  normalized text := upper(coalesce(value, ''));
  match text[];
  width_value integer;
BEGIN
  IF normalized = '' THEN
    RETURN NULL;
  END IF;

  match := regexp_match(normalized, '(^|[-_])(TOP|BOTTOM)[-_]?([0-9]{3})($|[-_])');
  IF match IS NOT NULL THEN
    RETURN match[3]::integer;
  END IF;

  match := regexp_match(normalized, '(^|[-_])([0-9]{3})($|[-_])');
  IF match IS NOT NULL THEN
    RETURN match[2]::integer;
  END IF;

  match := regexp_match(normalized, '(^|[-_])US(2A)?([0-9]{2})($|[-_])');
  IF match IS NOT NULL THEN
    width_value := match[3]::integer;
    RETURN width_value * 10;
  END IF;

  match := regexp_match(normalized, '(^|[-_])H([0-9]{2})[0-9]{2}($|[-_])');
  IF match IS NOT NULL THEN
    width_value := match[2]::integer;
    RETURN width_value * 10;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.extract_cabinet_width_from_text(value text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  normalized text := coalesce(value, '');
  match text[];
  width_value integer;
BEGIN
  IF btrim(normalized) = '' THEN
    RETURN NULL;
  END IF;

  match := regexp_match(normalized, '(^|[^A-Za-z0-9])(US|H)(2A)?([0-9]{2})([0-9]{2})?([^A-Za-z0-9]|$)', 'i');
  IF match IS NOT NULL THEN
    width_value := match[4]::integer;
    RETURN width_value * 10;
  END IF;

  match := regexp_match(normalized, '([0-9]{3})\s*(x|/)\s*[0-9]{2,4}', 'i');
  IF match IS NOT NULL THEN
    RETURN match[1]::integer;
  END IF;

  match := regexp_match(normalized, '(width|breite)\D{0,12}([0-9]{3})', 'i');
  IF match IS NOT NULL THEN
    RETURN match[2]::integer;
  END IF;

  match := regexp_match(normalized, '([0-9]{3})\s*mm', 'i');
  IF match IS NOT NULL THEN
    RETURN match[1]::integer;
  END IF;

  RETURN NULL;
END;
$$;

WITH classified AS (
  SELECT
    "id",
    CASE
      WHEN upper(coalesce("code", '')) LIKE 'CAB-HOOD-%'
        OR upper(coalesce("code", '')) LIKE 'HOOD-%'
        OR upper(coalesce("code", '')) LIKE 'DISH-%'
        OR upper(coalesce("code", '')) LIKE 'LIGHT-%'
        OR upper(coalesce("code", '')) LIKE 'OVEN-%'
        OR upper(coalesce("code", '')) LIKE 'REF-%'
        OR upper(coalesce("code", '')) LIKE 'TOP-%'
        OR upper(coalesce("code", '')) LIKE 'WM-%'
        OR lower(coalesce("iconKey", '')) IN (
          'dishwasher_base',
          'extractor_hood',
          'hood',
          'oven_base',
          'tall_refrigerator',
          'under_cabinet_light',
          'washing_machine_base',
          'worktop'
        )
        THEN NULL
      WHEN upper(coalesce("code", '')) LIKE 'CAB-BASE-%'
        OR upper(coalesce("code", '')) LIKE 'CAB-COOK-%'
        OR upper(coalesce("code", '')) LIKE 'CAB-DRAWER-%'
        OR upper(coalesce("code", '')) LIKE 'SINKBASE-%'
        OR upper(coalesce("code", '')) LIKE 'LKNEW-BOTTOM-%'
        OR upper(coalesce("code", '')) LIKE 'T3D-CAB-BASE-%'
        OR upper(coalesce("code", '')) LIKE 'T3D-CAB-CORNER-%'
        OR upper(coalesce("code", '')) LIKE 'T3D-CAB-DRAWERS-%'
        OR upper(coalesce("code", '')) LIKE 'T3D-CAB-STORAGE-%'
        OR lower(coalesce("iconKey", '')) IN (
          'base_cabinet_30',
          'drawer_base',
          'drawer_base_two',
          'drawer_base_three',
          'sink_base'
        )
        OR lower(coalesce("name", '')) ~ '^(base cabinet|sink base cabinet|drawer base cabinet|return base cabinet|corner base cabinet)\y'
        THEN 'lower'
      WHEN upper(coalesce("code", '')) LIKE 'CAB-WALL-%'
        OR upper(coalesce("code", '')) LIKE 'LKNEW-TOP-%'
        OR upper(coalesce("code", '')) LIKE 'T3D-CAB-WALL-%'
        OR lower(coalesce("iconKey", '')) IN (
          'wall_cabinet_l',
          'wall_cabinet_plain',
          'wall_cabinet_r',
          'wall_cabinet_standard'
        )
        OR lower(coalesce("componentKey", '')) LIKE '%wall-cabinet%'
        OR lower(coalesce("name", '')) ~ '^wall cabinet\y'
        THEN 'upper'
      ELSE NULL
    END AS cabinet_kind,
    coalesce(
      nullif("widthMm", 0),
      pg_temp.extract_cabinet_width_from_code("code"),
      pg_temp.extract_cabinet_width_from_text("name"),
      pg_temp.extract_cabinet_width_from_text("infoText"),
      pg_temp.extract_cabinet_width_from_text("articleNumber")
    ) AS width_mm
  FROM "KitchenItem"
  WHERE "itemType" = 'COMPONENT'
),
renamed AS (
  SELECT
    "id",
    CASE WHEN cabinet_kind = 'lower' THEN 'Lower' ELSE 'Upper' END || ' cabinet ' ||
      CASE
        WHEN width_mm % 10 = 0 THEN (width_mm / 10)::text
        ELSE regexp_replace((width_mm::numeric / 10)::text, '\.?0+$', '')
      END AS cabinet_name,
    CASE WHEN cabinet_kind = 'lower' THEN 'Unterschrank' ELSE 'Oberschrank' END || ' ' ||
      CASE
        WHEN width_mm % 10 = 0 THEN (width_mm / 10)::text
        ELSE regexp_replace((width_mm::numeric / 10)::text, '\.?0+$', '')
      END AS cabinet_name_de
  FROM classified
  WHERE cabinet_kind IS NOT NULL
    AND width_mm IS NOT NULL
    AND width_mm > 0
)
UPDATE "KitchenItem" AS item
SET
  "name" = renamed.cabinet_name,
  "nameDe" = renamed.cabinet_name_de
FROM renamed
WHERE item."id" = renamed."id";
