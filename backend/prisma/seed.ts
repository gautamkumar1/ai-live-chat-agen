import 'dotenv/config'
import { prisma } from '../src/db/client'

const entries = [
  {
    category: 'shipping',
    question: 'What are your shipping options?',
    answer:
      'We offer standard shipping (5-7 business days, free over $50) and express shipping (2-3 business days, $12.99). Same-day delivery is available in select cities.',
  },
  {
    category: 'shipping',
    question: 'Do you ship internationally?',
    answer:
      "Yes. We ship to the US, Canada, UK, Australia, and most EU countries. International orders arrive in 10-14 business days. Customs duties are the buyer's responsibility.",
  },
  {
    category: 'returns',
    question: 'What is your return policy?',
    answer:
      'You can return any item within 30 days of delivery for a full refund. Items must be unused and in original packaging. Start a return at returns.ourstore.com.',
  },
  {
    category: 'returns',
    question: 'How long do refunds take?',
    answer:
      'Refunds process within 3-5 business days after we receive your return. The credit appears on your statement within 5-10 business days depending on your bank.',
  },
  {
    category: 'support',
    question: 'What are your support hours?',
    answer:
      'Our support team is available Monday to Friday, 9 AM to 6 PM EST. For urgent issues outside those hours, email support@ourstore.com and we respond within 24 hours.',
  },
  {
    category: 'support',
    question: 'How do I track my order?',
    answer:
      'You receive a tracking email within 24 hours of shipment. Use the link in that email or enter your order number at track.ourstore.com.',
  },
  {
    category: 'orders',
    question: 'Can I cancel or modify my order?',
    answer:
      'You can cancel or modify an order within 1 hour of placing it. After that, the order enters fulfillment and cannot be changed. Contact support immediately if you need to cancel.',
  },
  {
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer:
      'We accept Visa, Mastercard, American Express, PayPal, Apple Pay, and Google Pay. All transactions are secured with 256-bit SSL encryption.',
  },
]

async function main() {
  console.log('Seeding knowledge base...')
  await prisma.knowledgeEntry.deleteMany()
  await prisma.knowledgeEntry.createMany({ data: entries })
  console.log(`Seeded ${entries.length} knowledge entries.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
