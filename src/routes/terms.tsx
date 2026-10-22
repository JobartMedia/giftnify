import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/giftnify/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Giftnify" },
      { name: "description", content: "The terms for sending and receiving gifts with Giftnify." },
      { property: "og:title", content: "Terms of Service — Giftnify" },
      { property: "og:description", content: "The terms for sending and receiving gifts with Giftnify." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Service" sections={[
      ["Using Giftnify", "You must be 18 or older to send gifts. You're responsible for the messages you record and the people you send them to. Don't use Giftnify for harassment, fraud or anything illegal."],
      ["Payments", "Gifts are charged in the currency shown at checkout, including the service fee. A gift is only delivered after our payment partner confirms payment. Promo codes have no cash value and may expire."],
      ["Refunds", "If a gift hasn't been opened, contact support from the Help page and we'll review a refund. Once a gift has been redeemed it generally can't be refunded."],
      ["Gift links", "Anyone with a gift link can open that gift, so share it only with the recipient."],
      ["Limits", "To keep everyone safe we may limit gift values, the number of gifts per day, or restrict accounts that show signs of fraud."],
      ["Changes", "We may update these terms. Continuing to use Giftnify after a change means you accept the new terms."],
    ]} />
  ),
});
