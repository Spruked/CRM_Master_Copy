from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE_ROOT = Path(__file__).resolve().parents[1]
if str(SOURCE_ROOT) not in sys.path:
    sys.path.insert(0, str(SOURCE_ROOT))

from cali_skg.migrations.relationship_intelligence_migration import run_migration


class RelationshipIntelligenceSchemaTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.temp_dir.name) / "cali-test.db")
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE contacts (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  email TEXT,
                  phone TEXT,
                  address TEXT
                )
                """
            )
            conn.execute(
                """
                INSERT INTO contacts(id, name, email, phone, address)
                VALUES ('contact-1', 'Ada Example', 'Ada@Example.com', '(417) 555-0101', '101 Main St, Joplin, MO 64801')
                """
            )
            conn.commit()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_migration_is_idempotent_and_backfill_is_single_identity(self) -> None:
        first = run_migration(self.db_path)
        second = run_migration(self.db_path)
        self.assertEqual(first["status"], "success")
        self.assertEqual(second["status"], "success")

        with sqlite3.connect(self.db_path) as conn:
            party_count = conn.execute("SELECT COUNT(*) FROM party").fetchone()[0]
            claim_count = conn.execute("SELECT COUNT(*) FROM identity_claim").fetchone()[0]
            evidence_count = conn.execute("SELECT COUNT(*) FROM evidence").fetchone()[0]
            party = conn.execute(
                "SELECT party_id, display_name, status FROM party WHERE party_id='legacy-contact:contact-1'"
            ).fetchone()
            email_claim = conn.execute(
                """
                SELECT value_normalized, source_type, verification_state
                FROM identity_claim
                WHERE party_id='legacy-contact:contact-1' AND claim_type='email'
                """
            ).fetchone()

        self.assertEqual(party_count, 1)
        self.assertEqual(claim_count, 3)
        self.assertEqual(evidence_count, 3)
        self.assertEqual(party, ("legacy-contact:contact-1", "Ada Example", "active"))
        self.assertEqual(email_claim[0], "ada@example.com")
        self.assertEqual(email_claim[1], "legacy_crm")
        self.assertEqual(email_claim[2], "unverified")

    def test_strict_and_candidate_relationships_are_physically_separate(self) -> None:
        run_migration(self.db_path)
        with sqlite3.connect(self.db_path) as conn:
            tables = {
                row[0]
                for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            }
        self.assertIn("relationship_edge", tables)
        self.assertIn("relationship_candidate", tables)
        self.assertIn("relationship_rejection", tables)
        self.assertNotEqual("relationship_edge", "relationship_candidate")

    def test_required_business_contexts_are_seeded_once(self) -> None:
        run_migration(self.db_path)
        run_migration(self.db_path)
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("SELECT business_id FROM business_context ORDER BY business_id").fetchall()
        business_ids = [row[0] for row in rows]
        self.assertEqual(
            business_ids,
            ["alpha_certsig", "certsig", "personal", "spruked", "truemark_mint"],
        )

    def test_active_claim_uniqueness_blocks_duplicate_current_claim(self) -> None:
        run_migration(self.db_path)
        with sqlite3.connect(self.db_path) as conn:
            claim = conn.execute(
                """
                SELECT claim_type, value_raw, value_normalized, value_hash, observed_from, created_at
                FROM identity_claim
                WHERE party_id='legacy-contact:contact-1' AND claim_type='email'
                """
            ).fetchone()
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute(
                    """
                    INSERT INTO identity_claim(
                      claim_id, party_id, claim_type, value_raw, value_normalized, value_hash,
                      confidence, source_type, verification_state, observed_from, created_at
                    ) VALUES ('duplicate-email', 'legacy-contact:contact-1', ?, ?, ?, ?, 1.0, 'test', 'unverified', ?, ?)
                    """,
                    claim,
                )


if __name__ == "__main__":
    unittest.main()
