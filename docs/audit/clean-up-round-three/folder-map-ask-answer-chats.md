# Folder map: ask, answer and chats

Written 2026-10-16 by the plan 86 step 2 ask, answer and chats reviewer (Sonnet 5.5 high), from the records of batches b01 to b27, on
`experimental` at `b5ce2768`. The file-by-file map is the `.tsv` next to this file (`from<TAB>to`, one line per file).

## In plain words

This is the move plan for the 474 screen files that draw the Ask bar, the answers and the saved chats. Nothing here changes what a
player sees. 429 files change folder, 37 stay where they are (the suggestion-chip folder and the voice folder already
fit), and 8 are test or code files that only exist for a feature the plan removes (read aloud, the Steam ban lookup); the removal
helpers delete those, not the mover.

The maintainer is approving three shape choices:

1. **The answer feature becomes one folder with eight sub-folders** (188 files in all). One flat folder of that size would bring back
   the problem the plan is fixing, so it is split by what each part draws: transcript, bubble, markdown, stream, reasoning, reply actions,
   details and notices. Today's `stream-scramble` and `details-slot` folders fold in.
2. **The three chat folders become one `chats` folder** with three sub-folders (`slots`, `title`, `sum-up`), 67 files. They already
   import each other (the chats menu uses the delete and rename popups; the summary job uses the chat calls).
3. **The Ask feature becomes `ask/bar` and `ask/flow`** (59 files). `unified-input` folds into `bar`.

Two things for the maintainer to know before step 4:

- Six screen tests and two Python tests find a file by a path counted from their own folder or written in pieces. A move would break them,
  and two of them would keep passing while checking nothing. Section 2 lists them; they need a small change in a commit **before** the moves.
- A rule-checking script treats any file whose path contains the word `focus` as D-pad code. If the shared D-pad folder is called `focus`,
  one file (`chatPanelScroll.ts`) would, by my reading of the script (I did not run it on a moved copy), trip the check at once. Section 2 says how to avoid it.

About 100 of the 254 test files in this area can be merged into fewer files by topic in step 5 (section 3); the lines saved are smaller than
the file count suggests, because most of these tests already share one simulator.

## 1. The folder map

### 1a. The shape, in short

| New folder | Files | Folds in today's | Why |
|---|---:|---|---|
| `features/answer/` (8 sub-folders) | 188 | `stream-scramble`, `details-slot`, plus `components`, `utils`, `hooks`, `data` pieces | The answer is the largest feature here; sub-folders keep each under 60 files and match what each part draws. |
| `features/ask/bar/` | 32 | `unified-input`, Ask-bar pieces of `components`, `hooks`, `data` | One place for the question box and the strip around it. |
| `features/ask/flow/` | 27 | Ask hook, its types, status poll, restore, typed commands | The lifecycle of one question; the 1,587-line Ask hook and its five test files live together. |
| `features/chats/` (slots, title, sum-up) | 67 | `chat-slots`, `chat-title`, `chat-sum-up`, chat list hook and API | One feature, three parts that import each other. |
| `features/main-tab/` | 8 | `MainTab` and its tests | The tab that arranges the others; owns no single feature. |
| `features/preset-carousel/` (kept) | 50 | already there, plus chip-row pieces from `components`, `data`, `hooks`, `utils` | Existing name fits. |
| `features/spoilers/` | 13 | pieces from `utils`, `data`, `hooks` | Spoiler covers and protected-name rules. |
| `features/strategy/` | 10 | pieces from `components`, `data`, `hooks`, `utils` | Strategy follow-ups and checklist. |
| `features/voice/` (kept) | 9 | already there plus the recording hook | Existing name fits. |
| `features/media/`, `characters/`, `settings/`, `models/`, `about/`, `ai-connection/`, `plugin-shell/`, `power/`, `downloads/`, `user-notes/` | 19 | single files that belong to features owned by other reviewers | Listed in 1b so the other reviewers' maps meet mine. |
| `shared/focus/` | 28 | `utils/`, `hooks/` | D-pad helpers used by more than one feature. |
| `shared/`, `types/`, `test-harness/`, `styles/text-size/` | 15 | `utils/`, `data/`, `types/`, `components/` | No single owner. |

### 1b. Every file, by new folder

Each line is the file's name and, in brackets, the folder it comes from today. A file marked `(stays)` keeps its path. The exact
`from` and `to` paths are in the `.tsv`. Tests go with the file they test; where a test mounts a whole tab, the topic decided it.

#### `src/features/answer/transcript/` (56 files)

The chat transcript as a whole: the column of questions and answers under the Ask bar, each turn's question bubble and Retry, the "N earlier" list, the hint rows, the transcript's own hooks, and 38 of the 40 `MainTabChatTranscript.*` test files.

`ChatTranscriptHintRows.tsx` (components), `EarlierListLine.tsx` (components), `MainTabChatTranscript.answerFinishStill.test.tsx` (components), `MainTabChatTranscript.closeMatchLine.test.tsx` (components), `MainTabChatTranscript.collapseKeepsRing.test.tsx` (components), `MainTabChatTranscript.coverRevealHandle.test.tsx` (components), `MainTabChatTranscript.cutSpoilerCover.test.tsx` (components), `MainTabChatTranscript.detailsTabs.test.tsx` (components), `MainTabChatTranscript.diagnostics.test.tsx` (components), `MainTabChatTranscript.earlierByDay.test.tsx` (components), `MainTabChatTranscript.earlierPill.test.tsx` (components), `MainTabChatTranscript.earlierPillLeftNav.test.ts` (components), `MainTabChatTranscript.emptySlotPreview.test.tsx` (components), `MainTabChatTranscript.finishKeepsHeaderRing.test.tsx` (components), `MainTabChatTranscript.firstArchivedHeaderMoveUp.test.ts` (components), `MainTabChatTranscript.kbNotesBlock.test.tsx` (components), `MainTabChatTranscript.kbNotesGap.test.tsx` (components), `MainTabChatTranscript.kbNotesSideways.test.tsx` (components), `MainTabChatTranscript.liveConsent.test.tsx` (components), `MainTabChatTranscript.olderTurnDownToNewer.test.tsx` (components), `MainTabChatTranscript.permHintNavRegistration.test.tsx` (components), `MainTabChatTranscript.permissionHintFocus.test.ts` (components), `MainTabChatTranscript.questionFade.test.tsx` (components), `MainTabChatTranscript.ratingRowWalk.test.tsx` (components), `MainTabChatTranscript.reasoningBlockStop.test.tsx` (components), `MainTabChatTranscript.reasoningFold.test.tsx` (components), `MainTabChatTranscript.reasoningLiveBlock.test.tsx` (components), `MainTabChatTranscript.replyBlock.test.tsx` (components), `MainTabChatTranscript.retryNotAStop.test.tsx` (components), `MainTabChatTranscript.searchJump.test.tsx` (components), `MainTabChatTranscript.sessionLadderExit.test.tsx` (components), `MainTabChatTranscript.spoilerCredits.test.tsx` (components), `MainTabChatTranscript.spoilerStaysOpen.test.tsx` (components), `MainTabChatTranscript.stoppedNotice.test.tsx` (components), `MainTabChatTranscript.strategyPanels.test.tsx` (components), `MainTabChatTranscript.streamFinishKeepsRing.test.tsx` (components), `MainTabChatTranscript.streamingSectionStops.test.tsx` (components), `MainTabChatTranscript.troubleshootHintDismiss.test.tsx` (components), `MainTabChatTranscript.tsx` (components), `MainTabChatTranscript.turnTitle.test.tsx` (components), `MainTabChatTranscript.upWalk.test.tsx` (components), `buildEarlierList.tsx` (components), `useEarlierTurnsPill.ts` (hooks), `useLiveTurnHeaderRingRestore.ts` (hooks), `useLiveTurnTwin.ts` (hooks), `useTitleOverflow.test.ts` (hooks), `useTitleOverflow.ts` (hooks), `buildTurnHeaderElement.test.tsx` (utils), `buildTurnHeaderElement.tsx` (utils), `chatTurnTitle.test.ts` (utils), `chatTurnTitle.ts` (utils), `earlierTurnsByDay.test.ts` (utils), `earlierTurnsByDay.ts` (utils), `questionBubbleFit.test.tsx` (utils), `questionBubbleFit.ts` (utils), `troubleshootingAskHeuristic.ts` (utils)

#### `src/features/answer/bubble/` (33 files)

One answer's bubble and its D-pad walk: the sections, the corner icons, the spoiler-cover and underlined-word steps, and the 24 walk tests plus `answerBubbleNavigation.test.ts` (nearly all use the walk simulator `test-harness/deckAnswerWalk.ts`).

`answerBubbleBandGeometry.ts` (utils), `answerBubbleCoverUp.ts` (utils), `answerBubbleNavigation.controlsLift.test.ts` (utils), `answerBubbleNavigation.coverAtSectionTop.test.ts` (utils), `answerBubbleNavigation.coverMargin.test.ts` (utils), `answerBubbleNavigation.coverMirror.test.ts` (utils), `answerBubbleNavigation.coverUp.test.ts` (utils), `answerBubbleNavigation.deepCoverEntry.test.ts` (utils), `answerBubbleNavigation.downVisible.test.ts` (utils), `answerBubbleNavigation.firstSection.test.ts` (utils), `answerBubbleNavigation.lastSection.test.ts` (utils), `answerBubbleNavigation.lastSectionCover.test.ts` (utils), `answerBubbleNavigation.lastStep.test.ts` (utils), `answerBubbleNavigation.mirrorWalk.test.ts` (utils), `answerBubbleNavigation.readingWalk.test.ts` (utils), `answerBubbleNavigation.ringFollowsScroll.test.ts` (utils), `answerBubbleNavigation.ringOnBubble.test.ts` (utils), `answerBubbleNavigation.steamTopMargin.test.ts` (utils), `answerBubbleNavigation.tallEndAboveDock.test.ts` (utils), `answerBubbleNavigation.tallEntry.test.ts` (utils), `answerBubbleNavigation.tallSectionLift.test.ts` (utils), `answerBubbleNavigation.tallUpFromWord.test.ts` (utils), `answerBubbleNavigation.test.ts` (utils), `answerBubbleNavigation.ts` (utils), `answerBubbleNavigation.upEntryCoverSection.test.ts` (utils), `answerBubbleNavigation.upLandingClear.test.ts` (utils), `answerBubbleNavigation.walkThrough.test.ts` (utils), `answerBubbleNavigation.wordMirror.test.ts` (utils), `answerBubbleWordsUp.ts` (utils), `buildAnswerBubbleElement.test.tsx` (utils), `buildAnswerBubbleElement.tsx` (utils), `buildAnswerCornerSlots.tsx` (utils), `buildAnswerSections.tsx` (utils)

#### `src/features/answer/markdown/` (9 files)

Turning the answer's text into drawable pieces: the markdown renderer, the code-fence reader, the section splitter and the tag stripper.

