# SoCap — Social Capital App Summary

> **Purpose:** This document provides a comprehensive summary of the SoCap mobile application, including its architecture, every screen, UI elements, navigation flows, data models, and design system. It is intended to give any AI agent (or developer) full context needed to work on the front-end design.

---

## 1. What Is SoCap?

SoCap (Social Capital) is a **personal relationship management (PRM)** mobile app. It helps users maintain and strengthen their personal and professional relationships by:

- Organizing contacts into relationship tiers (Inner Circle, Close Friends, Friends, Acquaintances, Professional)
- Tracking interaction history and computing a "relationship health score"
- Planning and managing events with attendees, budgets, venues, and RSVP tracking
- Providing AI-powered suggestions (message ideas, conversation starters, event ideas, relationship tips)
- Sending reminders to reach out to contacts, birthdays, anniversaries, and events
- Syncing with Google Calendar and device contacts
- Offering analytics and insights on communication trends and relationship health

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native (Expo ~54.0.32) |
| **Language** | TypeScript |
| **Navigation** | React Navigation 7 (Stack + Bottom Tabs) |
| **UI Library** | React Native Paper (Material Design 3) |
| **State/Data** | TanStack React Query v5 |
| **API Client** | Axios |
| **Auth** | Firebase Auth (email/password, Google, Apple) |
| **Charts** | react-native-chart-kit |
| **Backend** | Express.js + Prisma ORM + PostgreSQL |
| **AI** | OpenAI (via backend API) |
| **Calendar** | Google Calendar API + expo-calendar |
| **Notifications** | expo-notifications + Firebase |

---

## 3. Design System

### Theme (Light — currently the only active theme)

| Token | Value | Usage |
|---|---|---|
| `primary` | `#007AFF` (iOS blue) | Primary buttons, links, active tab icons |
| `secondary` | `#5856D6` (purple) | AI features, accent elements, FABs |
| `error` | `#FF3B30` (red) | Errors, destructive actions, delete buttons |
| `background` | `#FFFFFF` | Screen backgrounds |
| `surface` | `#F2F2F7` (light gray) | Card backgrounds, list backgrounds |
| `text` | `#000000` | Primary text |
| `onPrimary` | `#FFFFFF` | Text on primary-colored surfaces |

### Dark Theme (defined but not wired up)

| Token | Value |
|---|---|
| `primary` | `#0A84FF` |
| `secondary` | `#5E5CE6` |
| `error` | `#FF453A` |
| `background` | `#000000` |
| `surface` | `#1C1C1E` |

### Typography & Icons

- Uses React Native Paper's MD3 typography scale
- Tab bar icons are currently **emoji characters** (🏠 Home, 👥 Contacts, 📅 Events, 👤 Profile) — not icon library components
- Other screen icons use inline emoji or text characters (no unified icon library)

### UI Patterns

- **Cards** (`react-native-paper` Card) for content sections
- **Chips** for filters, tags, tiers, and status badges
- **SegmentedButtons** for mode/category selectors
- **FAB** (Floating Action Button) for primary creation actions
- **Dialogs/Modals** for confirmations, pickers, and overlays
- **Pull-to-refresh** on all list screens
- **Infinite scroll** on paginated lists (contacts)

---

## 4. App Architecture & Providers

```
QueryClientProvider (React Query)
  └── PaperProvider (theme: lightTheme)
       └── AuthProvider (React Context — manages auth state)
            └── RootNavigator (switches Auth ↔ Main based on isAuthenticated)
```

---

## 5. Complete Navigation Map

### 5.1 Root Navigator (Stack)

```
RootNavigator
├── Auth (AuthNavigator)  ← shown when NOT authenticated
└── Main (MainNavigator)  ← shown when authenticated
```

### 5.2 Auth Navigator (Stack)

```
AuthNavigator
├── Login (initial)
├── Register
└── ForgotPassword
```

### 5.3 Main Navigator (Bottom Tabs — 4 tabs)

