# Maintenance workflow and simplicity requirements

Updated November 17, 2026. This is an implementation record, not a claim that all planned features are live.

## Implemented follow-up

After a scheduled day has passed (or a month-only due period has ended), the app asks: **Was this maintenance completed?** It uses the property's Pacific timezone.

- **Yes, completed:** open the existing completion form and require the actual service date. Save the completion, history, and next due date through the existing shared-cloud workflow.
- **Not yet:** keep the original due date and ask again tomorrow in the app.
- **Remind me later:** choose tomorrow, three days, or one week. This postpones the prompt, not the maintenance deadline.

The prompt appears when the app opens or refreshes its records, and checks for a new day while it remains open. It is not an email, SMS, or closed-app push notification. Responses sync between devices. Existing completed maintenance with a future next-due date is not prompted again.

## Document workflow still requires private storage

The PDF/photo reader module prepares a review draft: task, property, vendor, actual service date, invoice date, invoice number, amount, findings, and explicitly stated next due date. It never marks work complete, paid, or passed merely because a report or invoice was uploaded. A manager must check the matched property/task and confirm the facts.

The reader is not connected to the live interface yet. The existing shared database and application do not provide the required private document-storage and authentication boundary. Original files must not be embedded in shared work-order JSON or exposed at public file URLs. No invoice uploads were enabled and no private documents were uploaded during this change.

Before activation: implement authenticated, property-scoped document storage; test access denial from another property and signed-download expiry; retain original files with stable identifiers and checksums; link documents to work orders/history without copying file bytes into each saved version; test cross-device retrieval, upload failure, duplicates, and backup/restore. Incomplete or disputed inspections must preserve findings and allow follow-up work.

After activation, a confirmed completion should ask for the report/invoice, with **Add now** and **I'll add it later** choices. A missing document must not erase a genuine completion. Remind the manager to add missing evidence later. Owner report packages should include a document inventory and authorized copies or authenticated downloads. Grand Lodge visibility remains a later, permission-controlled feature, not an automatic recipient.

## Main tasks and interface standard

Design around three main actions: **Create work order from a message**, **Create reservation from a message**, and **Add a service report**. Keep existing work-order and reservation screenshot intake central. Use large labeled buttons, readable text, plain language, predictable Back/Cancel controls, one decision at a time, and optional details behind disclosure controls. Do not assume all older users have the same ability; test the workflows with actual prospective users.

Reading documents should reduce retyping while preserving review: upload, review extracted details, confirm. Reservations need explicit review of date/time, renter, room, charges, and availability before booking. A quote is not an invoice; an invoice is not proof of payment; an inspection report is not automatically a passing inspection. Add-on modules should be visible only when useful to that building.