`MainTabBonsaiAiMarkdownChunk.test.tsx` (components), `MainTabBonsaiAiMarkdownChunk.tsx` (components), `cutAnswerSections.test.ts` (utils), `markdownFenceReader.test.ts` (utils), `markdownFenceReader.ts` (utils), `splitResponseIntoChunks.test.ts` (utils), `splitResponseIntoChunks.ts` (utils), `stripAssistantDisplayTags.test.ts` (utils), `stripAssistantDisplayTags.ts` (utils)

#### `src/features/answer/stream/` (22 files)

Everything that only matters while an answer is still arriving: streamed pieces, the scramble effect, the smooth reveal, the scroll pin, the pace, the lighter drawing while a game runs. Today's `stream-scramble` folder folds in here.

`StreamFenceWaitChip.tsx` (components), `StreamMarkdownPieces.test.tsx` (components), `StreamMarkdownPieces.tsx` (components), `ScrambledAnswerText.test.tsx` (stream-scramble), `ScrambledAnswerText.tsx` (stream-scramble), `liveScrambleMemo.test.ts` (stream-scramble), `liveScrambleMemo.ts` (stream-scramble), `streamScrambleContext.test.ts` (stream-scramble), `streamScrambleContext.ts` (stream-scramble), `streamScrambleMath.test.ts` (stream-scramble), `streamScrambleMath.ts` (stream-scramble), `useSmoothStreamReveal.test.ts` (hooks), `useSmoothStreamReveal.ts` (hooks), `useStreamScrollPin.test.ts` (hooks), `useStreamScrollPin.ts` (hooks), `lighterWhileGameRuns.test.ts` (utils), `lighterWhileGameRuns.ts` (utils), `streamBeat.ts` (utils), `streamMarkdownPieces.test.ts` (utils), `streamMarkdownPieces.ts` (utils), `streamMarkdownPrepare.test.ts` (utils), `streamMarkdownPrepare.ts` (utils)

#### `src/features/answer/reasoning/` (14 files)

The Show reasoning line and block, the tidy-up of the model's thinking text, and the live thinking line.

`useReasoningFoldState.ts` (hooks), `buildReasoningFoldElement.test.tsx` (utils), `buildReasoningFoldElement.tsx` (utils), `buildReasoningFoldElement.walk.test.tsx` (utils), `buildThinkingBlurbTextElement.tsx` (utils), `reasoningBlockReading.ts` (utils), `reasoningDisplay.liveSlice.test.ts` (utils), `reasoningDisplay.liveSteps.fixtures.json` (utils), `reasoningDisplay.liveSteps.test.ts` (utils), `reasoningDisplay.test.ts` (utils), `reasoningDisplay.tidy.test.ts` (utils), `reasoningDisplay.ts` (utils), `splitThinkingBlurbItalicSegments.test.ts` (utils), `splitThinkingBlurbItalicSegments.ts` (utils)

#### `src/features/answer/reply-actions/` (17 files)

The controls under a finished reply: Helpful and Not really, the reason chips, the Show details line's row, Copy and its clipboard code, the small Steam button they share.

`BonsaiChatSecondaryButton.tsx` (components), `ReplyCopyButton.test.tsx` (components), `ReplyCopyButton.tsx` (components), `replyMicroActions.test.ts` (data), `replyMicroActions.ts` (data), `useReplyFeedbackChips.remount.test.tsx` (hooks), `useReplyFeedbackChips.test.ts` (hooks), `useReplyFeedbackChips.ts` (hooks), `answerCopyText.test.ts` (utils), `answerCopyText.ts` (utils), `buildReplyActionsElement.ratingKeepsRing.test.tsx` (utils), `buildReplyActionsElement.revealChips.test.tsx` (utils), `buildReplyActionsElement.test.tsx` (utils), `buildReplyActionsElement.tsx` (utils), `clipboardWrite.test.ts` (utils), `clipboardWrite.ts` (utils), `tildeCodeReadAloud.test.ts` (utils)

#### `src/features/answer/details/` (27 files)

The Show details panel: the chip ladder and its grid walk, the Session tab, the "what went into this answer" data, and the small line above the Ask box that stands in for it. Today's `details-slot` folder folds in here.

`ChipExpandedBody.tsx` (components), `ContextChipLadder.allChips.test.tsx` (components), `ContextChipLadder.deckTry2.test.tsx` (components), `ContextChipLadder.gridWalk.test.tsx` (components), `ContextChipLadder.reveal.test.tsx` (components), `ContextChipLadder.ringWalk.test.tsx` (components), `ContextChipLadder.stillRow.test.tsx` (components), `ContextChipLadder.test.tsx` (components), `ContextChipLadder.tsx` (components), `SessionContextStrip.test.tsx` (components), `SessionContextStrip.tsx` (components), `chipLadderGrid.test.ts` (components), `chipLadderGrid.ts` (components), `DetailsSlot.deck.test.tsx` (details-slot), `DetailsSlot.tsx` (details-slot), `detailsSlotStore.ts` (details-slot), `chipLadderPlacement.test.ts` (hooks), `chipLadderPlacement.ts` (hooks), `useChipGridOrder.ts` (hooks), `useChipLadderReveal.ts` (hooks), `useInputTransparencyRefresh.ts` (hooks), `archivedTurnTransparency.test.ts` (utils), `archivedTurnTransparency.ts` (utils), `buildDetailsPanelElement.tsx` (utils), `contextChipsFromSnapshot.test.ts` (utils), `contextChipsFromSnapshot.ts` (utils), `revealOpenedDetails.test.tsx` (utils)

#### `src/features/answer/notices/` (10 files)

Short messages about an answer: the slow-answer notes, the "reply ready" and "Ask failed" toasts, the "is the reply on screen" flag, and the toast text. (`answerReadableText.ts` stays here only for its table finder, see the judgment calls.)

`ChatLatencyNotices.tsx` (components), `answerReadableText.ts` (utils), `bonsaiPhaseToast.test.ts` (utils), `bonsaiPhaseToast.ts` (utils), `bonsaiReplyReadyToast.test.ts` (utils), `bonsaiReplyReadyToast.ts` (utils), `bonsaiReplySurface.test.ts` (utils), `bonsaiReplySurface.ts` (utils), `toastAnswerPreview.test.ts` (utils), `toastAnswerPreview.ts` (utils)

#### `src/features/ask/bar/` (32 files)

The Ask bar itself: the question box, its bottom strip (paperclip, mode, mic or Stop, X, Ask), the two small menus, the mode names and hints, the ring watch that puts the D-pad on the box, and the caret-measuring hook. Today's `unified-input` folder folds in here (its `constants.ts` does not, see below).

`AskStripGameTag.tsx` (components), `AskStripSendButtons.tsx` (components), `MainTabAskModeMenuPopover.test.tsx` (components), `MainTabAskModeMenuPopover.tsx` (components), `MainTabAttachMenuPopover.tsx` (components), `MainTabUnifiedAskBar.askUp.test.tsx` (components), `MainTabUnifiedAskBar.boxDown.test.tsx` (components), `MainTabUnifiedAskBar.boxRing.test.tsx` (components), `MainTabUnifiedAskBar.cornerRing.test.tsx` (components), `MainTabUnifiedAskBar.hint.test.tsx` (components), `MainTabUnifiedAskBar.leftHoldsStill.test.tsx` (components), `MainTabUnifiedAskBar.noSettingsCard.test.tsx` (components), `MainTabUnifiedAskBar.stopRing.test.tsx` (components), `MainTabUnifiedAskBar.test.tsx` (components), `MainTabUnifiedAskBar.tsx` (components), `MainTabUnifiedAskBar.types.ts` (components), `askMode.ts` (data), `askModeHints.ts` (data), `useUnifiedInputSurface.test.ts` (unified-input), `useUnifiedInputSurface.ts` (unified-input), `askBarRingWatch.titleView.test.ts` (hooks), `askBarRingWatch.ts` (hooks), `useAskBarInitialRingClaim.freshOpen.test.ts` (hooks), `useAskBarInitialRingClaim.tabReturn.test.ts` (hooks), `useAskBarInitialRingClaim.test.ts` (hooks), `useAskBarInitialRingClaim.ts` (hooks), `useAskBarMenuToggles.ts` (hooks), `useAskBarPressHandlers.ts` (hooks), `useMainTabAskBarFocus.test.ts` (hooks), `useMainTabAskBarFocus.ts` (hooks), `unifiedInputPersistenceMode.test.ts` (utils), `unifiedInputPersistenceMode.ts` (utils)

#### `src/features/ask/flow/` (27 files)

One question from the press of Ask to its answer on screen: the Ask hook and its argument and result types, the background status poll, the restore on reopen, the completion watch, the typed Ask-box commands, and the small text clean-ups of the reply.

`inputSanitizerCommands.ts` (data), `useAskMountRestore.ts` (hooks), `useAskSessionSnapshotActions.restoreSavedChat.test.ts` (hooks), `useAskSessionSnapshotActions.ts` (hooks), `useBackgroundGameAi.test.ts` (hooks), `useBackgroundGameAi.ts` (hooks), `useBonsaiAskOrchestration.afterAnswer.test.ts` (hooks), `useBonsaiAskOrchestration.desktopNote.test.ts` (hooks), `useBonsaiAskOrchestration.noChatRestore.test.ts` (hooks), `useBonsaiAskOrchestration.noteOffer.test.ts` (hooks), `useBonsaiAskOrchestration.test.ts` (hooks), `useBonsaiAskOrchestration.ts` (hooks), `askOrchestration.ts` (types), `askOrchestrationArgs.ts` (types), `askOrchestrationRestore.ts` (utils), `askThinkingPhases.test.ts` (utils), `askThinkingPhases.ts` (utils), `bonsaiAskCompletionWatch.test.ts` (utils), `bonsaiAskCompletionWatch.ts` (utils), `keepIfUnchanged.test.ts` (utils), `keepIfUnchanged.ts` (utils), `localOnlyAskCommands.test.ts` (utils), `localOnlyAskCommands.ts` (utils), `stripSoftContinueCue.test.ts` (utils), `stripSoftContinueCue.ts` (utils), `thinkingSummaryText.test.ts` (utils), `thinkingSummaryText.ts` (utils)

#### `src/features/chats/slots/` (19 files)

The saved-chat list and the boxes that change it: create, switch, rename, delete, the ten-chat limit, the screen's calls to the back end for chats, and the delete and rename popups. Today's `chat-slots` folder plus the chat-list hook and API.

`ChatSlotDeleteModal.tsx` (chat-slots), `ChatSlotPickerModal.tsx` (chat-slots), `ChatSlotRenameModal.test.tsx` (chat-slots), `ChatSlotRenameModal.tsx` (chat-slots), `afterDeleteLastChat.test.tsx` (chat-slots), `afterDeleteRebuild.test.tsx` (chat-slots), `chatSlotLimit.ts` (chat-slots), `useChatSlotDeleteConfirm.test.tsx` (chat-slots), `useChatSlotDeleteConfirm.tsx` (chat-slots), `useChatSlotRenameModal.tsx` (chat-slots), `useStartNewChat.tsx` (chat-slots), `useChatSlots.limit.test.ts` (hooks), `useChatSlots.noChat.test.ts` (hooks), `useChatSlots.test.ts` (hooks), `useChatSlots.ts` (hooks), `chatSlotTurns.test.ts` (utils), `chatSlotTurns.ts` (utils), `chatSlotsApi.titleOffer.test.ts` (utils), `chatSlotsApi.ts` (utils)

