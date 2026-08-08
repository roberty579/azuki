# Schedule Requirements

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
- For now we will consider that the meeting will be automatically self service
