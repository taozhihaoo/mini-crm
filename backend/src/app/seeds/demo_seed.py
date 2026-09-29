"""Demo dataset seeder.

Creates a fully fictional but realistic dataset so a reviewer can start the app
and immediately see a working CRM. Idempotent: skipped when users already exist.

Run manually:  python -m app.seeds.demo_seed
Docker Compose runs it automatically on first start (SEED_DEMO_DATA=true).

Demo credentials (DEMO ONLY - never use these passwords anywhere real):
    admin@clientflow.dev  / Admin123!   (admin)
    sarah@clientflow.dev  / Member123!  (member)
    mike@clientflow.dev   / Member123!  (member)
"""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Activity,
    ActivityType,
    Company,
    Contact,
    Lead,
    LeadPriority,
    LeadSource,
    LeadStage,
    Task,
    TaskStatus,
    User,
    UserRole,
)

logger = logging.getLogger("clientflow.seed")

DEMO_USERS = [
    ("admin@clientflow.dev", "Admin123!", "Alex Admin", UserRole.admin),
    ("sarah@clientflow.dev", "Member123!", "Sarah Sales", UserRole.member),
    ("mike@clientflow.dev", "Member123!", "Mike Members", UserRole.member),
]

DEMO_COMPANIES = [
    ("Northwind Design Studio", "https://northwind-design.example.com", "Design", "Chicago, IL"),
    ("Bluepeak Software", "https://bluepeak.example.io", "Software", "Denver, CO"),
    ("Cedar & Co Consulting", "https://cedarco.example.com", "Consulting", "Portland, OR"),
    ("Solaris Marketing", "https://solaris.example.com", "Marketing", "Austin, TX"),
    ("Harbor Legal Group", "https://harborlegal.example.com", "Legal", "Boston, MA"),
    ("Pinewood Analytics", "https://pinewood.example.io", "Analytics", "Seattle, WA"),
    ("Redbrick Realty", "https://redbrick.example.com", "Real Estate", "Philadelphia, PA"),
    ("Summit Fitness Group", "https://summitfit.example.com", "Fitness", "Boulder, CO"),
    ("Lakeside Catering", "https://lakeside.example.com", "Hospitality", "Madison, WI"),
    ("Quantum Print Solutions", "https://quantumprint.example.com", "Printing", "Columbus, OH"),
]

DEMO_CONTACTS = [
    # (company_index, first, last, email, job_title)
    (0, "Emma", "Larsen", "emma.larsen@northwind.example.com", "Creative Director"),
    (0, "Noah", "Petrov", "noah.petrov@northwind.example.com", "Studio Manager"),
    (1, "Olivia", "Chen", "olivia.chen@bluepeak.example.io", "VP Engineering"),
    (1, "Liam", "Rodriguez", "liam.rodriguez@bluepeak.example.io", "CTO"),
    (2, "Ava", "Thompson", "ava.thompson@cedarco.example.com", "Managing Partner"),
    (2, "Ethan", "Walker", "ethan.walker@cedarco.example.com", "Operations Lead"),
    (3, "Sophia", "Garcia", "sophia.garcia@solaris.example.com", "Marketing Director"),
    (3, "Mason", "Kim", "mason.kim@solaris.example.com", "Account Manager"),
    (4, "Isabella", "Novak", "isabella.novak@harborlegal.example.com", "Partner"),
    (4, "James", "O'Connor", "james.oconnor@harborlegal.example.com", "Paralegal Lead"),
    (5, "Mia", "Hansen", "mia.hansen@pinewood.example.io", "Head of Data"),
    (5, "Lucas", "Silva", "lucas.silva@pinewood.example.io", "Analytics Engineer"),
    (6, "Charlotte", "Brown", "charlotte.brown@redbrick.example.com", "Broker"),
    (6, "Henry", "Nguyen", "henry.nguyen@redbrick.example.com", "Sales Lead"),
    (7, "Amelia", "Davis", "amelia.davis@summitfit.example.com", "COO"),
    (7, "Benjamin", "Martin", "benjamin.martin@summitfit.example.com", "Membership Director"),
    (8, "Harper", "Wilson", "harper.wilson@lakeside.example.com", "Owner"),
    (8, "Evelyn", "Moore", "evelyn.moore@lakeside.example.com", "Events Manager"),
    (9, "Daniel", "Kowalski", "daniel.kowalski@quantumprint.example.com", "Plant Manager"),
    (9, "Grace", "Lin", "grace.lin@quantumprint.example.com", "Procurement Lead"),
]

