# Serial-number help photos

Photos are grouped by **brand, then appliance**:

```text
serial nr img/
  amica/
    dishwasher/
    extractor-hood/
    fridge/
    oven/
    cooktop/
    washing-machine/
    general/
  bosch/
    dishwasher/
    extractor-hood/
    fridge/
    oven/
    cooktop/
    washing-machine/
  aeg/
    dishwasher/
    extractor-hood/
    fridge/
    oven/
    cooktop/
    washing-machine/
```

The installed brand selected in admin and the selected appliance determine the
photo set in ASC. The available brand keys are `amica`, `bosch`, and `aeg`.

## Adding photos

1. Place the actual manufacturer's photo in its brand/appliance folder.
2. Register its public URL and alt text in `SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE`
   in `frontend/lib/serial-number-help.js`. Encode spaces in public URLs as `%20`.
   Use internal keys `extractor_hood`, `hob` (cooktop), and `washing_machine`.
3. Run `node --test test/serial-number-help*.test.js test/contract-appliances.test.js`
   from `frontend`.

Empty arrays and `.gitkeep` files reserve places for photos that have not been
supplied. A missing brand/type set shows the existing unavailable notice and
never substitutes another manufacturer's image. Contracts without a selected
brand continue to use Amica as the legacy default.

The Amica cooktop photo is registered separately from the Amica oven photo. A
documented oven/cooktop set that shares a serial number can use its same-brand
oven photo when no dedicated cooktop photo exists.

Washing-machine folders are reserved for future use. They do not add washing
machines to any kitchen or to the current appliance chooser.

For an exact article-specific photo, register both the image array in
`SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT` and its brand in
`SERIAL_NUMBER_HELP_PRODUCT_BRANDS` in the same module.
