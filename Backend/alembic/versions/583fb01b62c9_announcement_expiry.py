"""Add announcement severity and expiration."""

import sqlalchemy as sa
from alembic import op

revision = "583fb01b62c9"
down_revision = "162b65c8ff5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "announcements", sa.Column("severity", sa.Text(), nullable=False, server_default="important")
    )
    op.add_column("announcements", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "ck_announcements_severity", "announcements", "severity IN ('general', 'important', 'emergency')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_announcements_severity", "announcements", type_="check")
    op.drop_column("announcements", "expires_at")
    op.drop_column("announcements", "severity")