# (company_idx, contact_idx, title, value, stage, priority, source, close_in_days, owner_idx)
DEMO_LEADS = [
    (0, 0, "Brand refresh project", 24000, LeadStage.negotiation, LeadPriority.high, LeadSource.referral, 20, 1),
    (1, 2, "QA automation platform", 60000, LeadStage.proposal, LeadPriority.high, LeadSource.website, 30, 1),
    (2, 4, "Process optimization retainer", 18000, LeadStage.qualified, LeadPriority.medium, LeadSource.referral, 45, 2),
    (3, 6, "Q4 campaign management", 32000, LeadStage.new, LeadPriority.medium, LeadSource.cold_outreach, 60, 2),
    (4, 8, "Document management rollout", 45000, LeadStage.qualified, LeadPriority.high, LeadSource.email, 40, 1),
    (5, 10, "Dashboards implementation", 27500, LeadStage.proposal, LeadPriority.medium, LeadSource.website, 35, 2),
    (6, 12, "Listings CRM integration", 15000, LeadStage.new, LeadPriority.low, LeadSource.other, 90, 0),
    (7, 14, "Membership app MVP", 52000, LeadStage.negotiation, LeadPriority.high, LeadSource.referral, 25, 1),
    (8, 16, "Booking system revamp", 12500, LeadStage.qualified, LeadPriority.low, LeadSource.website, 75, 2),
    (9, 18, "Print workflow automation", 9000, LeadStage.new, LeadPriority.low, LeadSource.cold_outreach, 80, 0),
    (1, 3, "Internal tooling phase 2", 38000, LeadStage.won, LeadPriority.high, LeadSource.referral, -5, 1),
    (5, 11, "Data pipeline audit", 21000, LeadStage.won, LeadPriority.medium, LeadSource.email, -12, 2),
    (3, 7, "Landing page A/B program", 7500, LeadStage.lost, LeadPriority.low, LeadSource.website, -8, 0),
    (6, 13, "Broker onboarding portal", 30000, LeadStage.lost, LeadPriority.medium, LeadSource.cold_outreach, -15, 2),
    (0, 1, "Design system maintenance", 16000, LeadStage.new, LeadPriority.medium, LeadSource.email, 50, 1),
]

