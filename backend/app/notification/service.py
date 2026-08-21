from datetime import datetime, timezone
from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import current_user

if TYPE_CHECKING:
    from app.incident.model import Incident as IncidentModel

from app.me_note.note.model import MeNote
from app.me_note.note.repository import MeNoteRepository
from app.notification.connection_manager import manager
from app.notification.model import Notification, NotificationRecipient
from app.notification.repository import NotificationRepository
from app.notification.schemas import (
    NOTE_LINK_RE,
    INCIDENT_LINK_RE,
    NotificationCreate,
    NotificationRecipientResponse,
    NotificationsList,
    UnreadCountResponse,
)
from app.user.model import User
from app.user.repository import UserRepository


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NotificationRepository(db)
        self.note_repo = MeNoteRepository(db)
        self.user_repo = UserRepository(db)

    async def _attach_requester_user_id(self, notifications: list[Notification]) -> None:
        await self._attach_incident_status(notifications)

        system_notifications = [n for n in notifications if n.title and "CODE:843" in n.title]
        if not system_notifications:
            return
        senders = {n.sender for n in system_notifications}
        result = await self.repo.db.execute(
            select(User.id, User.email).where(User.email.in_(senders))
        )
        email_to_id = {email: uid for uid, email in result.all()}
        for n in system_notifications:
            n.requester_user_id = email_to_id.get(n.sender)

        note_ids = {
            int(match.group(1))
            for n in system_notifications
            if (match := NOTE_LINK_RE.search(n.html_content))
        }
        notes_by_id = {}
        if note_ids:
            notes_result = await self.repo.db.execute(
                select(MeNote).where(MeNote.id.in_(note_ids))
            )
            notes_by_id = {note.id: note for note in notes_result.scalars().all()}

        for n in system_notifications:
            n.access_granted = False
            match = NOTE_LINK_RE.search(n.html_content)
            if not match or n.requester_user_id is None:
                continue
            note = notes_by_id.get(int(match.group(1)))
            if not note:
                continue
            edit_mode = bool(n.title) and "редактирование" in n.title
            if edit_mode:
                n.access_granted = n.requester_user_id in {u.id for u in note.can_edit}
            else:
                n.access_granted = n.requester_user_id in {u.id for u in note.can_read}

    async def _attach_incident_status(self, notifications: list[Notification]) -> None:
        from app.incident.model import Incident

        incident_notifications = [n for n in notifications if n.title and "CODE:INC" in n.title]
        if not incident_notifications:
            return

        incident_ids = {
            int(match.group(1))
            for n in incident_notifications
            if (match := INCIDENT_LINK_RE.search(n.html_content))
        }
        if not incident_ids:
            return
        result = await self.repo.db.execute(
            select(Incident.id, Incident.status).where(Incident.id.in_(incident_ids))
        )
        status_by_id = {iid: st for iid, st in result.all()}

        for n in incident_notifications:
            match = INCIDENT_LINK_RE.search(n.html_content)
            if not match:
                continue
            status_val = status_by_id.get(int(match.group(1)))
            n.incident_status = status_val.value if status_val is not None else None

    async def get_user_notifications(
            self, user_id: int, page: int, limit: int, is_read: bool | None = None
    ) -> NotificationsList:
        offset = (page - 1) * limit
        recipients = await self.repo.get_user_notifications(user_id, offset, limit, is_read)
        await self._attach_requester_user_id([r.notification for r in recipients])
        total = await self.repo.get_user_notifications_count(user_id, is_read)
        return NotificationsList(
            notifications=recipients,
            offset=offset,
            limit=limit,
            total=total,
        )

    async def get_notification(self, notification_id: int, user_id: int) -> NotificationRecipient:
        recipient = await self.repo.get_recipient_by_notification_and_user(notification_id, user_id)
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")
        await self._attach_requester_user_id([recipient.notification])
        return recipient

    async def get_unread_count(self, user_id: int) -> UnreadCountResponse:
        count = await self.repo.get_unread_count(user_id)
        return UnreadCountResponse(unread_count=count)

    async def get_notification_html(
            self, notification_id: int, user_id: int
    ) -> Notification:
        recipient = await self.repo.get_recipient_by_notification_and_user(
            notification_id, user_id
        )
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

        await self._attach_requester_user_id([recipient.notification])
        return recipient.notification

    async def mark_as_read(
            self, notification_id: int, user_id: int
    ) -> NotificationRecipient:
        recipient = await self.repo.get_recipient_by_notification_and_user(
            notification_id, user_id
        )
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")
        if recipient.is_read:
            return recipient

        return await self.repo.mark_as_read(recipient)

    async def become_responsible_user(self, notification_id: int, user_id: int) -> Notification:
        notification = await self.repo.get_notification_by_id(notification_id)
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

        if notification.responsible_user_id is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Задача уже выбран другим пользователем")

        is_recipient = await self.repo.is_user_recipient(notification_id, user_id)
        if not is_recipient:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Не достаточно прав для совершение операции")

        notification = await self.repo.become_responsible_user(notification, user_id)

        recipient_ids = await self.repo.get_recipients_ids(notification_id)

        for rid in recipient_ids:
            if manager.is_online(rid):
                await manager.send_to_user(rid, {
                    "type": "User take task",
                    "notification_id": notification_id,
                    "user_id": user_id,
                    "start_time": notification.start_time.isoformat(),
                })

        return notification

    async def end_notification(self, notification_id: int, current_user_this: User) -> Notification:
        notification = await self.repo.get_notification_by_id(notification_id)
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

        if not notification.start_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Задача еще не начата")

        if notification.responsible_user_id != current_user_this.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Вы не брали эту задачу")

        if notification.end_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Задача уже завершена")

        notification.end_time = datetime.now(timezone.utc)
        notification = await self.repo.end_notification_task(notification)

        recipient_ids = await self.repo.get_recipients_ids(notification_id)
        for rid in recipient_ids:
            if manager.is_online(rid):
                await manager.send_to_user(rid, {
                    "type": "Task ended",
                    "notification_id": notification_id,
                    "end_time": notification.end_time.isoformat(),
                })

        return notification



    async def create_notification(self, not_in: NotificationCreate) -> Notification:
        return await self.repo.create(not_in)

    async def create_system_notifiaction(self, user_id: int, note_id: int, edit_mode: bool) -> Notification:
        note = await self.note_repo.get_note(note_id)
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        creator_user = await self.user_repo.get_by_id(note.creater_id)
        admin_emails = await self.user_repo.get_admin_emails()
        admin_emails.append(str(creator_user.email))
        result = ";".join(admin_emails)

        if user_id in {u.id for u in note.can_read} or edit_mode and user_id in {u.id for u in note.can_edit}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="у данного пользователя уже есть нужные права")

        def extract_text_preview(content: dict | None, limit: int = 250) -> str:
            if not content:
                return ""
            parts: list[str] = []

            def walk(node: dict) -> None:
                if node.get("type") == "text":
                    parts.append(node.get("text", ""))
                for child in node.get("content", []):
                    walk(child)

            walk(content)
            text = " ".join(parts)
            return text[:limit] + ("..." if len(text) > limit else "")


        if not edit_mode:
            notification = NotificationCreate(
                sender=user.email,
                title=f"Разрешение на чтение документа: {note.name[:30]} CODE:843",
                html_content=f"""
                    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #f4f6f8; padding: 24px;">
                      <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                          <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div>
                          <span style="font-size: 13px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">Запрос на чтение</span>
                        </div>
    
                        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">{note.name[:30]}...</h2>
    
                        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #e5e7eb;">
                          {extract_text_preview(note.content)}
                        </p>
    
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 14px; color: #374151;">
                          <strong>{user.last_name} {user.first_name}</strong>
                          <span style="color: #9ca3af;">запрашивает доступ на чтение документа</span>
                        </div>
    
                        <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">CODE:843</p>
                      </div>
                    </div>
                """,
                error_message=None,
                recipients_email=result,
            )
        else:
            notification = NotificationCreate(
                sender=user.email,
                title=f"Разрешение на редактирование и чтение документа: {note.name[:50]} CODE:843",
                html_content=f"""
                        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #f4f6f8; padding: 24px;">
                          <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                              <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div>
                              <span style="font-size: 13px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 
                              0.5px;">Запрос на редактирование и чтение</span>
                            </div>
        
                            <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">{note.name[:30]}...</h2>
        
                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #e5e7eb;">
                              {extract_text_preview(note.content)}
                            </p>
        
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 14px; color: #374151;">
                              <strong>{user.last_name} {user.first_name}</strong>
                              <span style="color: #9ca3af;">запрашивает доступ на редактирование и чтение документа</span>
                            </div>
        
                            <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">CODE:843</p>
                          </div>
                        </div>
                    """,
                error_message=None,
                recipients_email=result,
            )

        return await self.repo.create(notification)

    async def create_incident_approval_notification(self, incident: "IncidentModel") -> Notification:
        admin_emails = await self.user_repo.get_admin_emails()
        recipients = ";".join(admin_emails)

        author = await self.user_repo.get_by_username(incident.username)
        sender_email = author.email if author else incident.username

        def row(label: str, value: object) -> str:
            if value in (None, ""):
                return ""
            return f"""
                <tr>
                    <td style="padding:6px 10px;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">{label}</td>
                    <td style="padding:6px 10px;color:#111827;font-size:13px;">{value}</td>
                </tr>
            """

        rows = "".join([
            row("Наименование", incident.incident_name),
            row("Статус", incident.status.value if incident.status else ""),
            row("Автор", incident.username),
            row("Тип контроля", incident.control_type),
            row("Подтип контроля", incident.control_subtype),
            row("Риск", incident.risk),
            row("Категория", incident.category),
            row("Область проблемы", incident.problem_area),
            row("Источник обнаружения", incident.detected_source),
            row("Отчётный месяц", incident.reporting_month),
            row("Дата возникновения", incident.occurrence_date),
            row("Дата решения", incident.solution_date),
            row("Дата закрытия", incident.close_date),
            row("Описание", incident.description),
            row("Принятые меры", incident.taken_measures),
            row("Первопричина", incident.root_cause),
            row("Оценочные потери", incident.estimated_loss),
            row("Упущенная выгода", incident.opportunity_loss),
            row("Безнадёжный долг", incident.bad_debt),
            row("Предотвращённая экономия", incident.prevented_savings),
            row("Возмещённая экономия", incident.recovered_savings),
            row("Перерасход", incident.overchange),
            row("Затронутая услуга", incident.service_abused),
            row("Кол-во мошеннических номеров", incident.count_fraudulent_numbers),
            row("Тип кейса", incident.case_type),
            row("Расчёт KPI", incident.kpi_calculation),
            row("Подтверждённое мошенничество", incident.confirmed_fraud.value if incident.confirmed_fraud else None),
        ])

        html_content = f"""
            <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #f4f6f8; padding: 24px;">
              <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></div>
                  <span style="font-size: 13px; font-weight: 600; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">Требуется согласование инцидента</span>
                </div>

                <h2 style="margin: 0 0 4px; font-size: 18px; color: #111827;">{incident.incident_name or f"Инцидент #{incident.id}"}</h2>
                <p style="margin: 0 0 16px; font-size: 13px; color: #9ca3af;">
                  Инцидент <a href="/incidents/{incident.id}" style="color:#2563eb;text-decoration:none;">#{incident.id}</a> отправлен на согласование пользователем <strong>{incident.username}</strong>
                </p>

                <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
                  {rows}
                </table>

                <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">CODE:INC</p>
              </div>
            </div>
        """

        notification = NotificationCreate(
            sender=sender_email,
            title=f"Согласование инцидента: {(incident.incident_name or f'#{incident.id}')[:50]} CODE:INC",
            html_content=html_content,
            error_message=None,
            recipients_email=recipients,
        )

        return await self.repo.create(notification)

