import React from 'react';
import { LegalPage } from '../../Components/LegalPage';

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="20 October 2026">
      <p>This policy explains what Giftnify collects, why, and who it is shared with.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Your account details: name, email and, if you add it, phone number.</li>
        <li>Gift details: the recipient's name and phone number or email, your message, and any video or voice recording.</li>
        <li>Payment records: amount, currency and the payment provider's reference. We never see or store card numbers.</li>
        <li>Payout details the recipient gives: bank name and account number, or a phone or meter number. Bank details are encrypted when stored.</li>
        <li>Replies the recipient sends you after opening a gift.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To deliver the gift, verify the recipient with a one-time code, and pay out.</li>
        <li>To tell you when your gift is opened and replied to.</li>
        <li>To prevent fraud and meet legal obligations.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only the services that make Giftnify work: payment providers (Paystack, Flutterwave), the message provider that sends SMS, WhatsApp and email, and our hosting provider. We do not sell personal data or share it with advertisers.</p>

      <h2>How long we keep it</h2>
      <p>Gift messages and recordings are kept while the gift is active and for 12 months after, then deleted. Payment and payout records are kept as long as the law requires.</p>

      <h2>Your choices</h2>
      <p>You can ask us to see, correct or delete your data by emailing support@giftnify.app.</p>
    </LegalPage>
  );
}
