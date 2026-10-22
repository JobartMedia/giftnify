/** Bank account checks now run on the website (Paystack resolve, or test mode). */
import { verifyBankAccount as check } from "./gifts.functions";

export async function verifyBankAccount(bank: string, account: string) {
  const name = await check(bank, account).catch(() => null);
  return name ? { accountName: name } : null;
}
