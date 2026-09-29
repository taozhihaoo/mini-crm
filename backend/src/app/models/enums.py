import enum


class UserRole(enum.StrEnum):
    admin = "admin"
    member = "member"


class LeadStage(enum.StrEnum):
    new = "new"
    qualified = "qualified"
    proposal = "proposal"
    negotiation = "negotiation"
    won = "won"
    lost = "lost"


class LeadPriority(enum.StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class LeadSource(enum.StrEnum):
    website = "website"
    referral = "referral"
    email = "email"
    cold_outreach = "cold_outreach"
    other = "other"


class ActivityType(enum.StrEnum):
    note = "note"
    call = "call"
    email = "email"
    meeting = "meeting"


class TaskStatus(enum.StrEnum):
    open = "open"
    completed = "completed"
    cancelled = "cancelled"
