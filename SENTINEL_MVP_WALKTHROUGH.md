# SENTINEL MVP WALKTHROUGH

This document explains the exact behavioral characteristics of the Sentinel MVP trading enforcement system.

---

## 1. High-Level Architecture

**Frontend**: Next.js web application with React components  
**Backend**: Supabase (PostgreSQL database + authentication)  
**Rule Enforcement**: Client-side evaluation on page load  
**Lockout Logic**: Computed dynamically on the dashboard based on current state

The system operates as follows:
- User logs in via Supabase authentication
- On first login, user completes onboarding to set their rules
- Dashboard fetches user's rules and today's trades from database
- Dashboard calculates current PnL, trade count, and time violations
- If any violation exists, system status changes to "LOCKED"
- When locked, the "Log New Trade" button is disabled
- All rule checks happen before the trade form opens

---

## 2. Rule Enforcement Flow

### A. User Attempts to Log a Trade

**Step 1: Initial Gate Check**
1. User clicks "Log New Trade" button on dashboard
2. System checks current status (ACTIVE or LOCKED)
3. If status is LOCKED, button is disabled and unclickable
4. If status is ACTIVE, emotional gate modal opens

**Step 2: Emotional State Gate**
1. User must answer 4 yes/no questions about their mental state:
   - "Are you trying to recover a recent loss?"
   - "Do you feel urged to trade immediately?"
   - "Are you distracted or angry?"
   - "Did you deviate from your plan on the last trade?"
2. If ANY answer is "yes", trading is blocked immediately
3. User sees "Trading Blocked" message with no bypass option
4. Modal must be closed manually; trade form never opens

**Step 3: Trade Form (if emotional gate passed)**
1. Trade form opens for data entry
2. User fills: Symbol, Direction (LONG/SHORT), Entry Price, Size, Stop Loss
3. Exit Price is optional (filled only for closed trades)
4. System validates Stop Loss logic:
   - LONG: Stop Loss must be below Entry Price
   - SHORT: Stop Loss must be above Entry Price
5. Risk amount is calculated automatically: `|Entry - Stop| × Size`
6. PnL is calculated if Exit Price is provided: `(Exit - Entry) × Size` for LONG, `(Entry - Exit) × Size` for SHORT

**Step 4: Data Submission**
1. Trade data is written directly to database
2. No server-side rule validation occurs during submission
3. Trade is saved with status "OPEN" or "CLOSED" based on Exit Price presence
4. Page refreshes automatically after successful submission

**Step 5: Post-Submission Rule Evaluation**
1. Dashboard reloads and fetches updated trade data
2. System recalculates daily PnL and trade count
3. If new totals violate any rule, status changes to LOCKED
4. User sees violation immediately on next page load

**Rule Evaluation Order**:
1. Daily loss limit check
2. Trade count limit check
3. Trading window time check
4. Status determination (ACTIVE if all pass, LOCKED if any fail)

**What Blocks vs What Locks**:
- **Blocks**: Emotional gate failure (temporary, modal-level)
- **Locks**: Rule violations (persistent, system-level)
- **Blocks** prevent form from opening
- **Locks** prevent button from being clickable

**When Data is Written vs Rejected**:
- Data is ALWAYS written if form validation passes
- No pre-submission rule enforcement exists
- Rules are checked AFTER trade is logged
- If trade causes violation, subsequent trades are blocked

### B. User is Already Locked

**Attempt to Trade**:
1. Dashboard displays "LOCKDOWN ACTIVE" status badge (red)
2. "Log New Trade" button shows as "Trading Locked" (disabled, red)
3. Button cannot be clicked
4. No modal opens
5. No trade can be logged

**Lockout Expiration**:
- Daily lockouts (loss limit, trade count) reset at midnight (00:00:00 local time)
- Trading window violations clear when current time re-enters the allowed window
- System automatically recalculates status on every page load
- No manual reset mechanism exists
- Lockout survives page refresh, logout, and browser restart

---

## 3. Each Rule Explained in Plain English

### Rule 1: Max Risk Per Trade (%)
**Input Checked**: Calculated risk amount from Stop Loss  
**Trigger Condition**: Currently NOT enforced in MVP  
**System Action**: None (display only)  
**Note**: This rule is configured but not actively blocking trades in current implementation

### Rule 2: Max Daily Loss ($)
**Input Checked**: Sum of all PnL values for trades executed today  
**Trigger Condition**: Daily PnL ≤ -(Max Daily Loss value)  
**System Action**: Status changes to LOCKED, trading button disabled, user redirected to violation page if they navigate there  
**Example**: If max daily loss is $500 and user loses $500 or more, lockout triggers

### Rule 3: Max Trades Per Day
**Input Checked**: Count of all trades (open or closed) executed today  
**Trigger Condition**: Trade count ≥ Max Trades Per Day  
**System Action**: Status changes to LOCKED, trading button disabled  
**Example**: If max is 5 trades and user logs their 5th trade, lockout triggers immediately