```
MainNavigator (Bottom Tabs)
├── 🏠 Home Tab → HomeScreen
├── 👥 Contacts Tab → ContactNavigator (Stack)
│   ├── ContactList (initial)
│   ├── ContactDetail
│   ├── AddEditContact
│   ├── ImportContacts
│   ├── ContactMessages
│   └── ContactEvents
├── 📅 Events Tab → EventNavigator (Stack)
│   ├── EventList (initial)
│   ├── EventDetail
│   ├── AddEditEvent
│   └── CreateEvent
└── 👤 Profile Tab → ProfileNavigator (Stack)
    ├── Profile (initial)
    ├── NotificationPreferences
    ├── CalendarSettings
    ├── SecuritySettings
    ├── Insights
    └── WritingStyle
```

### 5.4 Cross-Tab Navigation

The Home screen navigates into other tab stacks:

| From Home | To |
|---|---|
| Health Score Card tap | Profile > Insights |
| "See All" Reminders | Reminders (not currently in navigation — uses a standalone screen) |
| Reminder (contact) tap | Contacts > ContactDetail |
| Reminder (event) tap | Events > EventDetail |
| "Log Interaction" quick action | Contacts > ContactList (mode: log-interaction) |
| "Plan Event" quick action | Events > CreateEvent |
| "Add Contact" quick action | Contacts > AddEditContact |
| "AI Suggest" quick action | Contacts > ContactList (mode: ai-suggest) |
| Contact avatar tap | Contacts > ContactDetail |
| "See All" Events | Events tab |
| Event card tap | Events > EventDetail |

---

## 6. Screen-by-Screen Reference

### 6.1 Auth Screens

#### LoginScreen
- **Path:** `screens/auth/LoginScreen.tsx`
- **Layout:** Centered form in a KeyboardAvoidingView + ScrollView
- **Elements:**
  - "Welcome Back" title + "Sign in to continue" subtitle
  - Error card (conditionally shown)
  - Email text input (outlined, validated)
  - Password text input (secure entry)
  - "Forgot Password?" text button → **ForgotPassword**
  - "Sign In" primary button (loading state)
  - "OR" divider
  - "Continue with Google" outlined button
  - "Continue with Apple" button (iOS only)
  - "Don't have an account? Sign Up" → **Register**
- **Security:** JailbreakWarning overlay, ScreenshotPrevention wrapper

#### RegisterScreen
- **Path:** `screens/auth/RegisterScreen.tsx`
- **Layout:** Same as Login
- **Elements:**
  - "Create Account" title + "Sign up to get started" subtitle
  - Error card (conditionally shown)
  - First Name + Last Name inputs (side-by-side row)
  - Email input
  - Password input (with complexity requirements)
  - Confirm Password input
  - Terms & Conditions checkbox
  - "Sign Up" primary button (disabled until terms accepted)
  - "OR" divider + Google/Apple social buttons
  - "Already have an account? Sign In" → **Login**

#### ForgotPasswordScreen
- **Path:** `screens/auth/ForgotPasswordScreen.tsx`
- **Layout:** Simple centered form
- **Elements:**
  - "Forgot Password?" title + explanation text
  - Email input with validation
  - "Send Reset Link" button
  - "Back to Login" text button → goes back
  - Success state: green card confirming email sent

---

### 6.2 Home Tab

#### HomeScreen (Dashboard)
- **Path:** `screens/home/HomeScreen.tsx`
- **Layout:** ScrollView with pull-to-refresh, sections stacked vertically
- **Sections (top to bottom):**
  1. **Greeting** — time-aware ("Good morning/afternoon/evening, {name}!") + date
  2. **HealthScoreCard** — relationship health score + trend → taps to **Insights**
  3. **Today's Reminders** — up to 3 reminder mini-cards + "See All" link
  4. **Quick Actions** — 4 icon buttons in a horizontal row:
     - "Log Interaction" → Contacts > ContactList (log-interaction mode)
     - "Plan Event" → Events > CreateEvent
     - "Add Contact" → Contacts > AddEditContact
     - "AI Suggest" → Contacts > ContactList (ai-suggest mode)
  5. **Contacts Needing Attention** — horizontal scrollable avatar list → taps to ContactDetail
  6. **TrendingInterestsCard** — trending topics from user's network
  7. **Upcoming Events** — up to 3 event cards + "See All" → Events tab
  8. **RelationshipTipCard** — AI-generated daily tip

---

### 6.3 Contacts Tab