# (lead_idx, type, subject, days_ago, content)
DEMO_ACTIVITIES = [
    (0, ActivityType.call, "Intro call with Emma", 21, "Discussed scope of the brand refresh; they want a full visual overhaul before Q4."),
    (0, ActivityType.meeting, "On-site workshop", 14, "Half-day stakeholder workshop. Strong fit, budget confirmed."),
    (0, ActivityType.email, "Sent proposal v2", 4, "Proposal v2 with phased pricing sent to the creative team."),
    (1, ActivityType.email, "Initial inquiry via website", 25, "Olivia reached out through the contact form about QA automation."),
    (1, ActivityType.call, "Discovery call", 18, "Mapped their current manual QA pain points. Very engaged team."),
    (1, ActivityType.meeting, "Technical deep dive", 9, "Walked engineering leads through the toolchain. CTO supportive."),
    (2, ActivityType.note, "Referral from Summit Fitness", 20, "Cedar & Co was referred by our Summit Fitness contact."),
    (2, ActivityType.call, "Qualification call", 12, "Budget range confirmed; decision expected within 6 weeks."),
    (3, ActivityType.email, "Cold outreach follow-up", 10, "Second touch on the Q4 campaign services overview."),
    (4, ActivityType.call, "Pricing discussion", 16, "Harbor Legal compared us with two vendors. Emphasized security."),
    (4, ActivityType.meeting, "Security review", 6, "IT reviewed our data handling. No blockers raised."),
    (5, ActivityType.email, "Proposal sent", 8, "Sent dashboards implementation proposal with three tiers."),
    (5, ActivityType.call, "Follow-up call", 3, "Mia asked for a reference customer - to share Pinewood case study."),
    (6, ActivityType.note, "Inbound from conference", 11, "Met Charlotte at the property tech conference."),
    (7, ActivityType.meeting, "Executive alignment", 13, "COO and membership director aligned on MVP scope."),
    (7, ActivityType.call, "Negotiation call", 5, "Discussed payment schedule; legal review pending."),
    (8, ActivityType.email, "Demo follow-up", 9, "Sent the booking system demo recording and pricing."),
    (9, ActivityType.call, "First contact", 7, "Plant manager open to automation but budget cycle starts January."),
    (10, ActivityType.meeting, "Kickoff scheduling", 18, "Signed contract - scheduling kickoff for phase 2 tooling."),
    (10, ActivityType.note, "Contract signed", 17, "Phase 2 internal tooling contract signed at 38,000."),
    (11, ActivityType.note, "Won: data pipeline audit", 14, "Audit engagement confirmed. Invoice sent."),
    (12, ActivityType.email, "Lost to competitor", 20, "Chose an incumbent agency for the A/B program; will revisit next year."),
    (13, ActivityType.call, "Lost - budget freeze", 16, "Redbrick froze the portal project due to headcount freeze."),
    (14, ActivityType.email, "Renewal inquiry", 6, "Design team asked about ongoing design system maintenance."),
    (1, ActivityType.call, "Contract review call", 3, "Legal is reviewing the QA platform contract this week."),
    (4, ActivityType.email, "References requested", 2, "Harbor Legal asked for two reference customers."),
    (7, ActivityType.meeting, "Final negotiation", 1, "Close to agreement on MVP price; sign-off expected next week."),
    (2, ActivityType.note, "Competitor mentioned", 4, "They are also evaluating a boutique consultancy."),
    (8, ActivityType.call, "Budget check", 2, "Lakeside confirmed budget availability for Q1."),
    (5, ActivityType.email, "Case study sent", 1, "Shared the analytics case study Mia requested."),
]

# (title, lead_idx or None, contact_idx or None, due_in_days, status, priority, assignee_idx)
DEMO_TASKS = [
    ("Send revised brand proposal", 0, None, -2, TaskStatus.open, LeadPriority.high, 1),
    ("Follow up with Harbor Legal references", 4, None, -1, TaskStatus.open, LeadPriority.high, 1),
    ("Chase Redbrick contract status", 13, None, -3, TaskStatus.cancelled, LeadPriority.medium, 2),
    ("Prepare QA platform demo environment", 1, None, 0, TaskStatus.open, LeadPriority.high, 1),
    ("Call Mia about Pinewood case study", 5, None, 0, TaskStatus.open, LeadPriority.medium, 2),
    ("Confirm Summit Fitness sign-off meeting", 7, None, 0, TaskStatus.open, LeadPriority.high, 1),
    ("Schedule kickoff for phase 2 tooling", 10, None, 2, TaskStatus.open, LeadPriority.medium, 1),
    ("Draft data pipeline audit SOW", 11, None, 1, TaskStatus.completed, LeadPriority.medium, 2),
    ("Send Lakeside booking demo recap", 8, None, 3, TaskStatus.open, LeadPriority.low, 2),
    ("Research Quantum Print budget cycle", 9, None, 5, TaskStatus.open, LeadPriority.low, 0),
    ("Prepare Solaris campaign pitch deck", 3, None, 7, TaskStatus.open, LeadPriority.medium, 2),
    ("Collect Cedar & Co requirements", 2, None, 6, TaskStatus.open, LeadPriority.medium, 2),
    ("Log design system maintenance options", 14, None, 4, TaskStatus.open, LeadPriority.low, 1),
    ("Archive Q4 lead notes", None, 6, 10, TaskStatus.open, LeadPriority.low, 0),
    ("Send invoice reminder for audit", 11, None, -5, TaskStatus.completed, LeadPriority.high, 2),
]


