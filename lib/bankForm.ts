import type { Bank, BankFormData } from "@/types";
import { NOTIFY_WINDOW_DAYS } from "@/lib/constants";
import { daysUntil } from "@/lib/notifications/daysUntil";

/** Strapi date 欄位回傳 YYYY-MM-DD（舊資料可能是 ISO datetime），<input type="date"> 只吃 YYYY-MM-DD。 */
export function toDateInputValue(value?: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export const INITIAL_BANK_FORM: BankFormData = {
  name: "",
  deposit: 0,
  site: "",
  address: "",
  withdrawals: 0,
  transfer: 0,
  activity: "",
  card: "",
  account: "",
  note: "",
  category: "",
  expiry: "",
};

export function bankToFormData(bank: Bank, overrides: Partial<BankFormData> = {}): BankFormData {
  return {
    name: bank.name || "",
    deposit: bank.deposit || 0,
    site: bank.site || "",
    address: bank.address || "",
    withdrawals: bank.withdrawals || 0,
    transfer: bank.transfer || 0,
    activity: bank.activity || "",
    card: bank.card || "",
    account: bank.account || "",
    note: bank.note || "",
    category: bank.category || "",
    expiry: toDateInputValue(bank.expiry),
    ...overrides,
  };
}

export type BankExpiryTone = "expired" | "soon" | "normal";

/**
 * 有效期限的倒數文字。與 Email／系統通知用同一個 7 天窗口（台北日期），
 * 讓清單上變色的那幾筆剛好就是會收到提醒的那幾筆。
 */
export function describeBankExpiry(
  expiry: string | undefined,
  now: Date = new Date()
): { days: number; label: string; tone: BankExpiryTone } | null {
  const days = daysUntil(expiry, { now });
  if (days === null) return null;
  if (days < 0) return { days, label: `已過期 ${-days} 天`, tone: "expired" };
  if (days === 0) return { days, label: "今天到期", tone: "soon" };
  return { days, label: `剩 ${days} 天`, tone: days <= NOTIFY_WINDOW_DAYS.BANK_EXPIRY ? "soon" : "normal" };
}
