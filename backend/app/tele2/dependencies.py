from fastapi import Request

from app.tele2.SSHService import SSHService


def get_ssh_service(request: Request) -> SSHService:
    return request.app.state.ssh_service