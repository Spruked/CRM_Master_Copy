from __future__ import annotations

import sqlite3
from typing import Any, Dict, List


def _existing_columns(cur: sqlite3.Cursor, table: str) -> set[str]:
    cur.execute(f"PRAGMA table_info({table})")
    return {str(row[1]) for row in cur.fetchall()}


def run_unified_migration(db_path: str) -> Dict[str, Any]:
    steps: List[str] = []
    with sqlite3.connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON;")
        cur.execute("PRAGMA journal_mode = WAL;")
        steps.append("Applied PRAGMA foreign_keys=ON and journal_mode=WAL")

        # Contacts expansion without rewriting existing shape.
        contact_cols = _existing_columns(cur, "contacts")
        add_contact_cols = [
            ("alias_names", "TEXT"),
            ("company_role", "TEXT"),
            ("organization_id", "TEXT"),
            ("risk_score", "INTEGER DEFAULT 0"),
            ("epistemic_status", "TEXT DEFAULT 'unverified'"),
            ("metadata_payload", "TEXT"),
        ]
        for col, col_type in add_contact_cols:
            if col not in contact_cols:
                cur.execute(f"ALTER TABLE contacts ADD COLUMN {col} {col_type}")
                steps.append(f"Added contacts.{col}")

        # Prime Mail + unified support tables.
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS contact_external_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                label TEXT NOT NULL,
                url TEXT NOT NULL,
                link_type TEXT NOT NULL,
                verified_status TEXT NOT NULL,
                source TEXT NOT NULL,
                confidence_score REAL DEFAULT 0.0,
                last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
                UNIQUE(contact_id, platform, url)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS emails (
                message_id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                recipient TEXT NOT NULL,
                subject TEXT,
                date TEXT,
                text_body TEXT,
                html_body TEXT,
                raw_email TEXT,
                folder TEXT DEFAULT 'INBOX',
                source TEXT,
                has_attachments INTEGER DEFAULT 0,
                attachment_paths TEXT,
                read INTEGER DEFAULT 0,
                starred INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sent_emails (
                message_id TEXT PRIMARY KEY,
                from_addr TEXT NOT NULL,
                to_addr TEXT NOT NULL,
                subject TEXT,
                text_body TEXT,
                html_body TEXT,
                status TEXT DEFAULT 'pending',
                cloudflare_response TEXT,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS drafts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account TEXT NOT NULL,
                to_addr TEXT,
                subject TEXT,
                text_body TEXT,
                html_body TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        steps.append("Ensured emails/sent_emails/drafts tables")

        # Add optional linkage columns when missing.
        fa_cols = _existing_columns(cur, "financial_accounts")
        if "contact_id" not in fa_cols:
            cur.execute("ALTER TABLE financial_accounts ADD COLUMN contact_id TEXT")
            steps.append("Added financial_accounts.contact_id")
        if "account_name" not in fa_cols:
            cur.execute("ALTER TABLE financial_accounts ADD COLUMN account_name TEXT")
            steps.append("Added financial_accounts.account_name")
        if "status" not in fa_cols:
            cur.execute("ALTER TABLE financial_accounts ADD COLUMN status TEXT")
            steps.append("Added financial_accounts.status")

        # FTS and triggers
        cur.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
                message_id UNINDEXED,
                sender,
                recipient,
                subject,
                text_body,
                html_body,
                raw_email,
                tokenize='porter'
            )
            """
        )
        cur.execute(
            """
            CREATE TRIGGER IF NOT EXISTS after_email_insert AFTER INSERT ON emails BEGIN
                INSERT INTO emails_fts(message_id, sender, recipient, subject, text_body, html_body, raw_email)
                VALUES (new.message_id, new.sender, new.recipient, new.subject, new.text_body, new.html_body, new.raw_email);
            END;
            """
        )
        cur.execute(
            """
            CREATE TRIGGER IF NOT EXISTS after_email_delete AFTER DELETE ON emails BEGIN
                DELETE FROM emails_fts WHERE message_id = old.message_id;
            END;
            """
        )
        steps.append("Ensured emails_fts and email triggers")

        # Indices
        tables = {str(r[0]) for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        if "contacts" in tables:
            cur.execute("CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)")
        if "contact_external_links" in tables:
            cur.execute("CREATE INDEX IF NOT EXISTS idx_external_links_contact ON contact_external_links(contact_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_external_links_platform ON contact_external_links(platform)")
        if "emails" in tables:
            cur.execute("CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender)")
        if "crm_activities" in tables:
            cur.execute("CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id)")
        if "verification_calls" in tables:
            cols = _existing_columns(cur, "verification_calls")
            if "contact_id" in cols:
                cur.execute("CREATE INDEX IF NOT EXISTS idx_verification_calls_contact ON verification_calls(contact_id)")
            elif "caller_number" in cols:
                cur.execute("CREATE INDEX IF NOT EXISTS idx_verification_calls_contact ON verification_calls(caller_number)")
        steps.append("Ensured unified indices")

        conn.commit()

    return {"status": "success", "db_path": db_path, "steps": steps}
