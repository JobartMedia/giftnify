import React from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { WalletView, type WithdrawResult } from '../../Components/wallet/WalletView';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
    body: JSON.stringify(body),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

export default function WalletPage({ wallets, transactions, withdrawals, methods, minimums, banks }: any) {
  return (
    <AppLayout>
      <Head title="Wallet" />
      <WalletView
        wallets={wallets ?? []}
        transactions={transactions ?? []}
        withdrawals={withdrawals ?? []}
        methods={methods ?? []}
        minimums={minimums ?? {}}
        createHref="/create"
        banks={banks}
        withdraw={async (input) => {
          const { res, data } = await postJson('/wallet/withdraw', input);
          if (res.status === 422 && !data.result) return { result: 'error' } as WithdrawResult;
          if (data.result === 'ok') router.reload({ only: ['auth'] }); // refresh the header balance
          return data as WithdrawResult;
        }}
        verifyBank={async (bank, account) => {
          const { res, data } = await postJson('/gift/verify-bank', { bank, account });
          return res.ok ? data.account_name ?? null : null; // the server re-checks before paying
        }}
      />
    </AppLayout>
  );
}