#### ContactListScreen
- **Path:** `screens/contacts/ContactListScreen.tsx`
- **Layout:** Full-screen list with search, filters, FAB
- **Elements:**
  - Search bar (filters by name)
  - Horizontal chip row for tier filtering (All, Inner Circle, Close Friends, Friends, Acquaintances, Professional)
  - Mode banner (shown when opened in log-interaction or ai-suggest mode from Home)
  - FlatList of ContactCard items (paginated, 20/page, infinite scroll)
  - FAB "+" button → **AddEditContact** (create mode)
- **Navigation:**
  - Tap contact (default) → **ContactDetail**
  - Tap contact (log-interaction mode) → **ContactDetail** (auto-opens log dialog)
  - Tap contact (ai-suggest mode) → **ContactMessages**
  - FAB → **AddEditContact**

#### ContactDetailScreen
- **Path:** `screens/contacts/ContactDetailScreen.tsx`
- **Layout:** ScrollView with profile card at top, then section cards
- **Elements:**
  - **Profile Card:** avatar (image or initials), name, TierBadge
  - **Quick Actions row (4 buttons):**
    - Call → opens phone dialer
    - Message → **ContactMessages**
    - Email → opens email client
    - Event → **ContactEvents**
  - **"Get AI Ideas" button** → opens AI modal (message suggestions + conversation starters)
  - **Contact Info Card:** phone, email, birthday, anniversary
  - **Relationship Card:** tier, label, health score, shared interests (chips)
  - **InterestUpdatesCard:** conversation topics based on shared interests
  - **Recent Interactions Card:** list of interactions + "Log" button (opens Log Interaction dialog)
  - **Notes Card:** free-text notes
  - **"Edit Contact" button** → **AddEditContact** (edit mode)
  - **"Delete Contact" button** → confirmation dialog → delete + go back
- **Modals/Dialogs:**
  - Log Interaction Dialog: 9 quick templates, type selector, notes input
  - AI Modal: Messages tab + Conversation Starters tab, context selector

#### AddEditContactScreen
- **Path:** `screens/contacts/AddEditContactScreen.tsx`
- **Layout:** ScrollView form
- **Elements:**
  - Name input (required), Phone input, Email input, Notes input (multiline)
  - Important Dates: Birthday picker, Anniversary picker (shown for ROMANTIC type), custom event list + "Add" button
  - Relationship Type: SegmentedButtons (Family, Friend, Colleague, Romantic, Other)
  - Closeness Level: SegmentedButtons (labels change dynamically by relationship type)
  - Shared Interests: text input + "Add" button + removable chips
  - "Create Contact" / "Update Contact" save button
  - "Cancel" button → goes back
- **Modes:** Create (empty form) or Edit (pre-populated from existing contact)

#### ImportContactsScreen
- **Path:** `screens/contacts/ImportContactsScreen.tsx`
- **Layout:** Full-screen checklist with sticky footer
- **Elements:**
  - Info card explaining import behavior
  - Progress card (during import)
  - "Select All / Deselect All" toggle
  - FlatList of phone contacts with checkboxes
  - Footer: selected count + "Import Selected" button
- **Flow:** Reads device contacts → user selects → bulk import to API

#### ContactMessagesScreen
- **Path:** `screens/contacts/ContactMessagesScreen.tsx`
- **Layout:** KeyboardAvoidingView + ScrollView
- **Elements:**
  - Context selector (horizontal cards): Check In, Birthday, Congrats, Thank You, Reconnect, Sympathy, Holiday, Event Invite
  - AI message suggestions (MessageSuggestionCard)
  - Compose text area
  - Send options (4 circular buttons): SMS, WhatsApp, Telegram, Copy
- **Flow:** AI generates suggestions → user selects/edits → sends via external app

#### ContactEventsScreen
- **Path:** `screens/contacts/ContactEventsScreen.tsx`
- **Layout:** FlatList with header + FAB
- **Elements:**
  - Header: "Events with {name}" + event count
  - Event cards with title, status chip, RSVP chip, date/time, location
  - Empty state with "Create Event" button
  - FAB "+" → **CreateEvent** (pre-selects contact as attendee)
- **Navigation:** Tap event → **EventDetail**

---

### 6.4 Events Tab

