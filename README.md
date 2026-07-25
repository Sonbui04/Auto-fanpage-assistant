# Auto Fanpage Assistant

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-26A5E4?logo=telegram&logoColor=white)
![Facebook Graph API](https://img.shields.io/badge/Facebook-Graph_API-0866FF?logo=facebook&logoColor=white)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)

**Auto Fanpage Assistant** là công cụ tự động đăng bài Facebook Fanpage qua Telegram. Bot có thể tìm nguồn từ Google News hoặc đọc một URL, dùng AI tổng hợp và viết lại nội dung tiếng Việt, tạo bản nháp để quản trị viên duyệt, đăng ngay hoặc lên lịch qua Meta Graph API chính thức.

> Mục tiêu của dự án là giúp quản trị Fanpage tiết kiệm thời gian nhưng vẫn giữ con người ở bước kiểm duyệt cuối cùng.

## Mục lục

- [Tính năng](#tính-năng)
- [Quy trình hoạt động](#quy-trình-hoạt-động)
- [Công nghệ](#công-nghệ)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt nhanh](#cài-đặt-nhanh)
- [Cấu hình Telegram](#cấu-hình-telegram)
- [Cấu hình Facebook Page](#cấu-hình-facebook-page)
- [Cấu hình AI và 9Router](#cấu-hình-ai-và-9router)
- [Các lệnh Telegram](#các-lệnh-telegram)
- [Kiểm thử](#kiểm-thử)
- [Triển khai Docker trên AWS EC2](#triển-khai-docker-trên-aws-ec2)
- [Bảo mật và sử dụng nội dung](#bảo-mật-và-sử-dụng-nội-dung)
- [Lộ trình](#lộ-trình)
- [Đóng góp](#đóng-góp)

## Tính năng

- 🔎 Tìm các nguồn nội dung mới bằng từ khóa qua Google News.
- 🔗 Đọc tiêu đề, mô tả, nội dung và ảnh đại diện từ URL.
- ✍️ Tổng hợp, viết lại nội dung Fanpage bằng API tương thích OpenAI.
- 🤖 Điều khiển toàn bộ quy trình bằng Telegram bot.
- ✅ Duyệt hoặc hủy bản nháp trước khi đăng.
- 🚀 Đăng bài chữ, liên kết hoặc ảnh lên Facebook Page.
- 🗓️ Lên lịch đăng bài theo múi giờ Việt Nam.
- 🔐 Giới hạn quyền điều khiển theo Telegram user ID.
- 🧾 Chống tạo trùng bài theo URL nguồn.
- 💾 Lưu bản nháp, lịch và trạng thái bài viết bằng SQLite.
- 🛡️ Không lưu mật khẩu Facebook; chỉ dùng Page Access Token.

## Quy trình hoạt động

```text
Google News / URL
        ↓
 Trích xuất nội dung
        ↓
 AI tổng hợp, viết lại
        ↓
 Bản nháp trên Telegram
        ↓
  Duyệt / Hủy / Lên lịch
        ↓
   Meta Graph API
        ↓
    Facebook Page
```

Bot không tự ý đăng ngay sau khi lấy nguồn. Quản trị viên có thể đọc bản nháp và quyết định đăng, hủy hoặc lên lịch.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Runtime | Node.js 20+ |
| Ngôn ngữ | TypeScript |
| Telegram | grammY |
| Facebook | Meta Graph API |
| AI | OpenAI-compatible API / 9Router |
| Thu thập nội dung | Cheerio, RSS Parser, Google News RSS |
| Cơ sở dữ liệu | SQLite với better-sqlite3 |
| Kiểm tra cấu hình | Zod |

## Yêu cầu

- Node.js `20` trở lên và npm.
- Một Telegram bot được tạo bằng `@BotFather`.
- Telegram user ID của quản trị viên.
- Một Facebook Page mà bạn có quyền quản lý.
- Meta App có các quyền:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- Page Access Token.
- API AI tương thích OpenAI nếu muốn dùng tính năng viết lại bằng AI.

## Cài đặt nhanh

```bash
git clone https://github.com/Sonbui04/Auto-fanpage-assistant.git
cd Auto-fanpage-assistant
npm install
```

Tạo file cấu hình từ mẫu:

```powershell
Copy-Item .env.example .env
```

Trên macOS hoặc Linux:

```bash
cp .env.example .env
```

Điền các biến môi trường cần thiết rồi chạy:

```bash
npm start
```

Chế độ phát triển có tự động tải lại:

```bash
npm run dev
```

## Cấu hình Telegram

1. Mở Telegram và nhắn `@BotFather`.
2. Chạy `/newbot`, đặt tên và username cho bot.
3. Lưu bot token vào `TELEGRAM_BOT_TOKEN`.
4. Lấy Telegram user ID của bạn và lưu vào `TELEGRAM_ADMIN_IDS`.

Có thể cho phép nhiều quản trị viên bằng cách phân tách ID bằng dấu phẩy:

```dotenv
TELEGRAM_ADMIN_IDS=123456789,987654321
```

## Cấu hình Facebook Page

Tạo Meta App tại [Meta for Developers](https://developers.facebook.com/apps/) và bật trường hợp sử dụng quản lý Page. Sau khi cấp đủ quyền, lấy Page ID và Page Access Token rồi điền:

```dotenv
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_GRAPH_VERSION=v25.0
```

> Không dùng mật khẩu Facebook trong ứng dụng. Không commit token thật lên GitHub.

## Cấu hình AI và 9Router

Ứng dụng làm việc với API tương thích OpenAI:

```dotenv
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=your_model
OPENAI_BASE_URL=
```

Ví dụ khi dùng 9Router chạy cục bộ:

```dotenv
OPENAI_API_KEY=your_9router_key
OPENAI_MODEL=your_9router_model
OPENAI_BASE_URL=http://localhost:20128/v1
```

Nếu bỏ trống API AI, bot vẫn có thể tạo bản nháp cơ bản từ nội dung đã trích xuất.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Có | Token Telegram bot |
| `TELEGRAM_ADMIN_IDS` | Có | Các Telegram user ID được phép điều khiển |
| `OPENAI_API_KEY` | Không | API key cho AI |
| `OPENAI_MODEL` | Không | Model dùng để tổng hợp nội dung |
| `OPENAI_BASE_URL` | Không | Endpoint API tương thích OpenAI |
| `FACEBOOK_PAGE_ID` | Khi đăng | ID của Facebook Page |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Khi đăng | Page Access Token |
| `FACEBOOK_GRAPH_VERSION` | Không | Phiên bản Meta Graph API |
| `TIMEZONE` | Không | Múi giờ; mặc định `Asia/Ho_Chi_Minh` |
| `DATABASE_PATH` | Không | Đường dẫn file SQLite |
| `REQUIRE_APPROVAL` | Không | Bật bước duyệt trước khi đăng |

Tham khảo đầy đủ tại [`.env.example`](./.env.example).

## Các lệnh Telegram

| Lệnh | Công dụng | Ví dụ |
| --- | --- | --- |
| `/start` | Xem hướng dẫn sử dụng | `/start` |
| `/search <từ khóa>` | Tìm 5 nguồn nội dung mới | `/search công nghệ AI` |
| `/url <URL>` | Tạo bản nháp từ một trang web | `/url https://example.com/article` |
| `/list` | Xem danh sách bài gần đây | `/list` |
| `/view <id>` | Xem chi tiết một bài | `/view 1` |
| `/schedule <id> <ngày giờ>` | Duyệt và lên lịch | `/schedule 1 2026-07-27 08:30` |
| `/publish <id>` | Đăng ngay bài đã duyệt | `/publish 1` |
| `/cancel <id>` | Hủy bài | `/cancel 1` |

Ví dụ quy trình:

1. Gửi `/search công nghệ AI`.
2. Chọn **Tạo bản nháp** ở nguồn phù hợp.
3. Đọc và kiểm tra nội dung AI đã tổng hợp.
4. Bấm **Duyệt**.
5. Bấm **Đăng ngay** hoặc dùng `/schedule`.

Lịch hiện được hiểu theo múi giờ `Asia/Ho_Chi_Minh`. Tiến trình bot cần chạy liên tục để thực hiện bài đã lên lịch.

## Kiểm thử

Kiểm tra kiểu TypeScript:

```bash
npm run typecheck
```

Chạy test:

```bash
npm test
```

## Triển khai Docker trên AWS EC2

Dự án có sẵn `Dockerfile` để chạy bot liên tục trên EC2 hoặc một máy chủ Linux khác.

```bash
git clone https://github.com/Sonbui04/Auto-fanpage-assistant.git
cd Auto-fanpage-assistant
cp .env.example .env
# Điền secret vào .env trực tiếp trên máy chủ

docker build -t auto-fanpage-assistant .
docker run -d \
  --name auto-fanpage-assistant \
  --restart unless-stopped \
  --network host \
  -e NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection" \
  --env-file .env \
  -v auto-fanpage-data:/app/data \
  auto-fanpage-assistant
```

`--network host` cho phép container gọi AI gateway đang chạy tại `127.0.0.1` trên EC2. Hai tùy chọn Node.js ưu tiên IPv4, giúp Telegram hoạt động ổn định trên máy chủ chưa cấu hình IPv6.

Kiểm tra trạng thái:

```bash
docker ps
docker logs --tail 100 auto-fanpage-assistant
```

Với Telegram long polling, máy chủ không cần mở cổng HTTP/HTTPS. Chỉ mở SSH từ địa chỉ IP tin cậy khi thực sự cần quản trị từ xa.

## Cấu trúc dự án

```text
src/
├── bot.ts        # Lệnh và tương tác Telegram
├── config.ts     # Biến môi trường
├── content.ts    # Tìm kiếm, trích xuất và viết lại
├── db.ts         # SQLite và vòng đời bài viết
├── facebook.ts   # Đăng bài qua Meta Graph API
├── format.ts     # Định dạng bản xem trước
├── index.ts      # Khởi động bot và xử lý lịch
└── types.ts      # Kiểu dữ liệu
test/
└── db.test.ts
Dockerfile         # Image chạy bot trên máy chủ
```

## Bảo mật và sử dụng nội dung

- File `.env` và thư mục dữ liệu cục bộ đã được loại khỏi Git bằng `.gitignore`.
- Không gửi token, mật khẩu hoặc mã OTP qua issue, commit hay ảnh chụp màn hình.
- Nếu token bị lộ, hãy thu hồi và tạo token mới ngay.
- Chỉ thu thập nội dung bạn có quyền sử dụng.
- Không sao chép nguyên văn bài của nguồn khác.
- Kiểm tra tính chính xác, bản quyền và liên kết nguồn trước khi đăng.
- Tuân thủ Điều khoản nền tảng Meta và Telegram.

## Lộ trình

- [ ] Thêm nguồn Threads, Facebook và RSS tùy chỉnh.
- [ ] Dashboard web quản lý lịch nội dung.
- [ ] Tải ảnh lên thay vì chỉ dùng URL ảnh.
- [ ] Nhiều Facebook Page trong một bot.
- [ ] Phân quyền nhiều quản trị viên.
- [ ] Thống kê hiệu quả bài đăng.
- [ ] Docker và hướng dẫn triển khai máy chủ.

## Đóng góp

Issue và pull request đều được chào đón:

1. Fork repository.
2. Tạo branch tính năng: `git checkout -b feature/ten-tinh-nang`.
3. Commit thay đổi.
4. Push branch và mở pull request.

Nếu dự án hữu ích, hãy cân nhắc **Star ⭐ repository** để theo dõi các bản cập nhật và giúp nhiều người tìm thấy dự án hơn.


---

Các từ khóa liên quan: **Facebook auto post**, **Telegram Facebook bot**, **Facebook Page scheduler**, **AI content generator**, **tự động đăng bài Fanpage**, **lên lịch bài Facebook**, **Meta Graph API TypeScript**.
