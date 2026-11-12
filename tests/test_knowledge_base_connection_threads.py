"""Library reads running at the same time never share a connection or lose it mid-read.

The Deck, 2026-11-11: the answer screen asks for its tap-to-define words, chips and notes at the
same moment, each read in its own worker thread. All of them read through one shared database
connection, and a database error in one read closed it under the others. The plugin's back end
crashed inside SQLite 41 s after load, and every button then timed out (Install Ollama included).
Each thread now has its own connection, and a close only takes effect for a live thread at the
start of that thread's next read.
"""

import os
import sqlite3
import tempfile
import threading
import time
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge.knowledge_base_cards import _get_connection, close_connection  # noqa: E402

_ROWS = 400


def _build_db(path: str) -> None:
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE notes (note_id INTEGER PRIMARY KEY, body TEXT)")
    conn.executemany("INSERT INTO notes (body) VALUES (?)", [(f"note {i} " * 20,) for i in range(_ROWS)])
    conn.commit()
    conn.close()


class ConnectionPerThreadTests(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.db = os.path.join(tmp.name, "corpus.db")
        _build_db(self.db)
        self.addCleanup(close_connection, self.db)

    def test_reads_at_once_with_closes_between_them_all_finish(self) -> None:
        """Eight readers and one thread that keeps closing: every read completes, none errors."""
        errors: list[str] = []
        done = threading.Event()

        def reader() -> None:
            try:
                for _ in range(25):
                    # One whole read, start to finish, the way each library function does it.
                    conn = _get_connection(self.db)
                    count = 0
                    for row in conn.execute("SELECT note_id, body FROM notes ORDER BY note_id"):
                        count += 1 if row["body"] else 0
                    if count != _ROWS:
                        errors.append(f"read {count} of {_ROWS} rows")
            except Exception as exc:  # the old shared connection raised here, or crashed outright
                errors.append(f"{type(exc).__name__}: {exc}")

        def closer() -> None:
            while not done.is_set():
                close_connection(self.db)
                time.sleep(0.002)

        readers = [threading.Thread(target=reader) for _ in range(8)]
        closing = threading.Thread(target=closer)
        closing.start()
        for th in readers:
            th.start()
        for th in readers:
            th.join(timeout=60)
        done.set()
        closing.join(timeout=10)
        self.assertEqual(errors, [])

    def test_each_thread_gets_its_own_connection(self) -> None:
        seen: list[sqlite3.Connection] = []
        lock = threading.Lock()
        barrier = threading.Barrier(4)

        def grab() -> None:
            conn = _get_connection(self.db)
            with lock:
                seen.append(conn)
            barrier.wait(timeout=10)  # all four alive at once, so none can reuse another's

        threads = [threading.Thread(target=grab) for _ in range(4)]
        for th in threads:
            th.start()
        for th in threads:
            th.join(timeout=10)
        self.assertEqual(len({id(c) for c in seen}), 4)

    def test_same_thread_reuses_its_connection_until_closed(self) -> None:
        first = _get_connection(self.db)
        self.assertIs(_get_connection(self.db), first)
        close_connection(self.db)
        with self.assertRaises(sqlite3.ProgrammingError):
            first.execute("SELECT 1")
        again = _get_connection(self.db)
        self.assertIsNot(again, first)
        self.assertEqual(again.execute("SELECT count(*) FROM notes").fetchone()[0], _ROWS)

    def test_a_close_reaches_a_live_thread_at_its_next_read(self) -> None:
        """Another thread's close does not touch this thread's open connection mid-read; the next read reopens."""
        first = _get_connection(self.db)
        closer = threading.Thread(target=close_connection, args=(self.db,))
        closer.start()
        closer.join(timeout=10)
        self.assertEqual(first.execute("SELECT count(*) FROM notes").fetchone()[0], _ROWS)
        again = _get_connection(self.db)
        self.assertIsNot(again, first)
        with self.assertRaises(sqlite3.ProgrammingError):
            first.execute("SELECT 1")


if __name__ == "__main__":
    unittest.main()
