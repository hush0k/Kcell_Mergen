"""add new enum area to control

Revision ID: 4228f98a812a
Revises: 4bc489b37bf0
Create Date: 2026-06-30 16:27:32.082863

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4228f98a812a'
down_revision: Union[str, Sequence[str], None] = '4bc489b37bf0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    area_enum = sa.Enum('TF', 'IF', 'RA', 'A2P', name='area', schema='kcell_web')
    area_enum.create(op.get_bind())

    op.alter_column('control', 'area',
                    existing_type=sa.VARCHAR(length=64),
                    type_=area_enum,
                    existing_nullable=False,
                    schema='kcell_web',
                    postgresql_using='area::kcell_web.area')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('control', 'area',
                    existing_type=sa.Enum('TF', 'IF', 'RA', 'A2P', name='area', schema='kcell_web'),
                    type_=sa.VARCHAR(length=64),
                    existing_nullable=False,
                    schema='kcell_web')

    sa.Enum(name='area', schema='kcell_web').drop(op.get_bind())