import enum


class MimeTypes(enum.Enum):
    PDF = "application/pdf"
    MD = "text/markdown"
    HTML = "text/html"
    JPEG = "image/jpeg"
    XLS = "application/vnd.ms-excel"
    XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    CSV = "text/csv"
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
