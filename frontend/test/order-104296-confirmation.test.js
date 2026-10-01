import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { buildOrderConfirmationEmailPreview, buildOrderConfirmationEmailStaticHtml } from '../lib/email/order-notifications.js';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)
    && existsSync(new URL(`${specifier}.js`, context.parentURL))) return nextResolve(`${specifier}.js`, context);
  return nextResolve(specifier, context);
} });
const { buildOrderForNotifications } = await import('../lib/orders.js');

function order(items = []) {
  return { orderNumber: '222104296-1', createdAt: '2026-10-01T12:00:00Z', total: 31,
    kitchen: { slug: 'ab-104296', name: '104296' },
    customer: { contractNumber: '222104296', firstName: 'Test', lastName: '104296', email: 'customer@example.com' },
    components: items, accessories: [], services: [],
  };
}

test('Burger cutlery emails preserve supplier snapshots, German names and saved prices', () => {
  const notification = buildOrderForNotifications({
    id: 'order', orderNumber: '222104296-1', createdAt: new Date('2026-10-01'), totalPrice: 42,
    kitchen: { id: 'kitchen', slug: 'ab-104296', name: '104296', programmId: 'BURGER CINDY' },
    items: ['50', '30'].map(width => ({
      code: 'ACC-CUTLERY-ZB60SG', itemType: 'ACCESSORY', articleNumberSnapshot: `ZBE${width}`,
      nameSnapshot: `Cutlery insert ${width} cm`, nameDeSnapshot: `Besteckeinsatz ${width} cm`,
      priceSnapshot: 21, quantity: 1,
    })),
  });
  assert.deepEqual(notification.accessories.map(item => item.articleNumber), ['ZBE50', 'ZBE30']);
  assert.deepEqual(notification.accessories.map(item => item.nameDe), ['Besteckeinsatz 50 cm', 'Besteckeinsatz 30 cm']);
  assert.deepEqual(notification.accessories.map(item => item.price), [21, 21]);
});

test('furniture articles never attach customer-owned refrigerator or dishwasher PDFs', async () => {
  const furniture = [
    ['GI88214-01', 'fridge-cabinet', 'Refrigerator housing cabinet'],
    ['SP20214K', 'fridge-side-filler', 'Refrigerator housing side filler'],
    ['DBK50', 'fridge-top-panel', 'Refrigerator housing top closing panel'],
    ['TV60', 'dishwasher-front', 'Furniture front for dishwasher'],
  ].map(([articleNumber, componentKey, name]) => ({ articleNumber, componentKey, name, code: articleNumber, price: 20 }));
  const preview = await buildOrderConfirmationEmailStaticHtml(order(furniture));
  assert.deepEqual(preview.attachmentLinks, []);
});

test('an explicitly suppressed sender copy emails only the requested test recipient', async () => {
  const preview = await buildOrderConfirmationEmailPreview(order(), { senderEmail: 'sender@example.com', suppressSenderCopy: true });
  assert.equal(preview.to, 'customer@example.com');
  assert.equal(preview.cc, undefined);
  const usual = await buildOrderConfirmationEmailPreview(order(), { senderEmail: 'sender@example.com' });
  assert.equal(usual.cc, 'sender@example.com');
});