#### EventsScreen (Event List)
- **Path:** `screens/events/EventsScreen.tsx`
- **Layout:** FlatList with pull-to-refresh
- **Elements:**
  - Header with "+" button → **AddEditEvent**
  - Event cards: date block, title, type, time, location, status badge (tappable for status change)
  - Empty state with "Create Event" button
  - Status Change Modal: 5 options (Draft, Planning, Confirmed, Completed, Cancelled)
- **Navigation:** Tap event card → **EventDetail**

#### EventDetailScreen
- **Path:** `screens/events/EventDetailScreen.tsx`
- **Layout:** ScrollView with stacked cards
- **Elements:**
  - **Header Card:** status badge (tappable), title, date box, time range, event type, three-dot menu (Edit, Share, Cancel), description
  - **Location Card:** Google Maps static image, location name, address, "open in maps" link
  - **Budget Card:** BudgetProgressBar (estimated vs actual), budget tier, linked savings goal
  - **Attendees Card:** RSVP summary grid (Confirmed/Pending/Maybe/Declined counts), "Send RSVP Reminders" button, attendee list with avatars, RSVP badges, plus-ones, dietary restrictions, remove buttons
  - Cancel confirmation dialog
  - Status Change Modal
- **Navigation:**
  - Menu > Edit → **CreateEvent** (edit mode)
  - Add attendees → **SelectAttendees**
  - Savings goal link → **SavingsGoal**

#### AddEditEventScreen
- **Path:** `screens/events/AddEditEventScreen.tsx`
- **Layout:** KeyboardAvoidingView + ScrollView form with fixed footer
- **Elements:**
  - **"Need Ideas?" AI button** → opens AI Ideas modal
  - Event Title input (required)
  - Event Type chips (Social, Networking, Dining, Activity, Celebration, Travel, Other)
  - Date picker button
  - Start Time / End Time picker buttons (side by side) + duration badge
  - **"Invite People" section:** "Add" button, attendee chips with avatar + send-invite + remove icons, "Send invitations when created" checkbox
  - Location input
  - Description textarea
  - Budget Range chips (Free, Budget, Moderate, Premium)
  - Group Size input
  - **"Create Event" / "Update Event" fixed footer button**
- **Modals:**
  - Attendee Selection Modal: search bar, contact list with checkboxes
  - AI Ideas Modal: budget selector + AI-generated EventIdeaCards

---

### 6.5 Profile Tab

#### ProfileScreen
- **Path:** `screens/profile/ProfileScreen.tsx`
- **Layout:** ScrollView with header + sections
- **Elements:**
  - **Header:** circular avatar (initial), full name, email
  - **Account Info:** email, timezone, verified status
  - **Statistics row:** Total Contacts, Total Events, Total Relationships
  - **AutoSyncSettings** embedded component
  - **Action buttons:**
    - "Notification Settings" → **NotificationPreferences**
    - "Calendar Settings" → **CalendarSettings**
    - "Security Settings" → **SecuritySettings**
    - "Insights & Analytics" → **Insights**
    - "My Writing Style" (purple/AI accent) → **WritingStyle**
    - "Refresh Profile" button
    - "Logout" button (red)

#### InsightsScreen
- **Path:** `screens/insights/InsightsScreen.tsx`
- **Layout:** ScrollView with pull-to-refresh, stacked chart cards
- **Elements:**
  - Health Score card: score badge (X/100) + 30-day line chart
  - Communication Trends card: line chart + stat items (Calls, Texts, In Person)
  - Tier Distribution card: pie chart with color-coded legend
  - Monthly Comparison card: last month vs this month + trend indicator
  - Top Contacts card: ranked list with avatar, name, tier, interaction count
  - Neglected Tiers Warning card: orange warning with tier chips
- **No outbound navigation** — read-only analytics view

#### NotificationPreferencesScreen
- **Path:** `screens/settings/NotificationPreferencesScreen.tsx`
- **Layout:** ScrollView with toggle cards
- **Elements:**
  - "Enable Notifications" master toggle
  - 6 notification type toggles: Reach Out, Birthdays, Anniversaries, Events, Savings Goals, Weekly Summary
  - Quiet Hours toggle + start/end time pickers
  - "Save Preferences" button
  - "Send Test Notification" button

