import fs from 'node:fs/promises';
import { generatePurchasedKitchenPdf } from '../frontend/lib/email/order-notifications.js';
for (const code of ['105777','105780','105783','105786']) {
  const result = await generatePurchasedKitchenPdf({
    orderNumber: `111${code}-check`, createdAt: '2026-10-08T12:00:00Z',
    kitchen: { slug: `ab-${code}`, name: code }, customer: { contractNumber: `111${code}` },
    components: [{ componentKey: 'wall-cabinet-2' }],
  });
  await fs.writeFile(`../tmp/kitchen-105791/email-${code}.pdf`, Buffer.from(result.base64,'base64'));
}
console.log('Generated all four email sketch PDFs locally, without sending email.');
