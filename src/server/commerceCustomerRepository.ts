import { premiumAccess, type CommerceOrder } from "../commerce/policy";
import type { D1Database } from "./d1";
import { CommerceRepository } from "./commerceRepository";
import { HanziPremiumRepository, asCommerceOrder } from "./hanziPremiumRepository";
import { HanziWalletRepository } from "./hanziWalletRepository";
import { PremiumSupportRepository } from "./premiumSupportRepository";

/** Exact-match customer lookup for an authorized local commerce operator. */
export class CommerceCustomerRepository {
  constructor(private database: D1Database, private now = Date.now()) {}

  async find(query: string) {
    const value = query.trim();
    if (!value || value.length > 100) return null;
    const account = await this.database.prepare(`SELECT u.id AS userId,u.status,
      p.display_name AS displayName,h.normalized_username AS username
      FROM users u
      LEFT JOIN profiles p ON p.user_id=u.id
      LEFT JOIN hanzi_password_credentials h ON h.user_id=u.id
      WHERE u.id=? OR h.normalized_username=?
      ORDER BY CASE WHEN u.id=? THEN 0 ELSE 1 END LIMIT 1`)
      .bind(value, value.toLowerCase(), value)
      .first<{ userId: string; status: string; displayName: string | null; username: string | null }>();
    if (!account) return null;

    const [sandboxOrders, hanziOrders, wallet, tickets] = await Promise.all([
      new CommerceRepository(this.database).orders(account.userId),
      new HanziPremiumRepository(this.database).orders(account.userId),
      new HanziWalletRepository(this.database).forOwner(account.userId),
      new PremiumSupportRepository(this.database).forOwner(account.userId),
    ]);
    const orders: CommerceOrder[] = [...sandboxOrders, ...hanziOrders.map(asCommerceOrder)]
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    return { ...account, access: premiumAccess(orders, this.now), wallet, orders, tickets };
  }
}