def seed_demo_data(db: Session) -> bool:
    """Seed the fictional demo dataset. Returns True when seeding actually ran."""
    if db.query(User).count() > 0:
        logger.info("Demo seed skipped: database already contains users")
        return False

    now = datetime.now(UTC)

    users = [
        User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
        )
        for email, password, full_name, role in DEMO_USERS
    ]
    db.add_all(users)

    companies = [
        Company(
            name=name,
            website=website,
            industry=industry,
            address=address,
            phone=f"+1-555-0{index:02d}",
            email=f"info@{name.split()[0].lower()}.example.com",
            notes=f"Fictional demo account ({industry}).",
        )
        for index, (name, website, industry, address) in enumerate(DEMO_COMPANIES)
    ]
    db.add_all(companies)
    db.flush()

    contacts = [
        Contact(
            company_id=companies[company_idx].id,
            first_name=first,
            last_name=last,
            email=email,
            job_title=job_title,
            phone=f"+1-555-1{idx:02d}",
        )
        for idx, (company_idx, first, last, email, job_title) in enumerate(DEMO_CONTACTS)
    ]
    db.add_all(contacts)
    db.flush()

    leads = [
        Lead(
            company_id=companies[company_idx].id,
            contact_id=contacts[contact_idx].id,
            title=title,
            description=f"Fictional opportunity: {title} for {companies[company_idx].name}.",
            value=value,
            currency="USD",
            stage=stage,
            priority=priority,
            source=source,
            expected_close_date=(now + timedelta(days=days)).date() if days else None,
            owner_id=users[owner_idx].id,
        )
        for company_idx, contact_idx, title, value, stage, priority, source, days, owner_idx in DEMO_LEADS
    ]
    db.add_all(leads)
    db.flush()

    db.add_all(
        [
            Activity(
                lead_id=leads[lead_idx].id,
                contact_id=leads[lead_idx].contact_id,
                company_id=leads[lead_idx].company_id,
                type=type_,
                subject=subject,
                content=content,
                occurred_at=now - timedelta(days=days_ago),
            )
            for lead_idx, type_, subject, days_ago, content in DEMO_ACTIVITIES
        ]
    )

    db.add_all(
        [
            Task(
                title=title,
                description=f"Demo task related to: {title}",
                related_lead_id=leads[lead_idx].id if lead_idx is not None else None,
                related_contact_id=contacts[contact_idx].id if contact_idx is not None else None,
                due_at=now + timedelta(days=days),
                status=status_,
                priority=priority,
                assigned_to=users[assignee_idx].id,
            )
            for title, lead_idx, contact_idx, days, status_, priority, assignee_idx in DEMO_TASKS
        ]
    )

    db.commit()
    logger.info(
        "Demo data seeded: %d users, %d companies, %d contacts, %d leads, %d activities, %d tasks",
        len(users), len(companies), len(contacts), len(leads),
        len(DEMO_ACTIVITIES), len(DEMO_TASKS),
    )
    return True


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        seeded = seed_demo_data(db)
        if not seeded:
            print("Demo seed skipped: database already contains users.")
        else:
            print("Demo data seeded successfully.")
            print("Demo admin login: admin@clientflow.dev / Admin123!  (DEMO ONLY)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
