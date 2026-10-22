import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/giftnify/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Giftnify" },
      { name: "description", content: "How Giftnify collects, uses and protects your information." },
      { property: "og:title", content: "Privacy Policy — Giftnify" },
      { property: "og:description", content: "How Giftnify collects, uses and protects your information." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" sections={[
      ["What we collect", "Your name and email, the people you save (names, phone numbers, emails and special dates), gifts you send, recorded messages, and payment records. Card details are handled by our payment partners — we never see or store them."],
      ["How we use it", "To deliver gifts, remind you of special days, process payments and refunds, prevent fraud, and answer support requests."],
      ["Recorded messages", "Video and voice messages are stored privately. Recipients get a temporary link that expires after a few hours."],
      ["Recipients", "Recipients see only the gift message, your name and the gift — never your account details."],
      ["Sharing", "We share data only with the services needed to run Giftnify (hosting, payments, messaging) and when required by law. We don't sell your data."],
      ["Your choices", "You can delete saved people at any time and ask support to delete your account and data."],
    ]} />
  ),
});
