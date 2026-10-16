# Clean-up round three: the starting point

Saved 2026-10-16 by plan 86 step 0 item 4, on `experimental` at `dd481869`, before anything was moved or removed.
Later steps compare against these files: step 5 must keep every test name here (except tests of removed features,
listed by name) and must not lower coverage; every move commit must keep the list of back-end methods.

| What | Then | File |
|---|---|---|
| Screen tests | 4,836 in 462 files, all passing (84 s with coverage on) | [baseline-test-names-screen.txt](baseline-test-names-screen.txt) |
| Back-end tests | 2,885, all passing (187 s with coverage on) | [baseline-test-names-python.txt](baseline-test-names-python.txt) |
| Screen coverage | 90.85 % of lines (38,220 of 42,069); functions 88.63 %, branches 89.08 % | [baseline.json](baseline.json) |
| Back-end coverage | 80.91 % of statements (12,493 of 15,441), `py_modules` and `main.py` | [baseline.json](baseline.json) |
| The built plugin | 3,378,277 bytes (`dist/index.js`) | [baseline.json](baseline.json) |
| Back-end methods the screen can call | 68 | [baseline-rpc-methods.txt](baseline-rpc-methods.txt) |

The repo's own size numbers (files, MB, lines) are in plan 86 § 5, "Freshness check, 2026-10-16".

**How it was measured,** so the "after" can be measured the same way:

- Screen: `npx vitest run --reporter=json --coverage.enabled --coverage.provider=v8 --coverage.include='src/**'
  --coverage.exclude='src/**/*.test.*' --coverage.exclude='src/test-harness/**' --coverage.reporter=json-summary`.
  A test's name is its file, then its full name, joined by " > ".
- Back end: `python -m coverage run --source=py_modules,main.py scripts/run_python_tests.py`, then `coverage json`.
  A test's name is `module.Class.test_name`, read from the runner's own list.
- Methods: the names in `src/types/rpcMethods.ts`, which is built from `main.py`.