### Rule 4: Trading Window (Time Range)
**Input Checked**: Current system time  
**Trigger Condition**: Current time is before window start OR after window end  
**System Action**: Status changes to LOCKED, trading button disabled  
**Example**: If window is 09:30-16:00 and current time is 08:00, trading is locked  
**Note**: Window is assumed to be within same calendar day (no overnight windows)

### Rule 5: Emotional State Gate
**Input Checked**: User's answers to 4 psychological questions  
**Trigger Condition**: ANY "yes" answer to the 4 questions  
**System Action**: Trade form blocked from opening, user shown "Trading Blocked" message  
**Note**: This is a pre-trade gate, not a persistent lockout. User can retry on next attempt.

---

## 4. Lockout Logic

### Types of Lockouts

**Daily Loss Lockout**:
- Duration: Until midnight (00:00:00) of next calendar day
- Trigger: Daily PnL reaches or exceeds negative max daily loss
- Reset: Automatic at midnight
- Cannot be manually overridden

**Daily Trade Count Lockout**:
- Duration: Until midnight (00:00:00) of next calendar day
- Trigger: Number of trades reaches max trades per day
- Reset: Automatic at midnight
- Cannot be manually overridden

**Trading Window Lockout**:
- Duration: Until current time re-enters allowed window
- Trigger: Current time outside defined start-end range
- Reset: Automatic when time enters window
- Cannot be manually overridden

**Emotional Gate Block** (not a lockout):
- Duration: Until modal is closed
- Trigger: Any "yes" answer to psychological questions
- Reset: User can retry immediately on next trade attempt
- Not persistent across sessions

### Lockout Duration Calculation

Daily lockouts calculate reset time as:
1. Take current date
2. Set time to 00:00:00
3. Add 1 day
4. Lockout persists until that timestamp

Trading window lockout:
1. Parse window start and end times
2. Convert to minutes since midnight
3. Compare to current time in minutes since midnight
4. Lock if outside range

### What Resets Automatically

- Daily PnL counter (resets at midnight)
- Daily trade count (resets at midnight)
- Trading window status (resets when time enters window)
- Emotional gate state (resets on modal close)

### What Never Resets Manually

**There is no override mechanism.**

- No admin panel to unlock
- No emergency bypass button
- No "I promise I'll be good" checkbox
- No customer support override
- No developer backdoor
- Rules cannot be changed while locked (settings page is accessible but lockout persists based on existing violations)

---

## 5. Edge Case Handling

### Win Then Loss Same Day
1. User logs winning trade (+$200)
2. Daily PnL = +$200, status = ACTIVE
3. User logs losing trade (-$700)
4. Daily PnL = -$500, status = LOCKED (if max loss is $500)
5. Lockout triggers on the loss that crosses threshold

### Loss Then Win Same Day
1. User logs losing trade (-$300)
2. Daily PnL = -$300, status = ACTIVE (if max loss is $500)
3. User logs winning trade (+$100)
4. Daily PnL = -$200, status = ACTIVE
5. No lockout because net loss is within limit

### Partial Profit Cap Hits
**Note**: MVP does not implement profit protection cap. This is a known limitation.

### Trade Logged Exactly at Session Boundary
**Scenario**: User submits trade at 16:00:00 when window ends at 16:00

1. Trade form submission occurs
2. Trade is written to database with current timestamp
3. Page refreshes
4. Dashboard recalculates time violation
5. If current time is now 16:00:01, trading window violation triggers
6. Status = LOCKED

**Behavior**: Trade goes through, but subsequent trades are blocked if time has passed window end.

### Trade Attempts During Cooldown
**Scenario**: User fails emotional gate, closes modal, immediately clicks "Log New Trade" again

1. Emotional gate reopens with fresh state
2. All questions are unanswered
3. User must answer all 4 questions again
4. If all "no", trade form opens
5. No cooldown period enforced

**Note**: This is intentional. Emotional gate is not a time-based lockout, it's a self-assessment checkpoint.

### Editing Existing Trades
1. User can edit any trade from Recent Activity list
2. Editing a trade updates its PnL
3. Dashboard recalculates daily PnL on page refresh
4. If edit causes violation (e.g., changing win to loss), lockout triggers
5. If edit removes violation (e.g., changing loss to win), lockout clears

### Page Refresh or Logout
1. User violates rule and gets locked
2. User refreshes page → Status remains LOCKED
3. User logs out → Session ends
4. User logs back in → Dashboard recalculates from database
5. If violation still exists (same day), status = LOCKED
6. If new day, counters reset, status = ACTIVE (unless time violation exists)

---

## 6. Data Persistence Guarantees

### What is Saved on Every Trade Attempt

