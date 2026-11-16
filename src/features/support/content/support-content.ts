// Operational help follows the current application, not the demo's policies.
export const supportFaqGroups = [
  {
    id: 'booking',
    title: 'Đặt vé',
    items: [
      {
        id: 'account',
        question: 'Có cần tài khoản để đặt vé?',
        answer:
          'Bạn cần đăng nhập để chọn ghế, xác nhận đặt vé và xem các đơn của mình. Nếu chưa có tài khoản, hãy đăng ký và xác minh email trước khi đăng nhập.',
      },
      {
        id: 'hold',
        question: 'Ghế được giữ từ lúc nào và trong bao lâu?',
        answer:
          'Chọn ghế trên sơ đồ chưa đồng nghĩa với giữ chỗ. Sau khi yêu cầu được hệ thống xác nhận giữ ghế, trang thanh toán hiển thị thời hạn của đơn. Hãy theo dõi thời gian này; khi hết hạn, kiểm tra trạng thái đơn trước khi chọn lại.',
      },
      {
        id: 'price',
        question: 'Giá vé được tính như thế nào?',
        answer:
          'Giá được lấy từ bảng giá áp dụng cho suất chiếu và loại ghế. Tổng tiền cập nhật khi bạn chọn ghế và được kiểm tra lại trước khi tạo đơn. Ghế đôi tính theo cả cặp. Nếu giá thay đổi, hãy kiểm tra báo giá mới trước khi xác nhận.',
      },
      {
        id: 'seats',
        question: 'Vì sao tôi chưa thể tiếp tục sau khi chọn ghế?',
        answer:
          'Kiểm tra thông báo cạnh phần tóm tắt: ghế có thể không còn trống, chưa có giá hoặc lựa chọn chưa phù hợp quy tắc liền ghế. Khi chọn nhiều ghế, hãy chọn các cụm liền nhau và tránh để lẻ một ghế. Bạn có thể chọn nhiều hàng nếu từng hàng vẫn hợp lệ.',
      },
    ],
  },
  {
    id: 'payment',
    title: 'Thanh toán',
    items: [
      {
        id: 'processing',
        question: 'Trang đang xử lý thanh toán, tôi cần làm gì?',
        answer:
          'Giữ trang mở để hệ thống cập nhật trạng thái. Nếu cần tiếp tục ở cổng thanh toán, dùng thao tác được hiển thị trên trang. Chỉ mở thông tin vé khi đơn được xác nhận; không coi việc quay lại từ cổng thanh toán là xác nhận thành công.',
      },
      {
        id: 'unknown',
        question: 'Chưa xác định kết quả thì làm gì?',
        answer:
          'Mở đơn trong Vé & giao dịch và kiểm tra trạng thái thanh toán. Không tạo thêm đơn hoặc thanh toán lại khi kết quả giao dịch trước chưa rõ. Nếu cần liên hệ rạp, chuẩn bị mã đơn và thời điểm giao dịch; không gửi mật khẩu hoặc mã OTP.',
      },
      {
        id: 'cancel',
        question: 'Tôi có thể hủy đơn đang giữ ghế không?',
        answer:
          'Mở chi tiết đơn trong Vé & giao dịch. Nếu đơn đang giữ ghế, còn hạn và có nút Hủy đơn, bạn có thể xác nhận hủy. Thao tác này không phải yêu cầu hoàn tiền cho vé đã thanh toán.',
      },
    ],
  },
  {
    id: 'tickets',
    title: 'Vé và tài khoản',
    items: [
      {
        id: 'ticket',
        question: 'Xem lại vé ở đâu?',
        answer:
          'Đăng nhập đúng tài khoản đã đặt vé rồi mở Vé & giao dịch. Đơn đã xác nhận có thao tác xem và in thông tin vé. Nếu đơn vẫn đang xử lý hoặc chưa xác định kết quả, kiểm tra trạng thái trước khi tiếp tục.',
      },
      {
        id: 'verification',
        question: 'Email xác minh hết hạn hoặc không hợp lệ thì làm gì?',
        answer:
          'Kiểm tra bạn đã mở đúng liên kết trong email đăng ký. Trang xác minh sẽ hiển thị kết quả từ hệ thống. Hiện chưa có chức năng gửi lại email xác minh trên giao diện; không chia sẻ liên kết xác minh với người khác.',
      },
    ],
  },
]

export const bookingGuideSteps = [
  'Khám phá phim hoặc chọn rạp trong hệ thống rạp.',
  'Chọn ngày và suất chiếu. Kiểm tra đúng rạp, phòng, định dạng và ngôn ngữ.',
  'Đăng nhập khi được yêu cầu. Chọn ghế còn trống và kiểm tra loại ghế, số khách, báo giá cùng thông báo trên sơ đồ.',
  'Nhấn Tiếp tục để kiểm tra thông tin đặt vé và tổng tiền. Nếu muốn đổi ghế, quay lại trước khi xác nhận.',
  'Chọn phương thức thanh toán, xác nhận thông tin rồi nhấn Thanh toán. Hệ thống kiểm tra lại báo giá và tiếp nhận yêu cầu đặt vé.',
  'Theo dõi trang xử lý và tiếp tục tại cổng thanh toán khi được yêu cầu. Nếu chưa rõ kết quả, kiểm tra đơn trước khi tạo giao dịch khác.',
  'Khi đơn được xác nhận, mở thông tin vé từ trang kết quả hoặc Vé & giao dịch. Bạn có thể xem lại và in thông tin vé.',
]
