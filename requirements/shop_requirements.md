# Shop Requirements

## 6. Shop (Admin-Managed, Customer-Facing Purchase Flow)
**Admin side:**
- Add new item (gallery-style upload): photo(s), name, description, price, stock/availability
- Quick-add form when creating an item (per user note: "quick form at the add to cart feature")

**Customer side:**
- Gallery-style browsing grid
- Click item → view details
- Add to cart
- Checkout flow (payment method — reuse Zelle/Venmo/cash logic from commissions, or add standard checkout/payment processor)
- **Needs decision:** Does Shop need a real payment processor (Stripe/Square/PayPal) for just the shop? This affects build complexity significantly.
