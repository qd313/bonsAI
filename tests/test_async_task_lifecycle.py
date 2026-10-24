"""Unit tests for cancel_and_await (backend.core.async_task_lifecycle).

Five teardown sites in main.py hand-wrote this: plugin unload (local Ollama setup, voice install)
and Clear-all-plugin-data (background Ask, local Ollama setup, voice install). The behavior that
matters is that it **waits** — a caller that cancels without awaiting can reset state while the
cancelled coroutine is still running its cleanup.
"""

import asyncio
import unittest

from backend.core.async_task_lifecycle import cancel_and_await


class TestCancelAndAwait(unittest.IsolatedAsyncioTestCase):
    async def test_none_is_a_no_op(self):
        self.assertIs(await cancel_and_await(None), False)

    async def test_finished_task_is_left_alone(self):
        async def done_quickly():
            return "result"

        task = asyncio.ensure_future(done_quickly())
        await task
        self.assertIs(await cancel_and_await(task), False)
        self.assertFalse(task.cancelled())
        self.assertEqual(task.result(), "result")

    async def test_running_task_is_cancelled(self):
        async def forever():
            await asyncio.sleep(3600)

        task = asyncio.ensure_future(forever())
        await asyncio.sleep(0)
        self.assertIs(await cancel_and_await(task), True)
        self.assertTrue(task.done())
        self.assertTrue(task.cancelled())

    async def test_cancelled_error_does_not_escape(self):
        async def forever():
            await asyncio.sleep(3600)

        task = asyncio.ensure_future(forever())
        await asyncio.sleep(0)
        await cancel_and_await(task)  # must not raise

    async def test_it_waits_for_cleanup_to_finish(self):
        """The reason this awaits at all: callers reset state the task is still writing to."""
        cleanup_done = []

        async def with_cleanup():
            try:
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                # A real teardown does work here; yield once so a non-awaiting caller would race.
                await asyncio.sleep(0)
                cleanup_done.append(True)
                raise

        task = asyncio.ensure_future(with_cleanup())
        await asyncio.sleep(0)
        await cancel_and_await(task)
        self.assertEqual(cleanup_done, [True], "returned before the task finished its cleanup")

    async def test_task_that_swallows_the_cancel_and_returns_is_awaited(self):
        """Some teardowns exit cleanly instead of re-raising; that must not be treated as an error."""

        async def swallows():
            try:
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                return "clean exit"

        task = asyncio.ensure_future(swallows())
        await asyncio.sleep(0)
        self.assertIs(await cancel_and_await(task), True)
        self.assertFalse(task.cancelled())
        self.assertEqual(task.result(), "clean exit")

    async def test_other_exceptions_from_the_task_still_propagate(self):
        """Only CancelledError is expected. A teardown that fails for another reason must be seen."""

        async def explodes_on_cancel():
            try:
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                raise RuntimeError("teardown failed")

        task = asyncio.ensure_future(explodes_on_cancel())
        await asyncio.sleep(0)
        with self.assertRaises(RuntimeError):
            await cancel_and_await(task)

    async def test_calling_twice_is_safe(self):
        async def forever():
            await asyncio.sleep(3600)

        task = asyncio.ensure_future(forever())
        await asyncio.sleep(0)
        self.assertIs(await cancel_and_await(task), True)
        self.assertIs(await cancel_and_await(task), False)


if __name__ == "__main__":
    unittest.main()
