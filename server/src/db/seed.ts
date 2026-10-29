import { initDb, closeDb } from './connection';

export function seed() {
  const db = initDb();

  console.log('\n🌱 Starting Support Desk database seed...\n');

  // Transaction to ensure atomicity and consistency
  db.transaction(() => {
    // 1. Clear tickets, ticket_entries, ticket_events (safe to re-run)
    db.prepare('DELETE FROM ticket_events').run();
    db.prepare('DELETE FROM ticket_entries').run();
    db.prepare('DELETE FROM tickets').run();

    // Reset auto-increment sequence for clean demo IDs (#1..#10)
    db.prepare(
      "DELETE FROM sqlite_sequence WHERE name IN ('tickets', 'ticket_entries', 'ticket_events')",
    ).run();

    // 2. Insert ~10 realistic demo tickets
    const insertTicket = db.prepare(`
      INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
    `);

    // Ticket 1: OVERDUE (Open, Urgent, 36h ago)
    insertTicket.run(
      'Payment gateway webhook failing with HTTP 502',
      'devops@acme-corp.fake',
      'Our billing webhooks from Stripe are receiving 502 Bad Gateway intermittently. Several customer subscription renewal events have been dropped in the last 24 hours.',
      'Urgent',
      'Open',
      1, // Alice Johnson
      '-36 hours',
      '-35 hours',
    );

    // Ticket 2: OVERDUE (In Progress, High, 42h ago)
    insertTicket.run(
      'Single Sign-On (SAML) redirect loop for Okta users',
      'marcus.vance@globex.fake',
      'Users attempting to log in via Okta SAML 2.0 get stuck in an infinite redirect loop between the auth callback and the dashboard. Affects ~120 enterprise seats.',
      'High',
      'In Progress',
      2, // Bob Smith
      '-42 hours',
      '-30 hours',
    );

    // Ticket 3: OLD RESOLVED (Resolved, High, 55h ago, NOT overdue)
    insertTicket.run(
      'Export to CSV generates corrupted UTF-8 special characters',
      'sarah.connor@cyberdyne.fake',
      'When exporting the customer transactions report with umlauts or accent marks (e.g. Müller, René), Excel on Windows displays corrupted mojibake characters.',
      'High',
      'Resolved',
      3, // Carol Williams
      '-55 hours',
      '-12 hours',
    );

    // Ticket 4: Open, High, Unassigned (Fresh, 2h ago)
    insertTicket.run(
      'Cannot invite new team members to workspace',
      'elena.rostova@nexus.fake',
      'Clicking "Invite Member" produces an error toast saying "Workspace quota exceeded" even though we only have 8 out of 25 active seats.',
      'High',
      'Open',
      null, // Unassigned
      '-2 hours',
      '-2 hours',
    );

    // Ticket 5: In Progress, Urgent (5h ago)
    insertTicket.run(
      'Database connection pool exhaustion during peak hours',
      'tech-lead@fintech-demo.fake',
      'Observed spikes in latency and connection timeouts on pool size 20. Need guidance on tuning pool idle timeout and max connection count.',
      'Urgent',
      'In Progress',
      1, // Alice Johnson
      '-5 hours',
      '-1 hours',
    );

    // Ticket 6: Waiting on Customer, Medium (14h ago)
    insertTicket.run(
      'Clarification needed on API rate limit 429 responses',
      'api-dev@partner-hub.fake',
      'Is the 429 rate limit enforced on a per-token basis or per-IP basis? We are seeing 429 errors during concurrent data sync jobs.',
      'Medium',
      'Waiting on Customer',
      2, // Bob Smith
      '-14 hours',
      '-6 hours',
    );

    // Ticket 7: Open, Low, Unassigned (6h ago)
    insertTicket.run(
      'Dark mode contrast issue on invoice preview screen',
      'ux-designer@studio9.fake',
      'The line-item breakdown table on the PDF preview in dark mode has low contrast (dark gray text on dark background).',
      'Low',
      'Open',
      null, // Unassigned
      '-6 hours',
      '-6 hours',
    );

    // Ticket 8: Resolved, Medium (Freshly resolved, 8h ago)
    insertTicket.run(
      'Update billing address for European subsidiary',
      'finance@initech.fake',
      'Please update our registered VAT ID and EU invoicing address from our London entity to Dublin.',
      'Medium',
      'Resolved',
      3, // Carol Williams
      '-8 hours',
      '-1 hours',
    );

    // Ticket 9: Waiting on Customer, High (18h ago)
    insertTicket.run(
      'Mobile app crash on iOS 18 during push notification tap',
      'qa-lead@appworks.fake',
      'Multiple users report app crashing when launching directly from a deep-linked push notification banner on iOS 18.0.1.',
      'High',
      'Waiting on Customer',
      1, // Alice Johnson
      '-18 hours',
      '-4 hours',
    );

    // Ticket 10: Open, Medium (4h ago)
    insertTicket.run(
      'Add webhook signature verification header to documentation',
      'integrations@saasify.fake',
      'The API reference documentation mentions HMAC SHA-256 webhook signatures, but the exact header name (X-Webhook-Signature) is missing.',
      'Medium',
      'Open',
      2, // Bob Smith
      '-4 hours',
      '-4 hours',
    );

    // 3. Add entries (replies and internal notes) to 3 tickets
    const insertEntry = db.prepare(`
      INSERT INTO ticket_entries (ticket_id, type, content, author, created_at)
      VALUES (?, ?, ?, ?, datetime('now', ?))
    `);

    // Ticket 1 entries (Payment gateway webhook)
    insertEntry.run(
      1,
      'note',
      'Investigating the Cloudflare ingress logs. Looks like our origin upstream timed out on payload sizes exceeding 2MB.',
      'Alice Johnson',
      '-35 hours',
    );
    insertEntry.run(
      1,
      'reply',
      "Hi team, we're actively investigating the 502 responses from our webhook ingestion pipeline. We've isolated the issue to large event batches and are deploying a payload buffer hotfix.",
      'Alice Johnson',
      '-34 hours',
    );

    // Ticket 2 entries (SAML SSO loop)
    insertEntry.run(
      2,
      'note',
      'Checked Okta SAML certificate. Customer recently rotated their X.509 cert in Okta but forgot to re-bind the ACS consumer URL in their security settings.',
      'Bob Smith',
      '-40 hours',
    );
    insertEntry.run(
      2,
      'reply',
      'Hello Marcus, could you please verify whether the Assertion Consumer Service (ACS) URL in your Okta tenant was updated following your recent certificate rollover?',
      'Bob Smith',
      '-38 hours',
    );
    insertEntry.run(
      2,
      'reply',
      'Thanks Bob, you were spot on. Our IT team renewed the cert yesterday and skipped the ACS step. Testing the configuration change now.',
      'Marcus Vance',
      '-30 hours',
    );

    // Ticket 3 entries (CSV UTF-8)
    insertEntry.run(
      3,
      'note',
      'Root cause: CSV export stream was missing the UTF-8 Byte Order Mark (\\uFEFF). Excel on Windows defaults to Windows-1252 ANSI without the BOM prefix.',
      'Carol Williams',
      '-54 hours',
    );
    insertEntry.run(
      3,
      'reply',
      'Hi Sarah, we have pushed a fix to our export service that includes the UTF-8 BOM header. Could you please re-export your transaction report and confirm the display?',
      'Carol Williams',
      '-48 hours',
    );
    insertEntry.run(
      3,
      'reply',
      'Confirmed! All accented characters and currency symbols now render perfectly in Excel. Thank you for the quick resolution!',
      'Sarah Connor',
      '-12 hours',
    );

    // 4. Add audit events for the tickets
    const insertEvent = db.prepare(`
      INSERT INTO ticket_events (ticket_id, type, from_value, to_value, actor, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?))
    `);

    // Ticket 1 events
    insertEvent.run(1, 'created', null, 'Open', 'devops@acme-corp.fake', '-36 hours');
    insertEvent.run(1, 'assignee_changed', null, '1', 'Alice Johnson', '-35 hours');
    insertEvent.run(1, 'note_added', null, 'payload size issue', 'Alice Johnson', '-35 hours');
    insertEvent.run(1, 'reply_added', null, 'investigating webhook issue', 'Alice Johnson', '-34 hours');

    // Ticket 2 events
    insertEvent.run(2, 'created', null, 'Open', 'marcus.vance@globex.fake', '-42 hours');
    insertEvent.run(2, 'assignee_changed', null, '2', 'Bob Smith', '-41 hours');
    insertEvent.run(2, 'status_changed', 'Open', 'In Progress', 'Bob Smith', '-41 hours');
    insertEvent.run(2, 'note_added', null, 'checked Okta cert', 'Bob Smith', '-40 hours');
    insertEvent.run(2, 'reply_added', null, 'verify ACS URL', 'Bob Smith', '-38 hours');
    insertEvent.run(2, 'reply_added', null, 'testing now', 'Marcus Vance', '-30 hours');

    // Ticket 3 events
    insertEvent.run(3, 'created', null, 'Open', 'sarah.connor@cyberdyne.fake', '-55 hours');
    insertEvent.run(3, 'assignee_changed', null, '3', 'Carol Williams', '-54 hours');
    insertEvent.run(3, 'status_changed', 'Open', 'In Progress', 'Carol Williams', '-54 hours');
    insertEvent.run(3, 'note_added', null, 'UTF-8 BOM issue', 'Carol Williams', '-54 hours');
    insertEvent.run(3, 'reply_added', null, 'fix deployed', 'Carol Williams', '-48 hours');
    insertEvent.run(3, 'reply_added', null, 'confirmed working', 'Sarah Connor', '-12 hours');
    insertEvent.run(3, 'status_changed', 'In Progress', 'Resolved', 'Carol Williams', '-12 hours');

    // Default created events for tickets 4..10
    const remaining = [
      { id: 4, actor: 'elena.rostova@nexus.fake', time: '-2 hours' },
      { id: 5, actor: 'tech-lead@fintech-demo.fake', time: '-5 hours' },
      { id: 6, actor: 'api-dev@partner-hub.fake', time: '-14 hours' },
      { id: 7, actor: 'ux-designer@studio9.fake', time: '-6 hours' },
      { id: 8, actor: 'finance@initech.fake', time: '-8 hours' },
      { id: 9, actor: 'qa-lead@appworks.fake', time: '-18 hours' },
      { id: 10, actor: 'integrations@saasify.fake', time: '-4 hours' },
    ];

    for (const t of remaining) {
      insertEvent.run(t.id, 'created', null, 'Open', t.actor, t.time);
    }
  })();

  // 5. Query and log summary
  const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number };
  const totalEntries = db.prepare('SELECT COUNT(*) as count FROM ticket_entries').get() as { count: number };
  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM ticket_events').get() as { count: number };

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM tickets GROUP BY status ORDER BY count DESC
  `).all() as { status: string; count: number }[];

  const priorityCounts = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority
    ORDER BY CASE priority
      WHEN 'Urgent' THEN 1
      WHEN 'High' THEN 2
      WHEN 'Medium' THEN 3
      WHEN 'Low' THEN 4
    END
  `).all() as { priority: string; count: number }[];

  const overdueTickets = db.prepare(`
    SELECT id, subject, status, priority, created_at
    FROM tickets
    WHERE status != 'Resolved' AND created_at <= datetime('now', '-24 hours')
    ORDER BY id
  `).all() as { id: number; subject: string; status: string; priority: string; created_at: string }[];

  const oldResolvedTickets = db.prepare(`
    SELECT id, subject, status, priority, created_at,
           (status != 'Resolved' AND created_at <= datetime('now', '-24 hours')) as isOverdue
    FROM tickets
    WHERE status = 'Resolved' AND created_at <= datetime('now', '-24 hours')
    ORDER BY id
  `).all() as { id: number; subject: string; status: string; priority: string; created_at: string; isOverdue: number }[];

  console.log('====================================================');
  console.log('         SUPPORT DESK SEED SUMMARY');
  console.log('====================================================');
  console.log(`📦 Tickets created:    ${totalTickets.count}`);
  console.log(`💬 Entries created:    ${totalEntries.count}`);
  console.log(`📜 Events logged:      ${totalEvents.count}`);
  console.log('----------------------------------------------------');
  console.log('Statuses:');
  for (const s of statusCounts) {
    console.log(`  • ${s.status.padEnd(22)}: ${s.count}`);
  }
  console.log('Priorities:');
  for (const p of priorityCounts) {
    console.log(`  • ${p.priority.padEnd(22)}: ${p.count}`);
  }
  console.log('----------------------------------------------------');
  console.log(`⏰ Overdue Tickets (${overdueTickets.length} expected >= 2):`);
  for (const t of overdueTickets) {
    console.log(`  [OVERDUE] #${t.id}: "${t.subject}" (${t.status}, ${t.priority}) - created ${t.created_at}`);
  }
  console.log('----------------------------------------------------');
  console.log(`✓ Old Resolved Ticket (${oldResolvedTickets.length} expected >= 1, isOverdue = 0):`);
  for (const t of oldResolvedTickets) {
    console.log(`  [NOT OVERDUE] #${t.id}: "${t.subject}" (Status: ${t.status}, isOverdue: ${Boolean(t.isOverdue)})`);
  }
  console.log('====================================================');
  console.log('✨ Seed completed successfully! Safe to re-run anytime.\n');

  closeDb();
}

// Allow direct execution: `tsx src/db/seed.ts`
if (require.main === module) {
  seed();
}