#### CalendarSettingsScreen
- **Path:** `screens/settings/CalendarSettingsScreen.tsx`
- **Layout:** ScrollView with sections
- **Elements:**
  - Google Calendar connection card (connect/disconnect)
  - Auto-sync toggle (when connected)
  - Google Calendars list with selection
  - Device Calendar section (permission request or list)
  - Info box explaining sync behavior

#### SecuritySettingsScreen
- **Path:** `screens/settings/SecuritySettingsScreen.tsx`
- **Layout:** ScrollView with cards
- **Elements:**
  - Biometric Auth card: toggle + test button (Face ID / Touch ID / Fingerprint)
  - Session Management card: auto-logout info (30 min), logout-on-close toggle
  - Device Security card: device info, jailbreak/root warning
  - Security Features card: read-only checklist (secure storage, token refresh, session timeout, encryption)

#### WritingStyleScreen
- **Path:** `screens/settings/WritingStyleScreen.tsx`
- **Layout:** KeyboardAvoidingView + ScrollView
- **Elements:**
  - Purple intro card ("Teach the AI Your Style")
  - 3-tab selector: Close Friends/Family, Casual Friends, Professional
  - Style description card
  - Sample message text input + "Add Sample" button
  - Existing samples list (or empty state)
  - Yellow tips card (4 tips for better AI results)
- **Storage:** AsyncStorage (local only, no backend API)

---

### 6.6 Reminders (Standalone — accessed from Home)

#### RemindersScreen
- **Path:** `screens/reminders/RemindersScreen.tsx`
- **Layout:** Filter bar + FlatList with pull-to-refresh
- **Elements:**
  - Type filter dropdown (All, Reach Out, Birthday, Event, Savings, Custom)
  - Status filter chips (Pending, Sent, Completed)
  - Reminder cards: type icon (color-coded), title, relative time, message, three-dot menu (Mark Done, Snooze, View Details, Dismiss), status chip, context chips (contact/event)
  - Empty state
  - Snooze dialog (15 min, 1 hr, 3 hrs, Tomorrow, 1 week)
- **Navigation:**
  - View Details (contact) → **ContactDetail**
  - View Details (event) → **EventDetail**
  - Contact chip tap → **ContactDetail**
  - Event chip tap → **EventDetail**

---

## 7. Complete User Flow Diagrams

### 7.1 Authentication Flow

```
App Launch
  │
  ├── Authenticated? ──YES──→ Main (Home Tab)
  │
  └── NO → Login Screen
              ├── Enter email/password → Sign In → Main (Home Tab)
              ├── Continue with Google → Google OAuth → Main (Home Tab)
              ├── Continue with Apple → Apple Sign-In → Main (Home Tab)
              ├── "Forgot Password?" → Forgot Password Screen
              │                          └── Enter email → Send Reset Link → Back to Login
              └── "Sign Up" → Register Screen
                               ├── Fill form + accept terms → Sign Up → Main (Home Tab)
                               ├── Sign up with Google → Main (Home Tab)
                               └── "Sign In" → Back to Login
```

### 7.2 Contact Management Flow

```
Contacts Tab (ContactList)
  │
  ├── Search / Filter by tier
  ├── FAB "+" → Add Contact Screen
  │               └── Fill form → Save → Back to Contact List
  │
  └── Tap contact → Contact Detail Screen
                      ├── Quick Actions:
                      │    ├── Call → Phone dialer (external)
                      │    ├── Message → Contact Messages Screen
                      │    │               ├── Select context → AI generates suggestions
                      │    │               └── Compose → Send via SMS/WhatsApp/Telegram/Copy
                      │    ├── Email → Email client (external)
                      │    └── Event → Contact Events Screen
                      │                  ├── Tap event → Event Detail
                      │                  └── FAB "+" → Create Event (contact pre-selected)
                      │
                      ├── "Get AI Ideas" → AI Modal
                      │    ├── Messages Tab → AI message suggestions
                      │    └── Conversation Starters Tab → AI starters
                      │
                      ├── "Log" interaction → Log Interaction Dialog
                      │    └── Select template/type + notes → Save
                      │
                      ├── "Edit Contact" → Add/Edit Contact Screen (edit mode)
                      │    └── Modify fields → Save → Back to Contact Detail
                      │
                      └── "Delete Contact" → Confirmation → Delete → Back to Contact List
```

