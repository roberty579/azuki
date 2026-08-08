# Commission Requirements

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
- Payment method: Zelle / Venum / Cash (cash restricted to local drop-off only — form logic should hide "cash" if customer selects non-local shipping)

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