#### `src/features/chats/title/` (37 files)

The chat's name in Decky's title bar and everything hung on it: the name row and its icons, the chats menu, the tab strip above, how Decky's own bar is reshaped, LT and RT switching. Today's `chat-title` folder.

`ChatNameWords.tsx` (chat-title), `ChatRowIcons.tsx` (chat-title), `ChatTitleView.test.tsx` (chat-title), `ChatTitleView.tsx` (chat-title), `ChatsMenu.test.tsx` (chat-title), `ChatsMenu.tsx` (chat-title), `TitleTabStrip.tsx` (chat-title), `chatNameNav.ts` (chat-title), `chatRowActions.ts` (chat-title), `chatRowIconNav.ts` (chat-title), `chatRowMoves.ts` (chat-title), `chatTitleStore.test.tsx` (chat-title), `chatTitleStore.ts` (chat-title), `chatTitleStyles.ts` (chat-title), `chatsMenuBoxReturn.test.tsx` (chat-title), `chatsMenuIcons.tsx` (chat-title), `chatsMenuModel.ts` (chat-title), `chatsMenuNewChatAtTen.test.tsx` (chat-title), `chatsMenuStyles.ts` (chat-title), `deckyHeaderLayout.ts` (chat-title), `deckyHeaderShape.ts` (chat-title), `deckyTitleParts.ts` (chat-title), `nameRowBalance.ts` (chat-title), `nameRowIcons.test.tsx` (chat-title), `nameRowSpill.test.tsx` (chat-title), `noSavedChatsRow.test.tsx` (chat-title), `takeFirstChatStop.ts` (chat-title), `topStrip.test.tsx` (chat-title), `topStripHeightLock.test.tsx` (chat-title), `useChatRowActions.ts` (chat-title), `useChatSwitchActions.limit.test.ts` (chat-title), `useChatSwitchActions.ts` (chat-title), `useChatTitlePublisher.test.tsx` (chat-title), `useChatTitlePublisher.ts` (chat-title), `useChatTriggerSwitch.test.tsx` (chat-title), `useChatTriggerSwitch.ts` (chat-title), `useTopStripTabBar.ts` (chat-title)

#### `src/features/chats/sum-up/` (11 files)

Sum up this chat: the Session tab's Sum up block, the title offer under the card, the job that runs the summary, the note under the next answer. Today's `chat-sum-up` folder.

`SessionSumUpSection.deckPlace.test.tsx` (chat-sum-up), `SessionSumUpSection.reveal.test.tsx` (chat-sum-up), `SessionSumUpSection.tsx` (chat-sum-up), `SessionTitleOffer.test.tsx` (chat-sum-up), `SessionTitleOffer.tsx` (chat-sum-up), `buildChatSummaryNoteElement.tsx` (chat-sum-up), `chatSumUpModel.test.ts` (chat-sum-up), `chatSumUpModel.ts` (chat-sum-up), `sumUpDirectionHandlers.ts` (chat-sum-up), `useChatSumUpJob.test.ts` (chat-sum-up), `useChatSumUpJob.ts` (chat-sum-up)

#### `src/features/main-tab/` (8 files)

The Main tab itself, which only arranges the transcript above and the dock below (chips, Ask bar, menus). It belongs to no single feature, so it gets its own folder, with the tests that mount the whole tab and the column-fill hook.

`MainTab.askStrip.deck.test.tsx` (components), `MainTab.dockClass.test.ts` (components), `MainTab.gameLighter.test.ts` (components), `MainTab.streamScramble.test.tsx` (components), `MainTab.tabBarDownEarlier.test.tsx` (components), `MainTab.tabBarDownRetry.test.tsx` (components), `MainTab.tsx` (components), `useMainTabColumnFill.ts` (hooks)

#### `src/features/preset-carousel/` (50 files)

The suggestion-chip row above the Ask box: the four chip styles, their timing and pace, the next-chip rule, the preset list, the AI's own suggestion chip, the row's D-pad rules. Stays where it is; the pieces that still sit in `components/`, `data/`, `hooks/` and `utils/` join it.

`MainTabEmptyChatHelpChip.test.tsx` (components), `MainTabInjectChipFocus.test.tsx` (components), `MainTabPresetAnimatedChips.fadeButton.test.tsx` (components), `MainTabPresetAnimatedChips.keepsRing.test.tsx` (components), `MainTabPresetAnimatedChips.simulation.test.tsx` (components), `MainTabPresetAnimatedChips.test.tsx` (components), `MainTabPresetAnimatedChips.tsx` (components), `MainTabPresetRow.askRestart.test.tsx` (components), `MainTabPresetRow.holdStill.test.tsx` (components), `MainTabPresetRow.ringHold.test.tsx` (components), `MainTabPresetRow.test.tsx` (components), `MainTabPresetRow.tsx` (components), `injectChipNav.ts` (components), `presets.test.ts` (data), `presets.ts` (data), `carouselNextChip.ts` (stays), `carouselState.test.ts` (stays), `carouselState.ts` (stays), `changeSpacing.test.ts` (stays), `changeSpacing.ts` (stays), `composePresetSeedsWithSessionRag.ts` (stays), `nextChipRule.test.ts` (stays), `nextChipRule.ts` (stays), `presetChipButton.scroll.test.tsx` (stays), `presetChipButton.tsx` (stays), `presetChipDecodeText.ts` (stays), `presetChipShared.ts` (stays), `presetChipStay.row.test.tsx` (stays), `presetChipStay.test.ts` (stays), `presetChipStay.ts` (stays), `presetDecodeChipButton.tsx` (stays), `presetDecodeSlots.tsx` (stays), `presetPace.ts` (stays), `presetRowFocusNav.tsx` (stays), `presetRowFocusNav.upFromChips.test.tsx` (stays), `presetRowLayout.test.ts` (stays), `presetRowLayout.ts` (stays), `presetRowNav.test.ts` (stays), `presetRowNav.ts` (stays), `presetSlotRotation.test.ts` (stays), `presetSlotRotation.ts` (stays), `sessionRagComposer.test.ts` (stays), `sessionRagComposer.ts` (stays), `useChipsHeldUnderRing.ts` (stays), `useSuggestedPromptChips.test.ts` (hooks), `useSuggestedPromptChips.ts` (hooks), `joinPresetWithRunningGame.test.ts` (utils), `joinPresetWithRunningGame.ts` (utils), `presetCarouselInject.ts` (utils), `sessionRagChipCandidates.ts` (utils)

#### `src/features/spoilers/` (13 files)

Spoiler covers: which games and bosses are protected, turning one-line hidden blocks into covers, the unwrap rules, the cover recheck hook, the thinking-line redaction, and the tests that feed odd fence shapes through the bubble.

`spoilerTitleProfiles.ts` (data), `spoilerTitleProfilesContract.test.ts` (data), `useSpoilerFenceRecheck.ts` (hooks), `emptyLabelSpoilerMark.test.tsx` (utils), `expandOneLineSpoilerFences.ts` (utils), `gluedSpoilerOpener.test.tsx` (utils), `oneLineSpoilerBlock.test.tsx` (utils), `oneLineSpoilerCopyAndReadAloud.test.ts` (utils), `redactThinkingBlurbSpoilers.test.ts` (utils), `redactThinkingBlurbSpoilers.ts` (utils), `spoilerFenceOddShapes.test.ts` (utils), `unwrapAskedEntitySpoilerFences.test.ts` (utils), `unwrapAskedEntitySpoilerFences.ts` (utils)

#### `src/features/strategy/` (10 files)

Strategy-guide follow-ups: the branch menu actions, the checklist (panel, session, saving), and the follow-up wording.

`StrategyChecklistPanel.tsx` (components), `strategyGuideFollowup.test.ts` (data), `strategyGuideFollowup.ts` (data), `useStrategyBranchActions.test.ts` (hooks), `useStrategyBranchActions.ts` (hooks), `useStrategyChecklistSession.ts` (hooks), `strategyChecklist.test.ts` (utils), `strategyChecklist.ts` (utils), `strategyChecklistPersistence.ts` (utils), `strategyGuideBranches.ts` (utils)

#### `src/features/voice/` (9 files)

Voice input. Stays where it is; the screen's recording hook and its test join it.

`useVoiceAskInput.test.ts` (stays), `useVoiceAskInput.ts` (stays), `useVoiceAskWithReadAloud.ts` (stays), `voiceClearAfterStop.test.tsx` (stays), `voiceFinishAtStop.test.tsx` (stays), `voiceStartGameFlag.test.tsx` (stays), `voiceStartingFeedback.test.tsx` (stays), `useVoiceTranscription.test.ts` (hooks), `useVoiceTranscription.ts` (hooks)

#### `src/features/media/` (4 files)

Screenshots and the clipboard read for the Ask bar: the picker panel, its hook, clipboard cleaning, size and date formatting.

`MainTabScreenshotBrowser.tsx` (components), `useScreenshotBrowser.ts` (hooks), `clipboardStash.ts` (utils), `mediaFormat.ts` (utils)

#### `src/features/characters/` (2 files)

AI characters (only the "which characters fit the running game" piece is in this area).

`runningGameCharacterSuggestions.test.ts` (utils), `runningGameCharacterSuggestions.ts` (utils)

#### `src/features/settings/` (3 files)

The option lists that settings are written from (Thinking levels, reply length). They are part of the settings plumbing, so they sit with it.

`askThinkEffort.test.ts` (data), `askThinkEffort.ts` (data), `replyVerbosity.ts` (data)

#### `src/features/models/` (2 files)

The AI models box (only the starter-set tags and a wording test are in this area).

`deckEssentialsTags.ts` (data), `setupAndPullBoxWording.test.tsx` (hooks)

#### `src/features/about/` (1 file)

The About tab and first-run text (only the first-run wording test is in this area).

`firstRunNoticeWording.test.ts` (data)

#### `src/features/ai-connection/` (2 files)

The Ollama tab (only the one-time Thinking notice popup is in this area).

`useThinkingNoticeGate.test.tsx` (hooks), `useThinkingNoticeGate.tsx` (hooks)

#### `src/features/plugin-shell/` (2 files)

The shell around the tabs. `bonsaiSessionSurvival` (the note the panel leaves behind when a popup covers it) joins it.

`bonsaiSessionSurvival.test.ts` (utils), `bonsaiSessionSurvival.ts` (utils)

#### `src/features/power/` (1 file)

Power (TDP) text (only the saved-reply tuning banner is in this area).

`appliedTuningText.ts` (utils)

