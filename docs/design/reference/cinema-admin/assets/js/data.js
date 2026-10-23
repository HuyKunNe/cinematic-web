/* Lumière Cinema — dữ liệu minh họa, không phải chính sách thương hiệu thực tế. */
'use strict';

window.CinemaData = (() => {
  const seatTypes = {
    STANDARD: {
      label: 'Thường',
      unit: 'vé',
      capacity: 1
    },
    VIP: {
      label: 'VIP',
      unit: 'vé',
      capacity: 1
    },
    DOUBLE: {
      label: 'Ghế đôi',
      unit: 'cặp',
      capacity: 2
    },
    RECLINER: {
      label: 'Ghế ngả',
      unit: 'vé',
      capacity: 1
    },
    BED: {
      label: 'Giường',
      unit: 'giường',
      capacity: 2
    },
    BLOCKED: {
      label: 'Không sử dụng',
      unit: '',
      capacity: 0
    },
    AISLE: {
      label: 'Lối đi',
      unit: '',
      capacity: 0
    }
  };
  const categories = ['Người lớn', 'Trẻ em', 'Học sinh–sinh viên', 'Người cao tuổi'];
  const day = (delta = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + delta);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };
  function seats(kind = 'Tiêu chuẩn') {
    const a = [];
    for (let r = 0; r < 7; r++) for (let c = 1; c <= 12; c++) a.push({
      id: String.fromCharCode(65 + r) + c,
      row: String.fromCharCode(65 + r),
      col: c,
      type: c === 6 ? 'AISLE' : kind === 'Giường nằm' ? 'BED' : kind === 'Cao cấp' ? 'RECLINER' : r === 6 ? 'DOUBLE' : r > 2 ? 'VIP' : 'STANDARD'
    });
    return a;
  }
  function seed() {
    const cinemas = [{
      id: 'C1',
      code: 'LM-SG01',
      name: 'Lumière Sài Gòn Centre',
      city: 'TP. Hồ Chí Minh',
      address: 'Tầng 5, 86 Nguyễn Huệ, Phường Sài Gòn',
      phone: '028 3822 8800',
      email: 'saigon@lumiere.example',
      hours: '08:00 – 01:00',
      status: 'Hoạt động',
      amenities: 'Bãi đỗ xe, Thang máy, Ghế chờ, Lối tiếp cận xe lăn',
      image: 'assets/images/cinema.svg'
    }, {
      id: 'C2',
      code: 'LM-HN01',
      name: 'Lumière Hà Nội Riverside',
      city: 'Hà Nội',
      address: 'Tầng 4, 28 Trần Quang Khải, Phường Hoàn Kiếm',
      phone: '024 3933 8800',
      email: 'hanoi@lumiere.example',
      hours: '08:00 – 00:00',
      status: 'Hoạt động',
      amenities: 'Bãi đỗ xe, Phòng chờ, Lối tiếp cận xe lăn',
      image: 'assets/images/cinema.svg'
    }, {
      id: 'C3',
      code: 'LM-DN01',
      name: 'Lumière Đà Nẵng Coast',
      city: 'Đà Nẵng',
      address: 'Tầng 3, 120 Võ Nguyên Giáp, Phường Sơn Trà',
      phone: '0236 388 8800',
      email: 'danang@lumiere.example',
      hours: '09:00 – 00:00',
      status: 'Hoạt động',
      amenities: 'Bãi đỗ xe, Thang máy, Phòng chờ',
      image: 'assets/images/cinema.svg'
    }];
    const configs = [['C1', 'Phòng 01', 'Tiêu chuẩn', ['2D', '3D'], 'Hoạt động'], ['C1', 'Phòng 02', 'IMAX', ['2D', '3D'], 'Hoạt động'], ['C1', 'Phòng 03', 'Cao cấp', ['2D'], 'Hoạt động'], ['C1', 'Phòng 04', '4DX', ['2D', '3D'], 'Bảo trì'], ['C2', 'Phòng 01', 'Tiêu chuẩn', ['2D', '3D'], 'Hoạt động'], ['C2', 'Phòng 02', 'ScreenX', ['2D'], 'Hoạt động'], ['C2', 'Phòng 03', 'Giường nằm', ['2D'], 'Hoạt động'], ['C3', 'Phòng 01', 'Tiêu chuẩn', ['2D', '3D'], 'Hoạt động'], ['C3', 'Phòng 02', '4DX / ScreenX', ['2D', '3D'], 'Hoạt động']];
    const rooms = configs.map((x, i) => ({
      id: 'R' + (i + 1),
      cinemaId: x[0],
      name: x[1],
      kind: x[2],
      formats: x[3],
      status: x[4],
      technology: x[2] === 'IMAX' ? 'Hình ảnh và âm thanh IMAX' : x[2] === 'Tiêu chuẩn' ? 'Máy chiếu laser · Âm thanh 7.1' : x[2] + ' · Âm thanh đa kênh',
      seats: seats(x[2])
    }));
    const names = [['Hành tinh xanh', 'Phiêu lưu', 'P', 132, 'Việt Nam', 'An Lâm', 'Minh Anh, Hoàng Nam', 'Một nhóm thám hiểm tìm lại những ký ức trong khu rừng cuối cùng.'], ['Bên kia mùa hạ', 'Tình cảm', 'T13', 108, 'Việt Nam', 'Hà Nguyên', 'Mai Linh, Vũ Phong', 'Cuộc gặp gỡ tình cờ đưa hai người bạn cũ trở lại mùa hạ năm ấy.'], ['Thành phố không ngủ', 'Hành động', 'T16', 118, 'Hàn Quốc', 'Lee Min', 'Kim Jun, Park Hana', 'Một đêm, một thành phố và cuộc chạy đua ngăn một kế hoạch bí ẩn.'], ['Chuyến tàu sao băng', 'Hoạt hình', 'P', 96, 'Nhật Bản', 'Aki Mori', 'Lồng tiếng: Tú Anh, Đức Huy', 'Chiếc vé thần kỳ mở ra hành trình đi tìm các vì sao.'], ['Mật mã đại dương', 'Khoa học viễn tưởng', 'T13', 124, 'Mỹ', 'Alex Rivers', 'Sam Reed, Emma West', 'Tín hiệu từ đáy biển sâu thay đổi hiểu biết về hành tinh.'], ['Ngôi nhà bên đồi', 'Kinh dị', 'T18', 102, 'Việt Nam', 'Trần Vũ', 'Khánh Vy, Nhật Minh', 'Một gia đình mới chuyển đến phát hiện bí mật của căn nhà.'], ['Những ngày rực rỡ', 'Hài', 'T13', 105, 'Việt Nam', 'Bảo Châu', 'Lan Chi, Thành Phúc', 'Nhóm bạn quyết định mở một quán nhỏ và làm lại cuộc đời.'], ['Dấu chân miền ký ức', 'Chính kịch', 'T13', 115, 'Pháp', 'Louis Martin', 'Claire Duval, Hugo Blanc', 'Hành trình đi qua những thành phố để hoàn thành một lời hứa.']];
    const movies = names.map((n, i) => ({
      id: 'M' + (i + 1),
      name: n[0],
      genre: n[1],
      age: n[2],
      duration: n[3],
      country: n[4],
      director: n[5],
      cast: n[6],
      description: n[7],
      release: day(i === 7 ? 8 : -20 - i),
      status: i === 7 ? 'Sắp chiếu' : 'Đang chiếu',
      poster: 'assets/images/poster-' + (i + 1) + '.svg',
      trailer: '',
      versions: [{
        id: 'V1',
        format: '2D',
        language: i === 3 ? 'Tiếng Việt' : 'Nguyên bản',
        subtitle: i === 3 ? 'Lồng tiếng' : 'Phụ đề Việt'
      }, ...(i === 0 || i === 3 || i === 4 ? [{
        id: 'V2',
        format: '3D',
        language: 'Nguyên bản',
        subtitle: 'Phụ đề Việt'
      }] : [])]
    }));
    function priceTable(id, name, dayType, bump, status = 'Đang áp dụng') {
      const prices = {};
      for (const format of ['2D', '3D']) for (const time of ['before', 'after']) for (const [type, meta] of Object.entries(seatTypes).filter(x => x[1].capacity)) for (let i = 0; i < 4; i++) {
        let price = type === 'DOUBLE' ? 200000 : type === 'BED' ? 330000 : type === 'RECLINER' ? 180000 : type === 'VIP' ? 100000 : 80000;
        price += type === 'DOUBLE' && dayType !== 'Lễ/Tết' ? 0 : bump + (time === 'after' ? 15000 : 0);
        price += format === '3D' ? 35000 : 0;
        prices[[format, time, type, categories[i]].join('|')] = (type === 'RECLINER' || type === 'BED' || type === 'DOUBLE') && i > 0 ? 'NA' : price - (i > 0 ? 15000 : 0);
      }
      return {
        id,
        name,
        dayType,
        cinemaIds: ['C1', 'C2', 'C3'],
        roomKinds: ['Tiêu chuẩn', 'IMAX', 'Cao cấp', '4DX', 'ScreenX', 'Giường nằm', '4DX / ScreenX'],
        formats: ['2D', '3D'],
        status,
        prices,
        description: 'Giá minh họa; áp dụng khi được chọn cho suất chiếu.'
      };
    }
    const pricing = [priceTable('P1', 'Tiêu chuẩn · Ngày thường', 'Ngày thường', 0), priceTable('P2', 'Tiêu chuẩn · Cuối tuần', 'Cuối tuần', 15000), priceTable('P3', 'Lễ & Tết · Toàn hệ thống', 'Lễ/Tết', 35000), priceTable('P4', 'Ưu đãi mùa phim mới', 'Ngày thường', 0, 'Bản nháp')];
    pricing[3].prices['3D|after|VIP|Người lớn'] = '';
    const products = [{
      id: 'F1',
      name: 'Bắp rang bơ',
      price: 55000,
      kind: 'Đồ ăn',
      description: 'Bắp rang bơ · Cỡ lớn',
      status: 'Đang bán',
      cinemaIds: ['C1', 'C2', 'C3'],
      components: [],
      image: 'assets/images/popcorn.svg'
    }, {
      id: 'F2',
      name: 'Nước ngọt',
      price: 35000,
      kind: 'Thức uống',
      description: 'Ly 700 ml · Chọn vị tại quầy',
      status: 'Đang bán',
      cinemaIds: ['C1', 'C2', 'C3'],
      components: [],
      image: 'assets/images/drink.svg'
    }, {
      id: 'F3',
      name: 'Combo đôi Lumière',
      price: 115000,
      kind: 'Combo',
      description: 'Một buổi phim, thêm trọn vẹn',
      status: 'Đang bán',
      cinemaIds: ['C1', 'C2', 'C3'],
      components: [{
        productId: 'F1',
        qty: 1
      }, {
        productId: 'F2',
        qty: 2
      }],
      image: 'assets/images/combo.svg'
    }, {
      id: 'F4',
      name: 'Nachos phô mai',
      price: 65000,
      kind: 'Đồ ăn',
      description: 'Bánh ngô giòn cùng sốt phô mai',
      status: 'Tạm ngừng',
      cinemaIds: ['C1', 'C2'],
      components: [],
      image: 'assets/images/popcorn.svg'
    }];
    const customers = Array.from({
      length: 18
    }, (_, i) => ({
      id: 'U' + (i + 1),
      name: ['Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Lê Thanh Hà', 'Phạm Bảo Ngọc', 'Vũ Đức Huy', 'Đặng Thu Trang', 'Hoàng Quỳnh Chi', 'Phan Tuấn Kiệt', 'Đỗ Hải Yến'][i % 9] + (i > 8 ? ' (khách ' + (i + 1) + ')' : ''),
      email: 'khach' + (i + 1) + '@example.com',
      phone: '090' + String(1230000 + i),
      tier: i % 5 === 0 ? 'Khách vãng lai' : i % 3 === 0 ? 'Vàng' : 'Bạc',
      points: 0
    }));
    const shows = [];
    for (let d = -13; d <= 2; d++) for (const [ri, room] of rooms.entries()) {
      if (room.status !== 'Hoạt động') continue;
      for (let k = 0; k < 3; k++) {
        const movie = movies[(ri + k + Math.abs(d)) % 7],
          hour = 10 + k * 4,
          version = movie.versions[(ri + k) % movie.versions.length];
        const fmt = room.formats.includes(version.format) ? version : movie.versions[0];
        const date = day(d),
          week = new Date(date + 'T12:00:00+07:00').getDay();
        shows.push({
          id: 'S' + (shows.length + 1),
          movieId: movie.id,
          versionId: fmt.id,
          roomId: room.id,
          date,
          time: String(hour).padStart(2, '0') + ':00',
          breakMinutes: 20,
          priceId: week === 0 || week === 6 ? 'P2' : 'P1',
          status: 'Mở bán'
        });
      }
    }
    const orders = [],
      payments = [];
    let ticketN = 1;
    for (let i = 0; i < 210; i++) {
      const show = shows[i * 17 % shows.length],
        room = rooms.find(r => r.id === show.roomId),
        movie = movies.find(m => m.id === show.movieId),
        version = movie.versions.find(v => v.id === show.versionId);
      const seat = room.seats.filter(s => seatTypes[s.type].capacity)[i % 60];
      const category = 'Người lớn',
        table = pricing.find(p => p.id === show.priceId),
        price = table.prices[[version.format, show.time >= '17:00' ? 'after' : 'before', seat.type, category].join('|')];
      const pending = i % 19 === 0,
        failed = i % 29 === 0 && !pending,
        paid = !pending && !failed,
        used = paid && show.date < day();
      const food = i % 3 === 0 ? [{
        productId: 'F3',
        qty: 1,
        unitPrice: 115000
      }] : [];
      const discount = i % 7 === 0 && paid && !['Cao cấp', 'Giường nằm'].includes(room.kind) ? 10000 : 0;
      const ticket = {
        id: 'VE' + String(ticketN++).padStart(6, '0'),
        seatId: seat.id,
        type: seat.type,
        category,
        price: Number(price),
        status: used ? 'Đã sử dụng' : failed ? 'Đã hủy' : 'Chưa sử dụng'
      };
      const order = {
        id: 'DH' + String(100001 + i),
        showId: show.id,
        customerId: customers[i % 18].id,
        tickets: [ticket],
        items: food,
        discount,
        promoId: discount ? 'KM1' : null,
        total: Number(price) + food.reduce((a, b) => a + b.qty * b.unitPrice, 0) - discount,
        status: pending ? 'Chờ thanh toán' : failed ? 'Đã hủy' : 'Đã xác nhận',
        createdAt: show.date + 'T08:' + String(i % 60).padStart(2, '0') + ':00+07:00',
        history: [{
          at: show.date + 'T08:00:00+07:00',
          action: 'Tạo đơn đặt vé'
        }, ...(paid ? [{
          at: show.date + 'T08:02:00+07:00',
          action: 'Thanh toán thành công'
        }] : []), ...(used ? [{
          at: show.date + 'T' + show.time + ':00+07:00',
          action: 'Đã kiểm soát vé'
        }] : [])]
      };
      orders.push(order);
      payments.push({
        id: 'GD' + String(200001 + i),
        orderId: order.id,
        method: ['VNPAY', 'MoMo', 'Thẻ ngân hàng', 'Tiền mặt'][i % 4],
        status: pending ? 'Chờ thanh toán' : failed ? 'Thất bại' : 'Thành công',
        amount: order.total,
        reference: 'LM' + String(820000 + i),
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
        needsReview: i === 20
      });
    }
    // Vé dùng trực tiếp để trải nghiệm soát vé, luôn thuộc suất hôm nay.
    const demoShow = shows.find(s => s.date === day() && s.roomId === 'R1' && s.time === '18:00'),
      demoRoom = rooms[0];
    const demoSeat = demoRoom.seats.find(s => s.id === 'D8');
    const demoPrice = pricing.find(p => p.id === demoShow.priceId).prices['2D|after|VIP|Người lớn'];
    orders.push({
      id: 'DH-DEMO',
      showId: demoShow.id,
      customerId: 'U1',
      tickets: [{
        id: 'VE-DEMO',
        seatId: demoSeat.id,
        type: demoSeat.type,
        category: 'Người lớn',
        price: demoPrice,
        status: 'Chưa sử dụng'
      }],
      items: [],
      discount: 0,
      total: demoPrice,
      status: 'Đã xác nhận',
      createdAt: day() + 'T09:00:00+07:00',
      history: [{
        at: day() + 'T09:00:00+07:00',
        action: 'Tạo vé minh họa để soát vé'
      }]
    });
    payments.push({
      id: 'GD-DEMO',
      orderId: 'DH-DEMO',
      method: 'MoMo',
      status: 'Thành công',
      amount: demoPrice,
      reference: 'LM-DEMO',
      createdAt: day() + 'T09:00:00+07:00',
      updatedAt: day() + 'T09:00:00+07:00',
      needsReview: false
    });
    rooms.push({
      id: 'R10',
      cinemaId: 'C3',
      name: 'Phòng 03',
      kind: 'Cao cấp',
      formats: ['2D'],
      status: 'Hoạt động',
      technology: 'Máy chiếu laser · Ghế ngả',
      seats: seats('Cao cấp')
    });
    payments[29].status = 'Hết hạn';
    const promotions = [{
      id: 'KM1',
      name: 'Rực rỡ mùa phim mới',
      code: 'LUMI10',
      start: day(-20),
      end: day(20),
      cinemaIds: ['C1', 'C2', 'C3'],
      roomKinds: ['Tiêu chuẩn', 'IMAX', '4DX', 'ScreenX', '4DX / ScreenX'],
      formats: ['2D', '3D'],
      categories: [...categories],
      minOrder: 80000,
      mode: 'Số tiền',
      value: 10000,
      maxDiscount: 10000,
      limit: 500,
      combine: false,
      status: 'Đang áp dụng',
      description: 'Giảm 10.000đ cho đơn từ 80.000đ. Không áp dụng phòng cao cấp, giường nằm.'
    }, {
      id: 'KM2',
      name: 'Đi phim cùng bạn',
      code: 'BANBE15',
      start: day(3),
      end: day(30),
      cinemaIds: ['C1', 'C2'],
      roomKinds: ['Tiêu chuẩn'],
      formats: ['2D'],
      categories: [...categories],
      minOrder: 200000,
      mode: 'Phần trăm',
      value: 15,
      maxDiscount: 50000,
      limit: 300,
      combine: false,
      status: 'Sắp diễn ra',
      description: 'Giảm 15%, tối đa 50.000đ cho đơn đủ điều kiện.'
    }];
    const staff = [{
      id: 'E1',
      name: 'Nguyễn An',
      email: 'an@lumiere.example',
      role: 'Quản trị hệ thống',
      cinemaIds: ['C1', 'C2', 'C3'],
      status: 'Hoạt động'
    }, {
      id: 'E2',
      name: 'Trần Minh',
      email: 'minh@lumiere.example',
      role: 'Quản lý rạp',
      cinemaIds: ['C1'],
      status: 'Hoạt động'
    }, {
      id: 'E3',
      name: 'Lê Ngọc',
      email: 'ngoc@lumiere.example',
      role: 'Nhân viên bán vé',
      cinemaIds: ['C1'],
      status: 'Hoạt động'
    }, {
      id: 'E4',
      name: 'Phạm Huy',
      email: 'huy@lumiere.example',
      role: 'Nhân viên soát vé',
      cinemaIds: ['C1'],
      status: 'Hoạt động'
    }, {
      id: 'E5',
      name: 'Vũ Hà',
      email: 'ha@lumiere.example',
      role: 'Quản lý rạp',
      cinemaIds: ['C2'],
      status: 'Tạm khóa'
    }];
    return {
      version: 1,
      cinemas,
      rooms,
      movies,
      shows,
      pricing,
      orders,
      payments,
      products,
      promotions,
      customers,
      staff,
      permissions: {},
      settings: {
        brand: 'Lumière Cinema',
        email: 'hello@lumiere.example',
        phone: '1900 0000',
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VNĐ',
        holdMinutes: 10,
        breakMinutes: 20,
        membership: true,
        logo: 'assets/images/logo.svg'
      },
      logs: [{
        id: 'L1',
        actor: 'Nguyễn An',
        action: 'Khởi tạo dữ liệu minh họa',
        target: 'Toàn hệ thống',
        at: new Date().toISOString()
      }]
    };
  }
  return {
    seatTypes,
    categories,
    day,
    seats,
    seed
  };
})();
