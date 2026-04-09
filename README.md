# NullNote

Markdown 기반 노트 작성/정리/공유 플랫폼의 MVP 구현입니다.

## 포함 기능

- 회원가입 / 로그인 / 내 정보 조회 (JWT)
- 노트 CRUD
- 공개 노트 조회
- 내 노트 검색
- Markdown 렌더링 및 XSS sanitize
- 폴더/태그 생성 및 목록 조회 API
- 기본 웹 UI (에디터 + 실시간 미리보기 + 노트 리스트)

## 프로젝트 구조

- app/main.py
- app/core
- app/models
- app/schemas
- app/routes
- app/services
- app/dependencies
- app/static

## 준비

1. Python 3.11+
2. PostgreSQL 실행
3. 데이터베이스 생성: `nullnote`

## 환경 변수

`.env.example`를 참고해 `.env` 생성:

```env
APP_NAME=NullNote
SECRET_KEY=change-this-secret-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/nullnote
CORS_ORIGINS=*
```

## 실행

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- 웹 UI: `http://localhost:8000/`
- 헬스체크: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

## API 요약

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Notes

- `POST /notes`
- `GET /notes/{id}`
- `PUT /notes/{id}`
- `DELETE /notes/{id}`
- `GET /notes/public`
- `GET /notes/user`

### Organization

- `GET /folders`
- `POST /folders`
- `GET /tags`
- `POST /tags`

## 비고

- 댓글, 버전 관리, 이미지 업로드, 협업 기능은 다음 단계에서 확장 예정입니다.