#### `src/features/downloads/` (1 file)

Download notices (only the focus-return helper is in this area).

`rememberReturnWhileBoxOpens.ts` (utils)

#### `src/features/user-notes/` (1 file)

The player's notes (only the desktop-note autosave memory is in this area).

`desktopChatAutosave.ts` (utils)

#### `src/shared/focus/` (28 files)

The D-pad helpers more than one feature uses: the five of the eight registries that sit in this area, the document and ring lookups, the scroll and dock-clearance helpers, the focus graph and the transcript's hand-off helpers.

`useDockClearanceOnFocus.test.ts` (hooks), `useDockClearanceOnFocus.ts` (hooks), `useHandRingOnGone.ts` (hooks), `answerBubbleElRegistry.test.ts` (utils), `answerBubbleElRegistry.ts` (utils), `answerStopRegistry.test.ts` (utils), `answerStopRegistry.ts` (utils), `chatPanelScroll.test.ts` (utils), `chatPanelScroll.ts` (utils), `chatTranscriptNavHelpers.ts` (utils), `focusNavigation.test.ts` (utils), `focusNavigation.ts` (utils), `focusPerTurnRow.ts` (utils), `handRingOnWhenGone.test.ts` (utils), `handRingOnWhenGone.ts` (utils), `liveTurnFocusGraph.test.ts` (utils), `liveTurnFocusGraph.ts` (utils), `navFocusRegistry.remount.test.ts` (utils), `navFocusRegistry.test.ts` (utils), `navFocusRegistry.ts` (utils), `navFocusRegistry.windowFocus.test.ts` (utils), `permHintRowNav.test.ts` (utils), `replyStopRegistry.test.ts` (utils), `replyStopRegistry.ts` (utils), `spoilerFenceRegistry.test.ts` (utils), `spoilerFenceRegistry.ts` (utils), `uiDocument.test.ts` (utils), `uiDocument.ts` (utils)

#### `src/shared/` (3 files)

Code with no single feature owner: the RPC deadline wrapper (50 importers) and the shared pixel and colour numbers (31 importers).

`constants.ts` (unified-input), `deckyCall.test.ts` (utils), `deckyCall.ts` (utils)

#### `src/types/` (2 files)

Shapes used by many features.

`backgroundAsk.ts` (stays), `inputTransparency.ts` (utils)

#### `src/test-harness/` (6 files)

Shared test stand-ins. Six test-only stand-ins that today sit among the plugin's own code move here.

`earlierListNavStub.tsx` (components), `earlierListTestKit.tsx` (components), `afterBoxHarness.tsx` (chat-slots), `fakeChatSlotsStore.ts` (chat-slots), `chatTitleTestFixtures.tsx` (chat-title), `titleBarFlexModel.ts` (chat-title)

#### `src/styles/text-size/` (4 files)

The four tests that guard the Text size setting across the whole plugin (none belongs to one feature).

`steamWordsScaled.test.tsx` (components), `textSizeEverywhere.test.tsx` (components), `textSizeScan.test.ts` (components), `textSizeSurfaces.test.tsx` (components)

#### Files that go away whole (`-` in the `.tsv`), 8 files

These exist only for a feature the plan removes. The removal reviewers write the cut lists; this only marks the files.

- `MainTabChatTranscript.readAloud.test.tsx` (components): read aloud (the speaker under a finished answer)
- `MainTabChatTranscript.vacRowAfterSwitch.test.tsx` (components): the Steam ban lookup (its Open Permissions row)
- `useVoiceAskWithReadAloud.test.tsx` (voice): read aloud (every test checks reading aloud). The hook it tests stays, see Open questions
- `useReadAloud.test.ts` (hooks): read aloud
- `useReadAloud.ts` (hooks): read aloud. Three functions at L258-314 that voice input calls (`rememberAskCameFromMic`, `noteAskPressed`, `questionCameFromMic`) go with it; see Open questions
- `useReadAloudAutoStop.ts` (hooks): read aloud
- `answerBubbleNavigation.readAloudCorner.test.tsx` (utils): read aloud (the speaker in the corner). Its Copy lifted-clear checks go too; see Open questions
- `answerReadableText.test.ts` (utils): read aloud (the text it speaks). Its table case at L140-157 is the only test of `replaceMarkdownTables`, which stays; see Open questions

### 1c. Judgment calls (where I overruled a reader or chose between two fits)

