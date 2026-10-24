"""Title: Strategy package

Purpose: Keeps one group of the plugin's back-end files together in their own folder, so the folder they came from stays small enough to read. Say here which jobs this group covers.
Used for: Python's import system, which needs this file to treat the folder as a package
that code can import from as `backend.strategy`.
Solves: Without it the folder's files could not be imported by name from main.py or the tests.
Does not: Hold any code of its own; each job lives in the file named for it.
"""