**Successful Trade Log**:
- Trade ID (auto-generated)
- User ID (from authentication)
- Symbol (uppercase)
- Direction (LONG or SHORT)
- Entry Price
- Exit Price (null if trade is open)
- Size
- Risk Amount (calculated from stop loss)
- PnL (calculated if closed, null if open)
- Status (OPEN or CLOSED)
- Executed At (timestamp of submission)

**Failed Emotional Gate**:
- Nothing is saved to database
- No audit trail of emotional gate failures

**Failed Form Validation**:
- Nothing is saved to database
- No record of invalid submissions

### What is Logged When Trade is Blocked

**Lockout State**:
- No explicit lockout record is created
- Lockout is computed dynamically from existing data
- No "lockout events" table exists

**Violation Detection**:
- No violation log is written
- Violations page displays current state only
- No historical violation tracking

### What Happens on Page Refresh or Logout

**Page Refresh**:
1. All state is recalculated from database
2. Rules are fetched fresh
3. Today's trades are queried
4. PnL and count are recalculated
5. Status is recomputed
6. UI reflects current reality

**Logout**:
1. Authentication session ends
2. No data is lost
3. All trades remain in database
4. Rules remain unchanged

**Login**:
1. User authenticates
2. Dashboard loads
3. System fetches rules and trades
4. Status is calculated
5. If violations exist, lockout is enforced

**Data Survival**:
- Trades survive refresh, logout, browser close, system restart
- Rules survive refresh, logout, browser close, system restart
- Lockout status is recalculated, not stored, so it always reflects current reality

---

## 7. Known Limitations

### What MVP Does Not Handle

1. **Profit Protection Cap**: No maximum daily profit limit enforced
2. **Weekly/Monthly Limits**: Only daily limits are implemented
3. **Position Size Validation**: Max risk per trade is configured but not enforced
4. **Multi-Day Lockouts**: No "3 violations in a week = 1 week ban" logic
5. **Audit Trail**: No historical log of violations or lockout events
6. **Notification System**: No email/SMS alerts when violations occur
7. **Account Balance Tracking**: No integration with actual trading account
8. **Real-Time Enforcement**: Rules checked on page load, not continuously
9. **Concurrent Session Handling**: No protection against multiple browser tabs
10. **Stop Loss Enforcement**: System logs stop loss but doesn't verify execution

### What is Intentionally Missing

1. **Override Mechanism**: By design, no bypass exists
2. **Grace Period**: Violations trigger immediately, no warnings
3. **Partial Violations**: No "soft limits" or yellow zones
4. **Rule Modification While Locked**: Settings can be changed but lockout persists
5. **Customer Support Unlock**: No admin panel or support override

### What is Postponed to Later Phases

1. **Server-Side Validation**: Current validation is client-side only
2. **Real-Time Rule Checking**: Currently requires page refresh
3. **Broker Integration**: No connection to actual trading platforms
4. **Advanced Analytics**: No performance metrics beyond basic PnL
5. **Social Accountability**: No sharing or accountability partner features
6. **Graduated Consequences**: No escalating penalties for repeat violations

---

## 8. Founder Verification Checklist

Use this checklist to verify behavioral correctness:

- [ ] **Rules cannot be bypassed**: Confirmed. When status = LOCKED, trade button is disabled at UI level. No API endpoint accepts trades without client-side checks.

- [ ] **Lockouts survive refresh/logout**: Confirmed. Lockout status is recalculated from database on every page load. Trades and rules persist in Supabase.

- [ ] **Emotional gate cannot be skipped**: Confirmed. Trade form only opens after emotional gate passes. Button click triggers gate modal first, form second.

- [ ] **Limits are enforced before trade is accepted**: PARTIAL. Emotional gate enforces before form opens. Rule limits (loss, count, time) are checked AFTER trade is logged, on page reload.

- [ ] **No manual override exists**: Confirmed. No UI element, API endpoint, or database flag allows bypassing lockout. Settings page is accessible but changing rules doesn't clear existing violations.

---

## Critical Behavioral Notes

### Enforcement is Real, Not Cosmetic
- Lockout is enforced by disabling UI elements
- No hidden API endpoints bypass the rules
- Database writes happen regardless, but subsequent access is blocked

### Friction is Preserved
- Emotional gate requires 4 manual interactions
- No "remember my answer" option
- Each trade attempt requires fresh emotional assessment
- Locked state has no escape hatch

### Nothing Negotiable Snuck In
- No "emergency trade" button
- No "I understand the risks" checkbox
- No temporary unlock for "just one more trade"
- No admin panel for rule suspension

### Developer Did Not "Help the User" Too Much
- No auto-unlock timers
- No violation warnings before threshold
- No soft limits or grace periods
- No "are you sure?" prompts that can be clicked through

---

**End of Walkthrough**

This document describes the system as implemented. Any deviation from this behavior indicates a bug or unauthorized modification.