- **`src/shared/focus/` holds 28 files.** It takes five of the plan's eight D-pad helpers (`navFocusRegistry`, `answerBubbleElRegistry`, `answerStopRegistry`, `replyStopRegistry`, `spoilerFenceRegistry`) because step 6b merges them into one shared helper and that should be one folder to edit. Three of the five (`answerStopRegistry`, `answerBubbleElRegistry`, `spoilerFenceRegistry`) are used only by answer code today; the other three of the eight (`permissionJumpRegistry`, `drgGlossaryTermRegistry`, `modalReturnFocusRegistry`) are other reviewers'. It also takes the generic helpers: `uiDocument`, `focusNavigation`, `focusPerTurnRow`, `handRingOnWhenGone`, `useHandRingOnGone`, `useDockClearanceOnFocus`, `chatPanelScroll` (22 importers). Alternative: leave the three answer-only registries in `answer/bubble/` until 6b; the cost is a second move.
- **`chatTranscriptNavHelpers.ts` and `liveTurnFocusGraph.ts` go to `shared/focus/`, not `answer/`.** Twelve files in four features import the first (answer, chats menu, preset row, search tab); six features import the second (answer, strategy, chat sum-up, preset row, user notes, the notes block). Readers were unsure. `permHintRowNav.test.ts` goes with the first.
- **`presetRowFocusNav.tsx`, `presetRowNav.ts` and their two tests stay in `preset-carousel/`; `injectChipNav.ts` joins it.** Readers said `shared/focus/`. Only the chip row, the details slot and tests use them, and `chipRowExitUp` is the chip row's own Up rule. Step 6b can still fold them into the shared helper.
- **The chip ladder (`ContextChipLadder`, `chipLadderGrid`, `chipLadderPlacement`, `useChipGridOrder`, `useChipLadderReveal`) goes to `answer/details/`.** The kit says the chip ladder is `answer`; three readers tagged it `presets` because the files sit near the suggestion chips. They draw the Show details chips.
- **`SessionContextStrip` and its test go to `answer/details/`.** It draws the Session tab inside the details panel. Readers split between `chats` and `answer`. Its Sum up part already lives in `chats/sum-up/` and is imported.
- **`MainTab.tsx` and its six tests go to a new `features/main-tab/`, not `plugin-shell/tabs/`.** `plugin-shell/tabs/` holds the tab payload hooks (`useMainTabPayload` and the like). The tab component belongs to ask, answer, chats and presets together. `MainTabEmptyChatHelpChip.test.tsx` and `MainTabInjectChipFocus.test.tsx` mount the tab but test the chip row, so they go to `preset-carousel/`.
- **Six test stand-ins go to `src/test-harness/`.** `earlierListNavStub`, `earlierListTestKit`, `chatTitleTestFixtures`, `titleBarFlexModel`, `afterBoxHarness`, `fakeChatSlotsStore` are used only by tests, several by tests in two feature folders. Side effect: `check_headers.py`, `ratchet.py` and `code_map.py` skip `src/test-harness/`, so 929 lines stop counting as plugin code (the ratchet only improves).
- **`unified-input/constants.ts` goes to `src/shared/constants.ts`, unsplit.** 31 files import it and it mixes Ask-bar, tab-bar, chat and menu numbers. Splitting by feature is a change, not a move; not worth it now.
- **`backgroundAsk.ts` stays in `src/types/`; `inputTransparency.ts` moves there.** About 22 importers each, across six features; shapes only.
- **`askThinkEffort.ts`, its test and `replyVerbosity.ts` go to `settings/`.** They are the lists the settings are written from (schema, normalizers, folds). The Ollama tab imports them either way. The settings reviewer may want them inside the single settings list in step 6a.
- **`useThinkingNoticeGate` and its test go to `ai-connection/`.** Its only caller is the Ollama tab's Thinking row, and its test is about that row's ring. Readers said answer, ask or ai-connection.
- **`bonsaiSessionSurvival` and its test go to `plugin-shell/`.** 29 importers, nearly all in `plugin-shell/` and the main hooks; it names settings one by one (a settings-plumbing place for the settings reviewer).
- **`bonsaiPhaseToast` goes to `answer/notices/`.** Today its users are read aloud and the reply-ready toast; once read aloud is removed only the toast is left.
- **`rememberReturnWhileBoxOpens` goes to `downloads/`.** It remembers which button opened a download notice. Readers said `shared/focus/`.
- **`sessionRagComposer`, `composePresetSeedsWithSessionRag`, `sessionRagChipCandidates` stay with `preset-carousel/`.** Their only output is the chip row's seeds. The knowledge-library reviewer may want `sessionRagChipCandidates` (it calls the back end).
- **`troubleshootingAskHeuristic` goes to `answer/transcript/`.** Its one importer is `ChatTranscriptHintRows`. Readers said `permissions`.
- **`redactThinkingBlurbSpoilers` goes to `spoilers/`; `spoilerFenceRegistry` goes to `shared/focus/`.** The first is the spoiler rule applied to the thinking line; the second is one of the eight D-pad registries.
- **The six spoiler-fence test files go to `spoilers/`.** `emptyLabelSpoilerMark`, `gluedSpoilerOpener`, `oneLineSpoilerBlock`, `oneLineSpoilerCopyAndReadAloud`, `spoilerFenceOddShapes`, `tildeCodeReadAloud`. Five test the spoiler fence rules through the bubble and Copy. `tildeCodeReadAloud.test.ts` is the exception: after read aloud goes only its Copy case (L56-59) is left, so it goes to `reply-actions/` and is a step 5 merge target.
- **The four Text size tests go to `src/styles/text-size/`.** `textSizeScan`, `textSizeEverywhere`, `textSizeSurfaces`, `steamWordsScaled` guard every feature at once; `textPx` itself lives in `src/styles/sections/`. `steamWordsScaled.test.tsx` really tests `components/scaledSteamWords.tsx` (another reviewer's); if that file gets a folder, move the test with it.
- **`tallUpFromWord.test.ts`, `wordMirror.test.ts` and `answerBubbleWordsUp.ts` stay (in `answer/bubble/`).** Readers marked them `glossary: whole file` and `goes away`. By the kit's rule that means they touch the glossary; the underlined-word walk stays because the chips stay.
- **`useVoiceAskWithReadAloud.ts` stays (in `voice/`).** After read aloud goes it is still the wrapper that ends dictation before Ask. The removal lane will probably rename it; its own test file goes.
- **`answerReadableText.ts` goes to `answer/notices/` for now.** Only its table finder (L43-79) survives, used by `toastAnswerPreview.ts:160`. The removal lane may move that finder into `toastAnswerPreview.ts` and delete the file.
- **`firstRunNoticeWording.test.ts` goes to `about/`.** It reads `hooks/useDisclaimerAndLocalRuntimeGates.tsx` and `data/pluginQuickStartInstructions.tsx`, both other reviewers' files.

### 1d. Files outside my 474 that should join my folders

Other reviewers own these; listing them so the maps meet. Names that do not match mine need a decision by the session.

- `components/DrgGlossaryTermChip.tsx`, `utils/drgGlossary*.ts`, `data/drgGlossaryTerms.ts`: glossary reviewer. Many of my files name them (see Open questions).
- `utils/buildKbNotesBlockElement.tsx`, `kbNoteUsedByAnswer.ts` and `.fixtures.json`, `kbCloseMatchLineAgrees.ts`, `hooks/useKbNotesFold.ts`: the "From the notes" block under an answer. If these go to `answer/notes/` (new sub-folder) or to `knowledge-library/` is the knowledge reviewer's call; the fixture is read by a test of mine by relative path (section 2).
- `utils/troubleshootHintDismissals.ts`, `hooks/usePermHintNavTargets.ts`: the hint rows' state; they belong next to `ChatTranscriptHintRows` in `answer/transcript/`.
- `hooks/useIntentPacks.ts`, `utils/intentPackSearch.ts`: the kit calls intent packs `presets`; they would join `preset-carousel/`.
- `hooks/saveReplyToDesktopNote.ts`, `components/DesktopNoteSaveModal.tsx`: next to my `desktopChatAutosave.ts` in `user-notes/`.
- `components/OllamaThinkingEffortRow.tsx`, `OllamaReplyVerbositySlider.tsx`: import my `settings/` lists.

## 2. What a move must also update

Method: `git grep` of every file's name in everything outside `src/`, minus the history folders, `docs/code-map.md`, the generated
architecture maps and `src/types/rpcMethods.ts` (those the tool never touches). 139 of the 474 names turned up. `move_screen_file.mjs`
rewrites a repo path written out in full (`src/utils/foo.ts`) in documents, scripts, Python tests and JSON files, and every import and
`vi.mock` path in `src/`. So part A below is only what to **check** in the move commit; part B is what the tool cannot see.

### 2a. Paths the tool should rewrite (check each appears in the move diff)

| Where | What names my files | Files |
|---|---|---|
| `scripts/focus-baseline.json`, "counts" section | keys by path, with counts per rule | `AskStripSendButtons`, `MainTabAskModeMenuPopover`, `MainTabAttachMenuPopover`, `MainTabUnifiedAskBar`, `SessionContextStrip`, `useDockClearanceOnFocus`, `useMainTabAskBarFocus`, `answerBubbleElRegistry`, `answerBubbleNavigation`, `answerStopRegistry`, `focusNavigation`, `focusPerTurnRow`, `liveTurnFocusGraph`, `replyStopRegistry`, `spoilerFenceRegistry`, `uiDocument` (lines 5-90) |
| `scripts/focus-baseline.json`, "reasons" section | same keys with a note | `AskStripSendButtons`, `MainTabAskModeMenuPopover`, `MainTabAttachMenuPopover`, `MainTabUnifiedAskBar` (lines 95-110). After the move the keys are no longer sorted; the next `check-focus-patterns.mjs --update` will reorder them (noise, not an error) |
| `scripts/growth_limits.json` | three limit entries | `MainTabChatTranscript.tsx` (1104), `MainTabUnifiedAskBar.tsx` (1131), `useBonsaiAskOrchestration.ts` (1061). The file says it is written by `growth_limit.py` and not to be hand-edited; after the move run `python scripts/growth_limit.py` and confirm it reports no refusal |
| `scripts/ratchet.json` | nothing names my files (only `measured_by` text); `ratchet.py:743` names `usePluginSettings.ts`, not mine | none |
| `vitest.config.ts`, `tsconfig.json` | globs only (`src/**/*.test.{ts,tsx}`, `include: ["src"]`) | none; moving into new folders is safe |
| `scripts/check-focus-patterns.mjs` L105, L124 | exempt sets by full path | `src/utils/uiDocument.ts`, `src/utils/focusNavigation.ts` |
| `tests/contracts/ask-hook-order.json` | six `"file"` entries (L7, 11, 19, 23, 27, 31) | `useSuggestedPromptChips`, `useReplyFeedbackChips`, `useInputTransparencyRefresh`, `useAskMountRestore`, `useStrategyBranchActions`, `useAskSessionSnapshotActions` (the seventh, `useOllamaGameContextSync`, is not mine) |
| `tests/test_ask_hook_order.py` L24 | `MAIN = "src/hooks/useBonsaiAskOrchestration.ts"` read as text | `useBonsaiAskOrchestration.ts` |
| `tests/preview-suite/unit-gates.json` L12 | `"file": "src/data/presets.test.ts"` | goes with the preview-tool removal, not the move |
| `py_modules/**` comments | full paths in comments | `src/utils/markdownFenceReader.ts` (`response_verify.py:208`), `src/data/spoilerTitleProfiles.ts` (`spoiler_title_profiles.py:15`), `src/utils/expandOneLineSpoilerFences.ts` (`spoiler_empty_label_marks.py:7`), `src/utils/localOnlyAskCommands.ts` (`user_note_commands.py:12`, `vac_check_commands.py:34`), `src/data/askThinkEffort.ts` (`transparency_service.py:267`), `src/data/deckEssentialsTags.ts` (`ollama_routing.py:135`, by name), `src/utils/modelRoutingOrder.ts` (not mine) |
| `AGENTS.md` L89, L156, L162, L168 | markdown links | `src/utils/deckyCall.ts`, `uiDocument.ts`, `navFocusRegistry.ts`, `focusNavigation.ts`. AGENTS.md is at its size ceiling and helpers never edit it; the session reviews that diff |
| `packages/bonsai-mcp/scripts/generate-architecture.mjs` L94 | a hand-kept map entry `"src/components/MainTab.tsx": "Unified ask/search surface..."` | `MainTab.tsx` |
| Documents | `docs/focus-graph.md` (names about 60 of my files, most by bare name), `docs/design-tokens.md`, `docs/code-clarity.md`, `docs/development.md`, `docs/testing.md`, `docs/testing-manual.md`, `docs/testing-automated.md`, `docs/troubleshooting.md`, `docs/design-language.md`, `docs/roadmap*.md`, `packages/bonsai-mcp/knowledge/policies/decky-ui-focus.md`, `decky-ui-layout.md`, `personas/master-debugger.md` | A bare file name (no `src/` path) is not rewritten and goes stale. `CHANGELOG.md` is a log: run the tool with `--leave CHANGELOG.md`. The step-4 check "no explanation names a moved file" needs a name search, not only a path search |

### 2b. What the tool cannot see (needs a change in a commit **before** the moves)

Rule 5 says a move never shares a commit with a change, so these are fixed first, in one preparation commit. The screen tests find the repo root from
`process.cwd()` (vitest runs from the repo root) through one small helper, `src/test-harness/repoPaths.ts` (new); the two Python tests search `src/` for the file by name. Each line below is a place that
counts folders up from the test's own folder, or names a file by a path without `src/` in front.

| Test (path at `b5ce2768`) | Line | What breaks after a move | Silent? |
|---|---:|---|---|
| `components/MainTabUnifiedAskBar.noSettingsCard.test.tsx` | 71, 91 | `SRC = resolve(__dirname, "..")` (the whole source tree) and `rel !== "data/bonsaiSettingsNormalizers.ts"` (a path without `src/`, so never rewritten) | **Yes**: from a deeper folder the scan reads a smaller tree and still passes |
| `components/textSizeScan.test.ts` | 17, 20-23, 29, 40, 62 | `SRC = resolve(__dirname, "..")`; `PLAIN_ON_PURPOSE` lists `components/CharacterRoleplayEmoticon.tsx` and `styles/sections/tabIndicatorBar.ts` without `src/`; `files.length > 300` (L40) guards the size; L29 skips a folder named `test-harness` | Partly: the `> 300` guard catches a too-small tree; the two path strings fail loudly |
| `features/chat-title/noSavedChatsRow.test.tsx` | 19 | `SRC = join(__dirname, "..", "..")` | **Yes**, same as above |
| `data/firstRunNoticeWording.test.ts` | 10-12 | `join(__dirname, "..", rel)` with `hooks/useDisclaimerAndLocalRuntimeGates.tsx` and `data/pluginQuickStartInstructions.tsx` (both other reviewers' files) | No: `readFileSync` throws |
| `data/spoilerTitleProfilesContract.test.ts` | 26 | `resolve(__dirname, "../../tests/contracts/spoiler-title-profiles.json")` | No: throws |
| `components/MainTabChatTranscript.closeMatchLine.test.tsx` | 30 | `resolve(__dirname, "../utils/kbNoteUsedByAnswer.fixtures.json")`; the fixture also moves (another reviewer) and `tests/test_kb_notice.py:57` asserts its path as text | No: throws |
| `utils/reasoningDisplay.liveSteps.test.ts` | 23 | fixture beside it by `__dirname`; both move to `answer/reasoning/` in the `.tsv`, so it keeps working | No change needed |
| `tests/test_starter_set_extras.py` L49, `tests/test_starter_tag_parity.py` L31 | | `ROOT / "src" / "data" / "deckEssentialsTags.ts"`: path built from pieces, not found by the tool; the file moves to `src/features/models/` | No: throws |

Two more path rules to know about:

- **`scripts/check-focus-patterns.mjs:232`** says `const fileIsFocusLogic = /focus|navigation/i.test(relPath)`. A file whose path has the word
  `focus` or `navigation` is checked for page searches (`querySelector`, `activeElement`) on every line, not just inside focus functions.
  Moving into `src/shared/focus/` turns that on for files that did not have it. Concretely `chatPanelScroll.ts:109`
  (`scrollEl.querySelector(".bonsai-main-tab-dock")`) is not in the baseline and would be a new finding, so the first move commit would fail
  the check. `replyStopRegistry.ts` (3 recorded), `uiDocument.ts` (1) and `answerBubbleElRegistry.ts` (1) may count higher too; I did not run it on a
  moved copy. Two clean ways out: name the folder without the word (for example `src/shared/dpad/`; one find-and-replace in the `.tsv`), or
  keep `focus` and change line 232 first to the list of the files it covers today. The reverse also happens: the 25 `answerBubbleNavigation.*`
  files keep `Navigation` in their names, so they are unaffected.
- **`scripts/check_headers.py:95`, `ratchet.py:138`, `code_map.py:69`** skip `src/test-harness/`. The six stand-ins move out of the measured
  plugin code (929 lines). The ratchet improves; `python scripts/ratchet.py check` should say so and not fail.

## 3. Test files to merge, by topic

Numbers are at `b5ce2768`, counted by me. "Mocks" means a `vi.mock("@decky/ui", ...)` block written out in the file. My area has 254 test files, 106
of which write that mock out (189 in the whole screen side today). Merging must keep every test name (step 5's proof), so the saving is files and
repeated set-up, not tests.

| # | Group (new folder) | Files now | Topic of the merged files | Set-up repeated today | Verdict |
|---|---|---:|---|---|---|
| 1 | Transcript (`answer/transcript/`) | 38 (of 40; two removed) | Six topic files: the "N earlier" list (`earlierByDay`, `earlierPill`, `earlierPillLeftNav`, `firstArchivedHeaderMoveUp`, `olderTurnDownToNewer`, `searchJump`); ring kept through finish and walks (`collapseKeepsRing`, `finishKeepsHeaderRing`, `streamFinishKeepsRing`, `answerFinishStill`, `streamingSectionStops`, `retryNotAStop`, `upWalk`, `ratingRowWalk`, `sessionLadderExit`, `detailsTabs`); spoiler covers (`coverRevealHandle`, `cutSpoilerCover`, `liveConsent`, `spoilerCredits`, `spoilerStaysOpen`); the notes block (`kbNotesBlock`, `kbNotesGap`, `kbNotesSideways`, `closeMatchLine`); reasoning (`reasoningBlockStop`, `reasoningFold`, `reasoningLiveBlock`); hints, notices and the rest (`stoppedNotice`, `replyBlock`, `troubleshootHintDismiss`, `permHintNavRegistration`, `permissionHintFocus`, `diagnostics`, `strategyPanels`, `emptySlotPreview`, `questionFade`, `turnTitle`) | 38 of 40 files write their own `@decky/ui` mock (at least three different shapes: the plain one, the nav-node stub in `earlierListNavStub`, and the hand-built ones in `upWalk` L37-60). Seven different prop builders (`baseProps`, `props`, `renderTranscript`, `renderChat`, `renderTurn`, `renderReply`, `mount`), plus the Steam-navigation stand-in written again in `MainTabEmptyChatHelpChip.test.tsx` L27-57 and `MainTabInjectChipFocus.test.tsx` L29-65 | **Clear win.** About 38 files to 6 or 7. Leave `kbNotesBlock` (945 lines), `earlierByDay` (740) and `detailsTabs` (612) as they are inside their group; only the small files fold. `closeMatchLine` reads a fixture by path (section 2b). |
| 2 | Answer-bubble walk (`answer/bubble/`) | 24 + `answerBubbleNavigation.test.ts` | Cover walks; tall-section reading; whole-answer Down and Up mirror walks; entry and exit edges (see list in the notes below) | None to speak of: 24 of 25 already import `test-harness/deckAnswerWalk.ts` and most call `beforeEach(resetDeckAnswerWalk)`; each has a 15-line header | **Worth doing for file count; small line saving.** About 25 files to 5. Keep each file's header text as a `describe` comment. |
| 3 | Ask bar (`ask/bar/`) | 9 | Ring and D-pad (`askUp`, `boxDown`, `boxRing`, `cornerRing`, `leftHoldsStill`, `stopRing`, `test`); hint; "card is gone" scan | `buildProps` written out in 9 files (about 30 lines each; they differ only in the question text) plus `rightGroupProps`/`mount` twice; 8 `@decky/ui` mocks | **Clear win** for the seven ring files, with one shared `buildAskBarProps` in `test-harness/`. Keep `noSettingsCard` apart (it reads source text, section 4). |
| 4 | Chip ladder (`answer/details/`) | 8 (+ `chipLadderPlacement.test.ts`) | Draw and behaviour (`test`, `allChips`, `stillRow`); walks (`gridWalk`, `ringWalk`, `deckTry2`); reveal (`reveal`, `chipLadderPlacement`) | 7 of 8 write the `@decky/ui` mock; layout stand-ins (`deckChipLadderPane`) are already shared | **Worth it**, 9 to 3. 2,396 lines; none are small. |
| 5 | Preset chip row (`preset-carousel/`) | 4 row tests + 4 animated-chip tests + 2 stay tests | Row: `askRestart`, `holdStill`, `ringHold`, `test` to one file. Animated chips: `fadeButton`, `keepsRing` into `test`; keep `simulation` apart | Row tests repeat `seed`/`seeds`/row props 4 times and `frame()`/`distinctFramesOver()` twice; `standInForLayout` is written twice (`presetChipButton.scroll`, `presetChipStay.row`) | **Clear win** for the row (4 to 1). Animated chips: modest. |
| 6 | Chats title (`chats/title/`) | 13 | Name row (`ChatTitleView`, `nameRowIcons`, `nameRowSpill`); top strip (`topStrip`, `topStripHeightLock`); menu (`ChatsMenu`, `chatsMenuBoxReturn`, `chatsMenuNewChatAtTen`, `noSavedChatsRow`); switching (`useChatSwitchActions.limit`, `useChatTriggerSwitch`, `useChatTitlePublisher`, `chatTitleStore`) | 11 `@decky/ui` mocks; `chatTitleTestFixtures` already shares the main-tab harness | **Worth it**, 13 to 5. `noSavedChatsRow` and `nameRowSpill` have text-reading parts (section 4); keep those cases in their own file. |
| 7 | Chats slots (`chats/slots/`) | 7 | Delete flow (`afterDeleteLastChat`, `afterDeleteRebuild`, `useChatSlotDeleteConfirm`, `ChatSlotRenameModal`); chat-list hook (`useChatSlots`, `.limit`, `.noChat`) | The two `afterDelete*` tests share `afterBoxHarness` and `fakeChatSlotsStore`; the three hook tests each build their own | **Clear, small.** 7 to 3. |
| 8 | Voice (`voice/`) | 6 (5 after the read-aloud test goes) | `voiceClearAfterStop`, `voiceFinishAtStop`, `voiceStartGameFlag`, `voiceStartingFeedback` mount the whole plugin; `useVoiceAskInput.test` is the hook alone | 4 `@decky/ui` mocks | **Moderate.** Merge the four whole-plugin tests to 1 or 2 after read aloud is out; leave the hook test. |
| 9 | Reasoning (`answer/reasoning/`) | 6 | `reasoningDisplay.*` (4: `test`, `tidy`, `liveSlice`, `liveSteps`) to one file; `buildReasoningFoldElement.test` + `.walk.test` to one | none; `liveSlice` is misnamed (it tests the tidy function) | **Clear win**, 6 to 2. Fixture JSON stays beside the live-steps test. |
| 10 | Reply actions (`answer/reply-actions/`) | 3 + `ReplyCopyButton.test` | `buildReplyActionsElement.ratingKeepsRing` and `.revealChips` into `.test` | all three mock `@decky/ui` | **Clear, small.** 3 to 1. |
| 11 | Spoiler fence shapes (`spoilers/`) | 6 | `emptyLabelSpoilerMark`, `gluedSpoilerOpener`, `oneLineSpoilerBlock`, `oneLineSpoilerCopyAndReadAloud`, `spoilerFenceOddShapes`, and (in `reply-actions/`) `tildeCodeReadAloud`: all feed an odd hidden-block shape through the bubble, Copy and the toast | 3 `@decky/ui` mocks; each builds the bubble in the same way; read-aloud halves go in step 3 first | **Clear win** after the removal, 6 to 2. |
| 12 | Ask hook (`ask/flow/`) | 5 | `useBonsaiAskOrchestration.afterAnswer`, `.desktopNote`, `.noChatRestore`, `.noteOffer` (4 small) into one; keep the 2,278-line characterisation file apart | `makeArgs` written out in 4 of 5 files (each ~25 lines, different overrides) | **Worth it** for a shared args builder; merging the files is optional. |
| 13 | Main tab (`main-tab/`) | 6 | `dockClass`, `gameLighter`, `streamScramble` (small) into one; `tabBarDownEarlier` + `tabBarDownRetry` into one; keep `askStrip.deck` | 3 mocks | **Moderate**, 6 to 3. |
| 14 | Text size (`styles/text-size/`) | 4 | `textSizeEverywhere` and `textSizeSurfaces` both check "every word scales once" (L154-161 and L135-161) and both draw the chips, tab bar and Settings text | 3 mocks | **Worth it** for these two (2 to 1). Keep `textSizeScan` and `steamWordsScaled` apart. |
| 15 | Focus registries (`shared/focus/`) | 3 `navFocusRegistry.*` + 4 `useAskBarInitialRingClaim.*` + `askBarRingWatch.titleView` | `navFocusRegistry`, `.remount`, `.windowFocus` to one; the ring-claim trio plus ring watch to one | none | **Clear, small.** 8 to 2. |
| 16 | Details slot and session strip (`answer/details/`) | 3 | `DetailsSlot.deck` (952 lines), `SessionContextStrip.test`, `revealOpenedDetails.test` | 3 mocks | **Not worth it**: three different subjects. |
| 17 | Preset logic units (`preset-carousel/`) | 11 small | `carouselState`, `changeSpacing`, `nextChipRule`, `presetSlotRotation`, `presetRowLayout`, `presetChipStay`, `sessionRagComposer`... | none (pure functions) | **Not worth it**, except `changeSpacing.test` into `presetChipStay.test` (it imports it). |
| 18 | Stream scramble (`answer/stream/`) | 4 | `liveScrambleMemo`, `streamScrambleMath`, `streamScrambleContext`, `ScrambledAnswerText` | 1 mock | **Not worth it** beyond joining the tiny `streamScrambleContext.test` to `ScrambledAnswerText.test`. |
| 19 | Chat sum-up (`chats/sum-up/`) | 5 | `SessionSumUpSection.deckPlace` + `.reveal`; others separate | 3 mocks | **Marginal**: merge the two section files only. |

Bubble-walk grouping for group 2 (24 files): cover walks (`coverAtSectionTop`, `coverMargin`, `coverMirror`, `coverUp`, `deepCoverEntry`, `lastSectionCover`, `upEntryCoverSection`); tall sections (`tallEndAboveDock`, `tallEntry`, `tallSectionLift`, `tallUpFromWord`, `lastStep`); whole-answer walks (`downVisible`, `mirrorWalk`, `walkThrough`, `readingWalk`, `wordMirror`); entries, exits and the ring (`firstSection`, `lastSection`, `ringOnBubble`, `ringFollowsScroll`, `upLandingClear`, `controlsLift`, `steamTopMargin`). `readAloudCorner` is removed whole.

Rough size of the gain: about 100 fewer files (groups 1 to 15 together). I did not measure the lines saved; the repeated set-up I could count is the nine Ask-bar prop builders, four Ask-hook arg builders, four preset-row prop builders and the `@decky/ui` mock in 106 files, which the one shared test setup in step 5 covers.

## 4. Tests that check the code's text instead of what it does

Two kinds. **A** reads source files from disk and asserts on their text. **B** asserts with a regular expression on a stylesheet string the code builds (not a file read, but it pins CSS wording, not a rendered result). I searched every test in my 474 for `readFileSync`, `readdirSync`, `?raw`, `__dirname`, `.toString()` and for CSS regexes. The readers' "no" held for every other file.

### A. Reads source text

| Test | Lines | What it reads | Suggestion |
|---|---|---|---|
| `components/MainTabUnifiedAskBar.noSettingsCard.test.tsx` | 11, 71-92 | every non-test `.ts`/`.tsx` under `src/`, line by line, for six retired names (`persist_search_only`, `bonsai-settings-results-card`, `useAskBarSettingsCard`, ...) | Keep the rendering checks (typing a setting's name draws no card). The text scan is a repo rule, not a behaviour test: move it to a check script or drop it (the card went long ago). |
| `features/chat-title/noSavedChatsRow.test.tsx` | 19-54 | every source file (comments stripped) for the removed saved-chats row's import, tag and focus id | Same: keep the "Main tab draws no row" check; move the scan to a script or drop it. |
| `components/textSizeScan.test.ts` | 13, 47, 63 | every source file for `fontSize:` and `font-size:` that skip `textPx`; then the two exception files | A legitimate repo rule (a lint). Leave it in place, or move it beside `check-focus-patterns.mjs`. It needs the path fix in 2b. |
| `data/firstRunNoticeWording.test.ts` | 6-35 | `useDisclaimerAndLocalRuntimeGates.tsx` and `pluginQuickStartInstructions.tsx` as text, with regexes for the wording | Render the first-run notice and the quick start and assert on what is drawn. Medium effort. |
| `components/MainTabPresetAnimatedChips.test.tsx` | 269-306 (asserts at 292-296) | `Component.toString()` and the memo comparator's `.toString()`; every declared prop name must appear in the comparator's text | Replace with one test per prop: change that prop and check the row redraws. The file already has a "re-renders when a prop changes" case to extend. |
| `tests/test_ask_hook_order.py` (Python) | 24, 56 | `useBonsaiAskOrchestration.ts` and six sub-hook files, to compare the order hooks are called in against `tests/contracts/ask-hook-order.json` | By design (React matches hooks by position; nothing else can test it). Keep. It needs the six paths in the JSON rewritten by the move. |
| `tests/test_starter_tag_parity.py` L31, `tests/test_starter_set_extras.py` L49 (Python) | | `deckEssentialsTags.ts` text, to compare the starter tags with the back end's | By design (a parity test, named in the file's own header). Keep. |

### B. Pins stylesheet wording

| Test | Lines | What it reads | Suggestion |
|---|---|---|---|
| `components/MainTabChatTranscript.kbNotesGap.test.tsx` | 76 | `buildAnswerBubbleSection()` text for `.bonsai-chat-turn-slot { gap: Npx }` | Measure the gap in the rendered row (the sibling `MainTab.askStrip.deck` test already applies the real stylesheet in jsdom). |
| `components/MainTabUnifiedAskBar.cornerRing.test.tsx` | 70-86 | `buildSection8Section()` text for the icon row's padding on three sides (`iconRowPaddingPx`) | Same: read `getComputedStyle` with the stylesheet applied, as `boxRing.test.tsx` does. |
| `components/textSizeEverywhere.test.tsx` | 175-193 | the scope stylesheet and `CHAT_TITLE_CSS` text, every `font-size` rule must read the text scale variable and "never the UI scale" | The UI-scale half goes with UI scale (step 3). The rest overlaps `textSizeScan.test.ts`; fold into it. |
| `features/details-slot/DetailsSlot.deck.test.tsx` | 376-379, 524-535, 729-733 | `buildDetailsSlotSection()` text: grid cell, 30 px height, 120 ms fade, reduced-motion block | Computed-style checks with the stylesheet applied (the file already does this at L330). |
| `utils/questionBubbleFit.test.tsx` | 172-221 | `buildQuestionBubbleSection()` text: even lines, Retry gap, float | Same. |
| `features/chat-title/nameRowSpill.test.tsx` (with `titleBarFlexModel.ts`) | all | the flex numbers parsed out of `CHAT_TITLE_CSS`, then a hand-written flex algorithm run over them | Not a bug: jsdom lays nothing out, and the file explains the check was proven against Chrome. Keep; mention only because it is text-driven. |

## 5. Unused and written twice

Every line below was either checked by me with `git grep` (marked **checked**) or comes from one reader's record with the line numbers I could spot-check (marked **record**). Lines are at `b5ce2768`.

### Worth acting on (dead code or a real duplicate; a later step can do these)

| Where | What | Basis |
|---|---|---|
| `reasoningDisplay.ts:84-90` `dropRuleChecklist` option | No non-test code passes it; only `reasoningDisplay.liveSlice.test.ts` (L34, L50) and `reasoningDisplay.tidy.test.ts` (L70-155) do. The live-line branch is dead in production. Either wire it or delete the branch and those tests. | checked |
| `ReplyCopyButton.tsx:29-30` props `disabled`, `deckNav`; `:138-148` the labelled look | The only caller (`buildAnswerCornerSlots.tsx:198`) passes `corner getCopyText` and nothing else; the labelled look is drawn only by `ReplyCopyButton.test.tsx`. Remove both and the test's labelled case. | checked |
| `StreamFenceWaitChip.tsx:26` prop `pulseBubble` | Declared, never read, no caller passes it. | checked |
| `buildReplyActionsElement.tsx:147,151` `onMoveUpFromUtility`, `onMoveDownFromThumbs` | Declared in the args type, not in the destructure at L337-340. Also remove from the transcript's pass-down (a hand-down target for 6c). | checked |
| `askOrchestrationArgs.ts:26,30,42,43` `strategySpoilerMaskingEnabled`, `unifiedInputPersistenceMode`, `aiCharacterEnabled`, `aiCharacterPresetId` | Declared, and `useBonsaiAskOrchestration.ts` never reads any of the four. Four of the 26 hand-downs in a single step. | checked |
| `contextChipsFromSnapshot.ts:74` `chipHasAttribution`, `:115` `tierBorderColor`, `:122` `tierBackground` | Called only by `contextChipsFromSnapshot.test.ts` (L14-17, L49-94). Two of them repeat one three-tier if-chain. Delete with their test cases. | checked |
| `presets.test.ts:60-67` | `if (!TEMP_PRESET_CAROUSEL_FROZEN) return;` and `TEMP_PRESET_CAROUSEL_FROZEN` is shipped `false` (`presets.ts:84`), so the test passes without checking anything. Delete it or make it set the flag. | record + checked |
| `chatTitleStore.ts:65,164` and `useChatTitlePublisher.ts:37,78` `answerInFlight` | Written, copied and compared, never read by the title view (`ChatsMenu` gets it as its own prop from `MainTab`). | checked |
| `deckyTitleParts.ts:53,59` `view`, `scope` | Set at L84, never read by `deckyHeaderShape.ts`. | record |
| `answerBubbleNavigation.ts:599,628,798` `focusedChunkRef` passed on and then ignored (`_focusedChunkRef`) | Two functions take and ignore it. | checked |
| `bonsaiSessionSurvival.ts:227` `_seenAtMount` | Parameter never read; callers still pass it (`usePluginSettings.ts:475`, `useSessionRestoreAfterRemount.ts:82`). | checked |
| `useVoiceAskInput.ts:329,332,333` returns `endDictation`, `stopVoiceTranscription`, `invalidateVoice` | No file reads them from the hook; used inside the hook only. | checked |
| `MainTabAskModeMenuPopover.tsx` L74-159 and `MainTabAttachMenuPopover.tsx` L85-161 | The Escape effect, the measure step and the floating wrapper styles are near copies. A shared popup hook would remove about 90 lines. No "kept on purpose" comment. | checked (Escape at L118 and L120) |
| `MainTabPresetRow.tsx:47-66` `HelpChipRoot` and `:75-94` `InjectChipRoot` | Near copies with the same four props; only the Up handler differs. | record |
| `presetChipButton.tsx:216-228` and `presetDecodeChipButton.tsx:114-126` | The same `[beta]` tag markup; the comment above the badges says they are shared but the tag is not. | checked |
| `buildAnswerBubbleElement.tsx:222-228, 398-402, 458-464` | The Down and Up button handler written three times. | record |
| `MainTabUnifiedAskBar.tsx` L223-225 and L352-353; L741-753 and L789-804; `onOKButton` at L596, 696, 734, 774 | A newline collapse twice, an icon style twice, a stop-then-act handler four times. This file is one of the three over the growth limit. | record |
| `useChatSumUpJob.ts:82,123,124,127` | The same `toaster.toast({ title: "Sum up this chat", ... })` shape four times with two durations. | checked |
| `redactThinkingBlurbSpoilers.ts:18` and `splitThinkingBlurbItalicSegments.ts:20` | The redaction glyph typed twice; one should import `REDACTION_GLYPH`. | record |
| `spoilerFenceRegistry.ts:103-113` and `:120-130` | `findLastSpoilerFenceIn` and `findFirstSpoilerFenceIn` are one loop with the comparison flipped. | record |
| `carouselNextChip.ts:36-37` and `nextChipRule.ts:80-81` | The same `isGame` rule (two lines each). | checked |
| `runningGameCharacterSuggestions.ts:78-89, 102-115, 142-156` | Three loops that skip repeats and stop at three entries. | record |
| `strategyChecklist.ts:104-123` | Two payload builders for the same five fields. | record |
| `MainTabScreenshotBrowser.tsx:175,183` | The same long message string twice. | checked |
| Test helpers written more than once | Ask-bar `buildProps` ×9; Ask-hook `makeArgs` ×4; preset-row props ×4 and `frame()`/`distinctFramesOver()` ×2; `standInForLayout` ×2; Steam-navigation stand-in ×3 (`upWalk`, `MainTabEmptyChatHelpChip`, `MainTabInjectChipFocus`); the "every word scales once" check ×2. These belong to step 5's shared setup, not to a code clean-up. | record, counts checked |

### Test-only exports (fine to keep, or move into the test)

`chipLadderGrid.ts:87` `rowWidthOf` (only `chipLadderGrid.test.ts:18,33`), `carouselState.ts:52` `visibleWindowTexts` (only its test), `nameRowBalance.ts:48` `nameRowGeometry`, `deckyHeaderLayout.ts:56` `headerLayout` (kept on purpose, header L4-5: the arithmetic is a test), `chatNameNav.ts:66` `chatNameHasRing`, `askThinkingPhases.ts:22` `ASK_THINKING_STARTING_DISPLAY`, `resetDetailsSlotStore` (`detailsSlotStore.ts:175`, says "Tests only"), `composeDecodeText` (`presetChipDecodeText.ts:77`, re-exported for tests, kept on purpose). Each is small and pins a number or a word; moving them into the test file is optional.

### Fine to keep (kept on purpose, or two languages that must agree)

- Parity copies with a test or a comment that says so: `deckEssentialsTags.ts` (`tests/test_starter_tag_parity.py`), `inputSanitizerCommands.ts` (`docs/development.md:282`), `stripSoftContinueCue.ts` (`tests/test_ollama_ask_budgets.py:147-160`), `thinkingSummaryText.ts` (`tests/test_bonsai_stream_tags.py:66`), `troubleshootingAskHeuristic.ts` (comment L15-23), `useChatTitlePublisher.ts:43` ("New chat", comment L42).
- **Two cross-language copies with no test or comment**, worth a parity test or at least a comment: `replyMicroActions.ts` against `reply_followup_blocks.py:24-29` (five ids and wording) and `askThinkEffort.ts` against `ollama_ask_budgets.py:60-61` (record says unknown whether a test ties them).
- Twins kept on purpose: `carouselState.ts:101` (mirrors `presetSlotRotation.ts:116`), `composePresetSeedsWithSessionRag.ts:40,93`, `chatSlotsApi.ts:208,220`, `chatSlotTurns.ts:67-82`, `buildTurnHeaderElement.tsx:236-243, 360-366`, `useAskSessionSnapshotActions.ts:142-165, 198-214`, `useThinkingNoticeGate.tsx:60-74` (accept-once storage), `deckyHeaderLayout.ts`.
- `|| true` at `SessionContextStrip.tsx:210,218` and `useMainTabAskBarFocus.ts:262`: the press is consumed either way; comments say so.
- `joinPresetWithRunningGame.ts` returns its input unchanged; three callers and a test file. Its header says it stays as a stable import. Fine to keep; inlining is optional.
- `focusNavigation.ts:81,87` `isDownNavigationEvent`/`isUpNavigationEvent` have no caller, but `check-focus-patterns.mjs:121` looks for calls to them by name. Remove both with that rule or keep both. `isCancelDeckButtonEvent` (L163) is called only by `DrgGlossaryTermChip.tsx` (glossary reviewer).

## Open questions for the one running the session

- **Folder name `focus` and the focus check.** Keep `src/shared/focus/` and first edit `check-focus-patterns.mjs:232`, or rename the folder (for example `src/shared/dpad/`). What settles it: run the check on a copy after moving the 28 files (2 minutes). All reviewers use the kit's name; a rename is one replace in each `.tsv`.
- **One preparation commit before step 4** for the tests in 2b: the six screen tests find the repo root from `process.cwd()`; the two Python tests find `deckEssentialsTags.ts` by a search under `src/` instead of a fixed path. Is that acceptable under rule 5, or should they be fixed by hand in the move commit? I recommend the preparation commit (the move check then stays clean).
- **Is `answer/` with eight sub-folders right?** Alternative: eight top-level folders (`answer-transcript`, ...). I prefer sub-folders because a reader looking for "the answer" finds one place. It changes the plan's wording "one folder per feature" slightly.
- **`chats/` as one folder with three sub-folders,** or keep the three folders as they are? The three already import each other; one folder with three parts is the clearer reading.
- **Glossary reviewer.** My files hold many `glossary:` lines in the readers' records. By the kit's rule these are touches, not deletions: the chip, its registry, tooltip and the underlined-word D-pad walk stay. Files and tests with glossary lines: `MainTabBonsaiAiMarkdownChunk.tsx` (L183-227 linkify, L637-654), `StreamMarkdownPieces.tsx` (L24-54), `buildAnswerSections.tsx` (L24, 75, 110, 123, 160, 181), `buildReplyActionsElement.tsx` (L107-115, L433), `answerBubbleNavigation.ts` (L156-168, 697-724, 808-827), `answerBubbleWordsUp.ts` (`wordStepUp` L76-120), and tests `answerBubbleNavigation.test.ts` (L237-367), `ringFollowsScroll` (L28-157), `tallSectionLift` (L94-112), `tallUpFromWord`, `wordMirror`, `buildReplyActionsElement.test.tsx` (L369-406), `useDockClearanceOnFocus.test.ts` (L350), `StreamMarkdownPieces.test.tsx`, `MainTabBonsaiAiMarkdownChunk.test.tsx` (L76-136). I kept all of them in my map. The glossary reviewer decides which lines change; if any walk step goes, `answerBubbleWordsUp.ts` shrinks to `landGoingUpInto` and `settleBoxGoingUp`.
- **Read-aloud lane.** (a) `useReadAloud.ts:258-314` holds three functions that voice input calls (`rememberAskCameFromMic`, `noteAskPressed`, `questionCameFromMic`); the lane must split them before deleting the file, and `useVoiceAskWithReadAloud.ts` loses a large part of its 174 lines (the record lists about a dozen ranges) but stays as the wrapper that ends dictation before Ask (probably renamed). (b) `answerBubbleNavigation.readAloudCorner.test.tsx` also checks that the **Copy** button is lifted clear of the dock; if that has no other test, port it before deleting. (c) `answerReadableText.test.ts:140-157` is the only test of `replaceMarkdownTables`; port it into `toastAnswerPreview.test.ts`. (d) `replyStopRegistry.ts` L57-58, L93 hold the `"read-aloud-corner"` stop id; `buildAnswerCornerSlots.tsx`, `buildAnswerBubbleElement.tsx` and several tests carry the speaker (the readers' lists are in batches b19-b26).
- **Ban-lookup lane.** `chat-perm-hint-deny` is the ban-lookup row (`usePermHintNavTargets.ts:38-41` registers `vacDenyRowNavRef` under it), which settles a reader's "unknown" in b23. Files in my area with ban lines: `ChatTranscriptHintRows.tsx` (L140-167 whole row), `chatTranscriptNavHelpers.ts` (L283-298), `presetRowFocusNav.tsx:216`, `useBonsaiAskOrchestration.ts:1382-1388`, `localOnlyAskCommands.ts` (`vac-check`), `navFocusRegistry.ts:67,74`, `presets.ts:207` (the ban chip), `steamWordsScaled.test.tsx:70`, `bonsaiSessionSurvival.test.ts:64`, and partial tests: `handRingOnWhenGone.test.ts`, `permHintRowNav.test.ts`, `permissionHintFocus`, `permHintNavRegistration`, `presetRowFocusNav.upFromChips.test.tsx`, `presets.test.ts`, `localOnlyAskCommands.test.ts`, `emptySlotPreview`.
- **UI-scale lane.** `chatsMenuStyles.ts` holds 22 `uiScalePx` calls (L36-150); `SessionTitleOffer.tsx` 4; `useUnifiedInputSurface.ts` 8 lines; `useUnifiedInputSurface.test.ts` L157-163 comment; `bonsaiSessionSurvival.test.ts:69-70`; `useBonsaiAskOrchestration.test.ts:85-86`; `textSizeEverywhere.test.tsx` (the "never the UI scale" half).
- **D-pad helpers and hand-downs reviewers.** My map puts five of the eight registries in `shared/focus/` plus `liveTurnFocusGraph` and `chatTranscriptNavHelpers`; count and line facts are in the batch records (b16, b18-b25). Hand-down figures from my records: `MainTab.tsx` 106 in; `MainTabUnifiedAskBar.tsx` 39 in; `useBonsaiAskOrchestration.ts` 26 in and 56 out; `useAskSessionSnapshotActions.ts` 33; `bonsaiSessionSurvival.ts` 32; `buildAnswerBubbleElement.tsx` 17; `buildDetailsPanelElement.tsx` 15; `ChatsMenu.tsx` 14; `useVoiceAskWithReadAloud.ts` 10.
- **The "From the notes" block and the notes files** (1d) need a home before the answer sub-folders are final; I did not create `answer/notes/` because the knowledge reviewer may place them under `knowledge-library/`.
- **`src/features/answer/transcript/` is 56 files** (38 are tests that step 5 merges to about 7). Fine for now; if it must be smaller before step 5, the first split is the earlier-list pieces (`buildEarlierList`, `EarlierListLine`, `useEarlierTurnsPill`, `earlierTurnsByDay` and tests) into `answer/transcript/earlier/`.
- **Plan text.** The plan says the transcript has 34 test files; there are 40 `MainTabChatTranscript.*` test files (38 after two are removed whole). The plan's 24 for the answer walk is right once the speaker test is removed (25 before, plus the main test).

## Records found wrong

I checked about 120 of the 474 records against the code (every reader's claim that is quoted in sections 2, 4 and 5 and every record that drove a folder choice), plus the "tests: none found" claim of all 65 code records that make it, by search. Findings:

| Batch | File | Field | Said | True |
|---|---|---|---|---|
| b14 | `hooks/chipLadderPlacement.ts` and `.test.ts` | feature, new folder | presets, `preset-carousel/` | The kit says the chip ladder is `answer`; they place the Show details chips. Folder is `answer/details/`. |
| b16 | `hooks/useChipGridOrder.ts`, `hooks/useChipLadderReveal.ts` | feature, new folder | presets, `preset-carousel/` | Same: `answer/details/`. |
| b19 | `answerBubbleNavigation.tallUpFromWord.test.ts`, `.wordMirror.test.ts` | feature, removal, folder | glossary, "whole file", `goes away` | A `glossary:` entry means "touches the glossary", not "delete" (reviewer kit). The underlined-word walk stays, so both files stay in `answer/bubble/`. |
| b19, b21, b02 | `answerBubbleWordsUp.ts`, `answerBubbleNavigation.ts`, `answerBubbleNavigation.test.ts`, `buildReplyActionsElement(.test).tsx`, `MainTabBonsaiAiMarkdownChunk(.test).tsx`, `StreamMarkdownPieces(.test).tsx`, `answerBubbleNavigation.ringFollowsScroll.test.ts`, `...tallSectionLift.test.ts` | removal (glossary lines) | line ranges listed as things the removal deletes | These are touch lists. The chips and their D-pad steps stay unless the glossary reviewer's list says otherwise; only the built-in word list and the one-game names go. |
| b02, b03, b04 | all `MainTab.*.test.*` and most `MainTabChatTranscript.*.test.*` records | feature | empty, or in backticks (b04), or a different tag than the file's topic (`spoilers`, `search-tab`, `presets`, `strategy`) | Cosmetic. For a test file the folder follows the file it tests, so none of these changes my map. |
| b11 | `details-slot/DetailsSlot.tsx`, `DetailsSlot.deck.test.tsx` | feature | presets (see Surprises) | The store (`detailsSlotStore.ts`) was tagged `answer`. The slot stands in for the answer's Show details line; all three go to `answer/details/`. |
| b12 | `presetRowFocusNav.tsx`, `presetRowNav.ts`, their two tests, `injectChipNav.ts` (b02) | new folder | `src/shared/focus/` | Kept in `preset-carousel/` (single feature and its consumers); a judgment call, not an error. |
| b23 | `handRingOnWhenGone.test.ts` | removal | "Unknown here: whether chat-perm-hint-deny is the ban-lookup row" | It is: `usePermHintNavTargets.ts:38-41` registers the ban row's ref under that id. |

Not wrong, but worth knowing: the record for `MainTabChatTranscript.tsx` (b05) says 40 matching test files and that is exact; the script's test list for `deckyCall.ts` (2 test files) misses 13 that import or mock it (record b22, confirmed by the 15 in the record); `useAskMountRestore.ts`, `useInputTransparencyRefresh.ts` and `useStrategyChecklistSession.ts` have no test of their own but are pinned by `tests/contracts/ask-hook-order.json`.
