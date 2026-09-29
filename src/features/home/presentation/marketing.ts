// Editorial presentation from the static HTML/CSS reference. There is no
// promotions or membership API contract; these cards are non-transactional.
export const promotionPreviews = [
  {
    label: 'THỨ 3 VUI VẺ',
    title: 'ĐỒNG GIÁ',
    highlight: '45K',
    description: 'Áp dụng cho tất cả các suất chiếu vào thứ 3 hằng tuần',
    art: '🍿',
  },
  {
    label: 'ƯU ĐÃI COMBO',
    title: 'XEM PHIM TRỌN VẸN',
    highlight: 'VỚI COMBO TIẾT KIỆM',
    description: 'Bắp nước ngon hơn cùng những bộ phim hay nhất',
    art: '🥤🍿',
  },
] as const

export const membershipBenefits = [
  { icon: '♔', text: 'Tích điểm mỗi giao dịch' },
  { icon: '▣', text: 'Ưu đãi thành viên' },
  { icon: '✦', text: 'Sinh nhật nhận quà đặc biệt' },
  { icon: '☆', text: 'Đổi điểm lấy vé xem phim' },
] as const