### 7.3 Event Management Flow

```
Events Tab (Event List)
  │
  ├── "+" button → Add/Edit Event Screen
  │                  ├── "Need Ideas?" → AI Ideas Modal
  │                  │    └── Select budget → AI generates event ideas
  │                  ├── Fill form (title, type, date, time, location, budget)
  │                  ├── "Invite People" → Attendee Modal → Select contacts
  │                  └── "Create Event" → Save → Back to Event List
  │
  ├── Tap status badge → Status Change Modal → Update status
  │
  └── Tap event → Event Detail Screen
                    ├── Tap status badge → Status Change Modal
                    ├── Menu > Edit → Add/Edit Event Screen (edit mode)
                    ├── Menu > Share → Native share sheet
                    ├── Menu > Cancel → Cancel dialog → Cancel event
                    ├── "Add" attendees → Select Attendees Screen
                    ├── "Send RSVP Reminders" → Sends to pending attendees
                    ├── Remove attendee (X button)
                    ├── Tap location → Google Maps (external)
                    └── Tap savings goal → Savings Goal Screen
```

### 7.4 Home Dashboard Flow

```
Home Tab (Dashboard)
  │
  ├── Pull to refresh → Reload all data
  │
  ├── Health Score Card → Profile > Insights
  │
  ├── Reminders:
  │    ├── "See All" → Reminders Screen
  │    ├── Tap reminder (contact) → Contacts > Contact Detail
  │    └── Tap reminder (event) → Events > Event Detail
  │
  ├── Quick Actions:
  │    ├── "Log Interaction" → Contacts > Contact List (log-interaction mode)
  │    ├── "Plan Event" → Events > Create Event
  │    ├── "Add Contact" → Contacts > Add Contact
  │    └── "AI Suggest" → Contacts > Contact List (ai-suggest mode)
  │
  ├── Contacts Needing Attention:
  │    └── Tap avatar → Contacts > Contact Detail
  │
  ├── Upcoming Events:
  │    ├── "See All" → Events Tab
  │    └── Tap event → Events > Event Detail
  │
  └── Relationship Tip Card (read-only)
```

### 7.5 Profile & Settings Flow

```
Profile Tab
  │
  ├── View account info + stats
  │
  ├── "Notification Settings" → Notification Preferences Screen
  │    └── Toggle types, quiet hours → Save
  │
  ├── "Calendar Settings" → Calendar Settings Screen
  │    ├── Connect/disconnect Google Calendar
  │    ├── Select calendars
  │    └── Manage device calendar permissions
  │
  ├── "Security Settings" → Security Settings Screen
  │    ├── Toggle biometric auth + test
  │    ├── Session management
  │    └── View device security status
  │
  ├── "Insights & Analytics" → Insights Screen
  │    ├── Health score chart (30 days)
  │    ├── Communication trends chart
  │    ├── Tier distribution pie chart
  │    ├── Monthly comparison
  │    ├── Top contacts list
  │    └── Neglected tiers warning
  │
  ├── "My Writing Style" → Writing Style Screen
  │    ├── Select category (Close/Casual/Professional)
  │    ├── Add sample messages
  │    └── Delete existing samples
  │
  ├── "Refresh Profile" → Reload profile data
  │
  └── "Logout" → Signs out → Auth (Login Screen)
```

---

## 8. Data Entities Summary

| Entity | Key Fields | Purpose |
|---|---|---|
| **User** | id, email, firstName, lastName, timezone, notificationPreferences | App user account |
| **Contact** | id, name, phone, email, birthday, anniversary, notes, importSource | A person the user tracks |
| **Relationship** | id, tier, relationshipType, healthScore, sharedInterests, communicationFrequency | Link between User and Contact |
| **Interaction** | id, type (Call/Text/Video/InPerson/Event), date, duration, notes, sentiment | Logged contact touchpoint |
| **Event** | id, title, eventType, date, startTime, endTime, location*, budget*, status, isRecurring | Planned social event |
| **EventAttendee** | id, eventId, contactId, rsvpStatus, plusOnes, dietaryRestrictions | Event participant |
| **Reminder** | id, type (ReachOut/Birthday/Anniversary/Event/Savings/Custom), scheduledDate, status | Scheduled notification |
| **SavingsGoal** | id, name, targetAmount, currentAmount, deadline, autoSave* | Financial goal linked to event |
| **AIInsight** | id, type (MessageSuggestion/EventIdea/RelationshipTip/ConversationStarter), content | AI-generated content |
| **CalendarCredential** | id, provider, accessToken*, refreshToken*, primaryCalendarId | Google Calendar connection |

