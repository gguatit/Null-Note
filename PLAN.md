# 📄 프로젝트 명세서: NullNote

## 1. 프로젝트 개요

* 프로젝트명: NullNote
* 목적: 사용자들이 Markdown 기반으로 노트를 작성, 정리, 공유할 수 있는 웹 플랫폼 구축
* 핵심 기능:

  * 노트 작성
  * 노트 정리 (구조화 및 관리)
  * 노트 공유

---

## 2. 기술 스택

* Backend: FastAPI (Python)
* Database: PostgreSQL
* Frontend: HTML, CSS, JavaScript
* 코드 하이라이팅: Prism.js
* 서버: Debian
* 네트워크: Cloudflare Tunnel

---

## 3. 핵심 기능

### 3.1 사용자 인증

* 회원가입 / 로그인
* JWT 기반 인증
* 비밀번호 해싱 (bcrypt)

---

### 3.2 노트 작성 기능

* Markdown 기반 에디터
* 실시간 미리보기
* 자동 저장 (옵션)

---

### 3.3 노트 정리 기능

* 노트 목록 관리
* 카테고리(폴더) 기능
* 태그 시스템
* 검색 기능

---

### 3.4 노트 공유 기능

* 공개 노트 URL 제공
* 비공개 노트는 본인만 접근
* 공유 링크 생성 기능 (옵션)

---

### 3.5 Markdown 렌더링

* Markdown → HTML 변환
* 지원 기능:

  * 코드 블록
  * 표
  * 이미지
  * 체크리스트

---

### 3.6 코드 하이라이팅

* Prism.js 사용
* 코드 가독성 향상
* 복사 버튼 제공

---

### 3.7 댓글 기능 (선택)

* 공유된 노트에 댓글 작성 가능

---

### 3.8 버전 관리 (선택)

* 노트 수정 이력 저장
* 이전 버전 복원

---

## 4. API 설계

### Auth

* POST /auth/register
* POST /auth/login
* GET /auth/me

---

### Notes

* POST /notes
* GET /notes/{id}
* PUT /notes/{id}
* DELETE /notes/{id}
* GET /notes/public
* GET /notes/user

---

### Organization

* GET /folders
* POST /folders
* GET /tags
* POST /tags

---

### Comments (선택)

* POST /notes/{id}/comments
* GET /notes/{id}/comments

---

## 5. 데이터베이스 설계

### users

* id
* username
* password_hash
* created_at

---

### notes

* id
* user_id
* title
* content
* is_public
* created_at
* updated_at

---

### folders

* id
* user_id
* name

---

### note_folders

* note_id
* folder_id

---

### tags

* id
* user_id
* name

---

### note_tags

* note_id
* tag_id

---

### note_versions (선택)

* id
* note_id
* content
* created_at

---

### comments (선택)

* id
* note_id
* user_id
* content
* created_at

---

## 6. 백엔드 구조

/app
├── main.py
├── core/
├── models/
├── schemas/
├── routes/
├── services/
├── utils/

---

## 7. 보안 요구사항

* 비밀번호 해싱 (bcrypt)
* JWT 인증
* 입력값 검증 (Pydantic)
* Markdown HTML sanitize (XSS 방지)
* 사용자 권한 체크
* CORS 설정

---

## 8. 배포

### FastAPI 실행

uvicorn app.main:app --host 0.0.0.0 --port 8000

---

### Cloudflare Tunnel

tunnel: nullnote
ingress:

* hostname: nullnote.kalpha.kr
  service: http://localhost:8000
* service: http_status:404

---

### DNS

* CNAME: nullnote.kalpha.kr → tunnel 주소

---

## 9. 프론트엔드 요구사항

* Markdown 에디터 + 미리보기
* 노트 리스트 UI
* 폴더/태그 필터링
* 검색 기능
* 반응형 UI

---

## 10. 개발 단계

### 1단계 (MVP)

* 회원가입 / 로그인
* 노트 작성 / 조회 / 수정 / 삭제
* Markdown 렌더링
* 공개 노트 공유

---

### 2단계

* 폴더 / 태그
* 검색 기능
* UI 개선

---

### 3단계

* 댓글
* 버전 관리
* 이미지 업로드

---

### 4단계

* 협업 기능
* API 확장

---

## 11. 구현 지침

* 먼저 동작하는 최소 기능 구현
* 이후 구조 확장
* 코드 단순성 유지

---

## 12. 시작 순서

1. FastAPI 프로젝트 생성
2. PostgreSQL 연결
3. 인증 시스템 구현
4. 노트 CRUD 구현
5. Markdown 렌더링
6. 프론트엔드 연결

---

이 명세서를 기반으로 전체 시스템을 구현하라.
