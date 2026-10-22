import React from 'react';
import { LegalPage } from '../../Components/LegalPage';

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="20 October 2026">
      <p>These terms apply when you send, receive or redeem a gift on Giftnify. By using Giftnify you agree to them.</p>

      <h2>Gift links</h2>
      <p>Each gift has a unique link. Anyone with the link can open the message, so share it only with the person it is for. Before money is paid out for a gift sent to a phone number or email address, we ask the recipient for a one-time code sent there.</p>

      <h2>Payments</h2>
      <ul>
        <li>Senders pay the gift amount plus the service fee shown at checkout.</li>
        <li>Payments are processed by Paystack or Flutterwave. Giftnify does not store card details.</li>
        <li>A gift is only delivered after the payment provider confirms payment.</li>
      </ul>

      <h2>Receiving and withdrawing</h2>
      <ul>
        <li>Cash gifts can be added to a Giftnify wallet or paid out by bank transfer, airtime, data, electricity or gift card.</li>
        <li>Bank payouts are made only to an account name confirmed by the bank.</li>
        <li>If a payout fails, the amount is returned to the wallet.</li>
        <li>We may hold or refuse a payout we reasonably believe is fraudulent.</li>
      </ul>

      <h2>Expiry, cancellations and refunds</h2>
      <p>Gifts expire 90 days after they are sent. A gift that has not been redeemed can be cancelled by the sender through support, and the gift amount is refunded to the original payment method.</p>

      <h2>Messages and content</h2>
      <p>Do not send unlawful, abusive, harassing or misleading content. We may disable gifts or accounts that break this rule.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: support@giftnify.app</p>
    </LegalPage>
  );
}
