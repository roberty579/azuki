# Website Requirements — Crochet Commission & Shop Site

## 0. Project Overview
A website for a handmade crochet business supporting: scheduling client consultations, custom commission requests, a "Build a Bunny" configurable product, a general shop, a portfolio, and an admin backend for order/cost tracking.

**Design direction:** Sophisticated but cute. Should read as a professional small-business storefront, not a hobby blog — clean layout, refined color palette, playful accents (not childish or cluttered).

**User roles:**
- **Visitor/Customer** — browses portfolio/shop, books consultations, submits commission requests, places orders
- **Admin (owner)** — manages orders, inventory/costs, deadlines, shop items

---

## 1. Site Navigation
- Persistent logo, top of page
- Hamburger menu (collapsible) linking to all main sections: Home, Schedule, Forms/Commissions, Build a Bunny, Shop, Portfolio
- Responsive design (mobile-first, since hamburger nav implies mobile use is a priority)

---

## 2. Main / Home Page (User View)
- Logo at top
- Hamburger menu w/ dropdown to sub-pages
- Short "about the company" summary/blurb
- Links to social media accounts and contact email
- Optional: image gallery/carousel of recent completed orders (customer-facing, not admin data)

---

## 3. Schedule Page (User View)
**Goal:** Let a customer book a consultation call with the admin.

- Google Calendar integration (OAuth connect on admin side; availability pulled from admin's calendar)
- Interactive calendar UI — customer clicks an available date
- Time slot picker — shows available times for the selected date
- Meeting platform selection (customer picks one):
  - Google Meet
  - Discord
  - Zoom
- On confirmation: create calendar event, send confirmation (email) to customer, generate meeting link based on selected platform
- **Needs decision:** Does admin need to manually approve/confirm bookings, or is it fully self-serve? Does each platform need its own auto-link generation (e.g., Zoom API, Google Meet via Calendar API), or does admin add the link manually per platform?
For now we will consider that the meeting will be automatically self service

---

## 4. Forms Page — Commission Request (User View)
A multi-step or single-page form capturing:

**Client Info**
- First name
- Last name

**Project Specs**
- Yarn color
- Yarn type
- Yarn thickness
- What item (free text)
- Purpose: gift or personal use (toggle/radio)

**Payment**
- Payment method: Zelle / Venmo / Cash (cash restricted to local drop-off only — form logic should hide "cash" if customer selects non-local shipping)

**Fulfillment**
- Shipping details (address) OR local drop-off spot selection
- Conditional logic: if local drop-off is selected, show drop-off location options instead of shipping address fields

**Terms & Conditions**
- Checkbox agreement required before submission
- **Open decision (flagged by user, not yet finalized):** Refund policy language — current draft idea is "non-refundable unless damaged by me [the maker]." Recommend finalizing exact wording before launch; this is a legal/liability statement and should be clear and unambiguous.

**Post-Submission Flow**
1. Customer submits commission form
2. (Consultation meeting happens, likely via Schedule page)
3. After the meeting, admin/customer confirm to "proceed with order"
4. System/admin generates: final pricing, timeline, and a document for the client to sign
5. Client signs and sends payment
6. **Needs decision:** Is the pricing/timeline document generated automatically (templated) or manually created by admin and uploaded/sent? Is e-signature required (e.g., via DocuSign/HelloSign integration) or informal (email confirmation)?

---

## 5. Build a Bunny (User View)
A configurable product flow, separate from full custom commissions.

- Choose base bunny: **naked** (no outfit) or **pre-outfitted**
  - Naked bunny = lower base price
  - Pre-outfitted = standard outfit is **overalls**
- Choose bunny color
- Choose outfit color (if outfitted version selected)
- Add-ons: additional clothes/accessories (priced separately, add to running total)
- Sample photo displayed with **designer credited** (if the base pattern/design is by another designer)
- **Needs decision:** Is pricing dynamic/calculated live as options are selected, or does this route into the same commission-form pipeline? Recommend a running price total displayed as the customer configures.

---

## 6. Shop (Admin-Managed, Customer-Facing Purchase Flow)
**Admin side:**
- Add new item (gallery-style upload): photo(s), name, description, price, stock/availability
- Quick-add form when creating an item (per user note: "quick form at the add to cart feature")

**Customer side:**
- Gallery-style browsing grid
- Click item → view details
- Add to cart
- Checkout flow (payment method — reuse Zelle/Venmo/cash logic from commissions, or add standard checkout/payment processor)
- **Needs decision:** Does Shop need a real payment processor (Stripe/Square/PayPal) for checkout, or does it route to the same manual Zelle/Venmo/cash confirmation flow as commissions? This affects build complexity significantly.

---

## 7. Portfolio Page (User View)
- Highlights past work
- **Launch categories:** Clothes, Plushies
- **Future categories (planned, not launch):** Crochet (general), Engineering, Jewelry
- Click an item → detail view showing:
  - Yarn type
  - Color
  - Designer credit (if applicable — i.e., if pattern is not originally the admin's own design)

---

## 8. Admin Page (Admin View)
- Spreadsheet-style dashboard/table tracking orders, containing at minimum:
  - Yarn type
  - Color
  - Thickness
  - Shipping status/details
  - Deadlines
  - Cost tracking (materials cost vs. price charged — implied by "tracks costs")
- Should tie back to commission form submissions (i.e., new form submissions populate/create new rows automatically)
- **Needs decision:** Should this be a custom-built table in the admin dashboard, or does it export/sync to an actual spreadsheet (Google Sheets integration)? Given the rest of the site already integrates Google Calendar, a Google Sheets sync may be the simplest and most flexible option.

---

## 9. Integrations Summary
| Integration | Purpose | Status |
|---|---|---|
| Google Calendar | Scheduling availability + booking | Required |
| Google Meet / Zoom / Discord | Meeting link generation | Required, method TBD |
| Payment (Zelle/Venmo/cash) | Manual payment confirmation | Required |
| Payment processor (Stripe/Square/etc.) | Shop checkout | Open decision |
| E-signature tool | Commission contract signing | Open decision |
| Google Sheets | Admin order/cost tracking | Open decision |
| Email | Booking confirmations, form submissions | Required |

---

## 10. Open Questions to Resolve Before Development
1. Final wording of the commission refund/damage policy
2. Whether shop checkout needs a real payment processor vs. manual payment confirmation
3. Whether meeting links are auto-generated per platform or manually added by admin
4. Whether the post-consultation pricing/timeline document is templated/automated or manually built
5. Whether e-signature is required for commission agreements
6. Whether admin order tracking lives natively in the site or syncs to Google Sheets

---

## 11. Future Phases (Not Launch-Blocking)
- Portfolio categories: Engineering, Jewelry
- Possible expansion of Build-a-[Character] beyond bunny
- Possible loyalty/repeat-customer features
