# Kế hoạch hôm nay

Website tĩnh gồm hai trang:

- `index.html`: kế hoạch đúng ngày hiện tại theo múi giờ Việt Nam.
- `week.html`: tổng quan thứ Hai–Chủ Nhật, trạng thái từng việc và tỷ lệ hoàn thành.
- `manage.html`: khôi phục kế hoạch mẫu hoặc import file JSON.

Checkbox và file JSON được import chỉ lưu trong `localStorage` của trình duyệt.

## Chạy trên máy

Không mở trực tiếp `index.html` vì trình duyệt có thể chặn việc đọc `plan.json`. Chạy một web server tĩnh trong thư mục này, ví dụ:

```powershell
npx serve .
```

## Đưa lên GitHub Pages

1. Tạo repository GitHub và đưa toàn bộ nội dung thư mục này lên nhánh `main`.
2. Mở **Settings → Pages**.
3. Trong **Build and deployment**, chọn **Deploy from a branch**.
4. Chọn nhánh `main`, thư mục `/ (root)`, rồi **Save**.

## Cấu trúc file JSON

File import phải có đủ bảy ngày. Mỗi việc cần `id`, `time` và `task`:

```json
{
  "version": 1,
  "title": "Hôm nay",
  "schedule": {
    "monday": [{ "id": "work", "time": "08:15–17:00", "task": "Đi làm" }],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
  }
}
```

`id` chỉ cần không trùng trong cùng một ngày.