---

## 9. Key Design Observations & Improvement Opportunities

### Current State
1. **Tab icons use emoji characters** rather than a proper icon library — inconsistent sizing/rendering across platforms
2. **No dark mode activation** — dark theme is defined in `paperTheme.ts` but the app hardcodes `lightTheme`
3. **Inconsistent color usage** — some screens use hardcoded colors (e.g., `#007AFF`, `#5856D6`, `#FF3B30`) instead of theme tokens
4. **No unified icon system** — screens use a mix of emoji, text characters, and inline icons
5. **Limited visual hierarchy** — many screens are dense card stacks without clear visual breathing room
6. **No onboarding flow** — new users land directly on the dashboard with no guided setup
7. **No empty state illustrations** — empty states use text and basic icons only
8. **Limited animation/transitions** — standard React Navigation transitions with no custom motion
9. **Calendar view missing from navigation** — `CalendarView.tsx` exists but isn't wired into the Events navigator
10. **Reminders screen not in tab navigation** — accessed only via Home "See All" link; no dedicated tab or consistent entry point

### Relationship Tier Color Coding (used across the app)
| Tier | Typical Color |
|---|---|
| Inner Circle | Deep purple / gold |
| Close Friends | Blue |
| Friends | Green |
| Acquaintances | Orange |
| Professional | Gray |

### Status Color Coding
| Status | Color |
|---|---|
| Confirmed / Active | Green |
| Planning / Pending | Orange |
| Cancelled / Declined | Red |
| Completed / Dismissed | Gray |
| Draft | Light blue |

---

## 10. File Structure Quick Reference

```
apps/mobile/
├── App.tsx                              # Root: QueryClient + PaperProvider + AuthProvider + RootNavigator
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx            # Auth ↔ Main switching
│   │   ├── AuthNavigator.tsx            # Login, Register, ForgotPassword
│   │   └── MainNavigator.tsx            # Bottom tabs + nested stacks
│   ├── screens/
│   │   ├── auth/                        # LoginScreen, RegisterScreen, ForgotPasswordScreen
│   │   ├── home/                        # HomeScreen (dashboard)
│   │   ├── contacts/                    # ContactList, ContactDetail, AddEditContact, ImportContacts, ContactMessages, ContactEvents
│   │   ├── events/                      # EventsScreen, EventDetailScreen, AddEditEventScreen, CreateEventScreen, CalendarView, SelectAttendeesScreen, VenueSearchScreen
│   │   ├── profile/                     # ProfileScreen
│   │   ├── insights/                    # InsightsScreen
│   │   ├── reminders/                   # RemindersScreen
│   │   └── settings/                    # CalendarSettings, NotificationPreferences, SecuritySettings, WritingStyle
│   ├── components/
│   │   ├── ai/                          # AI-related components
│   │   ├── calendar/                    # Calendar components
│   │   ├── common/                      # Shared/common components
│   │   ├── contacts/                    # Contact-related components
│   │   ├── dashboard/                   # Dashboard widgets
│   │   ├── events/                      # Event-related components
│   │   ├── interests/                   # Interest-related components
│   │   ├── security/                    # Security components
│   │   └── settings/                    # Settings components
│   ├── hooks/                           # useAuth, useContacts, useEvents, useDashboard, useAISuggestions, etc.
│   ├── services/                        # authService, contactService, eventService, aiService, calendarService, etc.
│   ├── context/                         # AuthContext
│   ├── config/                          # api.ts, firebase.ts
│   ├── theme/                           # paperTheme.ts (light + dark themes)
│   ├── types/                           # navigation.ts (route param types)
│   └── utils/                           # security.ts, screenshotPrevention.tsx
```
