/* Dữ liệu hư cấu. Tất cả giá là giá cuối cùng, không có phụ thu. */
(function () {
  const tz='Asia/Ho_Chi_Minh';
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const isoDay=(offset)=>{const d=new Date(today+'T12:00:00+07:00');d.setDate(d.getDate()+offset);return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
  const movies=[
    {id:'tang-may',title:'Dưới tầng mây',en:'BEYOND THE CLOUDS',genre:'Khoa học viễn tưởng',duration:128,age:'T13',country:'Việt Nam',release:isoDay(-8),director:'Trần Minh An',cast:'Linh Đan, Hoàng Sơn, Gia Huy',formats:['2D','3D'],languages:['Phụ đề','Lồng tiếng'],status:'now',accent:'#dfae68',blurb:'Khi bầu trời không còn là giới hạn.',description:'Một tín hiệu bí ẩn từ thành phố phía trên những tầng mây đưa nữ kỹ sư An vào hành trình tìm lại người cha mất tích. Giữa một thế giới đang đổi thay, cô phải lựa chọn giữa sự thật và nơi mình gọi là nhà.',art:'clouds'},
    {id:'mua-he',title:'Mùa hè năm ấy',en:'SUMMER, AGAIN',genre:'Tình cảm',duration:112,age:'T13',country:'Việt Nam',release:isoDay(-5),director:'Lê Thanh Hà',cast:'Mai Chi, Duy Anh',formats:['2D'],languages:['Lồng tiếng'],status:'now',accent:'#eea18b',blurb:'Có những mùa hè ở lại mãi.',description:'Trở về thị trấn ven biển sau mười năm, Hạ gặp lại người bạn cùng lời hẹn cũ. Một cuộn phim chưa tráng đưa cả hai tìm lại những điều tưởng đã bỏ quên.',art:'summer'},
    {id:'mat-ma',title:'Mật mã lúc 0 giờ',en:'THE MIDNIGHT CODE',genre:'Hành động',duration:136,age:'T18',country:'Hoa Kỳ',release:isoDay(-2),director:'Alex Morgan',cast:'Evan Cole, Mia Park',formats:['2D','3D'],languages:['Phụ đề'],status:'now',accent:'#7d9bca',blurb:'Một đêm. Một cơ hội cuối cùng.',description:'Một chuyên gia giải mã nhận được cuộc gọi từ chính mình trong tương lai. Đồng hồ đếm ngược bắt đầu giữa thành phố không ngủ và một âm mưu chưa từng được hé lộ.',art:'code'},
    {id:'khu-vuon',title:'Khu vườn kỳ diệu',en:'THE LITTLE WILD',genre:'Hoạt hình',duration:96,age:'P',country:'Nhật Bản',release:isoDay(-10),director:'Aoki Ren',cast:'Minh Thư, Tuấn Nam (lồng tiếng)',formats:['2D','3D'],languages:['Phụ đề','Lồng tiếng'],status:'now',accent:'#91b18a',blurb:'Cuộc phiêu lưu bắt đầu từ một hạt mầm.',description:'Cô bé Mây và chú cáo nhỏ phát hiện một khu vườn biết nói. Cùng những người bạn mới, họ đi tìm hạt mầm cuối cùng để mang mùa xuân trở lại.',art:'garden'},
    {id:'tram-cuoi',title:'Trạm cuối bình minh',en:'FIRST LIGHT',genre:'Tâm lý',duration:119,age:'T16',country:'Hàn Quốc',release:isoDay(-12),director:'Kim Ji-won',cast:'Han Soo, Lee Yuna',formats:['2D'],languages:['Phụ đề'],status:'now',accent:'#d5b181',blurb:'Mỗi cuộc chia tay là một khởi đầu.',description:'Ba người xa lạ cùng chờ chuyến tàu đầu tiên ở một nhà ga nhỏ. Trong một đêm dài, câu chuyện của họ giao nhau và thay đổi mọi điều.',art:'station'},
    {id:'dao-xanh',title:'Bí mật đảo xanh',en:'ISLAND OF ECHOES',genre:'Phiêu lưu',duration:104,age:'K',country:'Việt Nam',release:isoDay(-4),director:'Phạm Hải',cast:'An Nhiên, Việt Khang',formats:['2D'],languages:['Lồng tiếng'],status:'now',accent:'#63a9b3',blurb:'Đi thật xa để tìm thấy chính mình.',description:'Hai anh em lạc vào một hòn đảo không có trên bản đồ. Để trở về, họ phải đọc được lời nhắn của biển và học cách tin tưởng lẫn nhau.',art:'island'},
    {id:'phia-sao',title:'Phía bên kia vì sao',en:'ANOTHER CONSTELLATION',genre:'Khoa học viễn tưởng',duration:132,age:'T13',country:'Hoa Kỳ',release:isoDay(14),director:'Sam Rivera',cast:'Ava Reed, Theo Lane',formats:['2D','3D'],languages:['Phụ đề'],status:'soon',accent:'#9a94ce',blurb:'Chúng ta chưa bao giờ đơn độc.',description:'Một nhà thiên văn nhận được bản nhạc từ một chòm sao đã tắt. Cuộc tìm kiếm dẫn cô đến khám phá thay đổi cách con người nhìn về vũ trụ.',art:'stars'},
    {id:'nha-co-nang',title:'Nhà có nắng',en:'A HOME IN THE SUN',genre:'Gia đình',duration:105,age:'P',country:'Việt Nam',release:isoDay(21),director:'Nguyễn Thu',cast:'Thanh Vân, Bảo Lâm, An Vy',formats:['2D'],languages:['Lồng tiếng'],status:'soon',accent:'#d9ae66',blurb:'Hạnh phúc đôi khi chỉ là trở về.',description:'Một căn nhà cũ và quyết định bất ngờ kéo ba thế hệ trở lại sống cùng nhau. Những rắc rối nho nhỏ mở ra câu chuyện ấm áp về gia đình.',art:'home'}
  ];
  const cinemas=[
    {id:'riverside',name:'Lumière Riverside',city:'TP. Hồ Chí Minh',district:'Bình Thạnh',address:'Tầng 4, Trung tâm Riverside, 128 Đường Ánh Sáng, Bình Thạnh, TP. Hồ Chí Minh',hours:'08:30 – 00:30',phone:'028 7300 0188',directions:'Lối vào phía đường Ánh Sáng. Gửi xe tại tầng B1, thang máy khu B lên tầng 4.',amenities:['Bãi đỗ xe','Thang máy','Lối đi xe lăn','Wi-Fi','Quầy đồ ăn'],rooms:[{id:'r1',name:'Phòng 01',type:'Tiêu chuẩn',formats:['2D','3D'],layout:'standard'},{id:'r2',name:'Phòng 02',type:'IMAX',formats:['2D','3D'],layout:'imax'},{id:'r3',name:'Phòng 03',type:'4DX',formats:['2D','3D'],layout:'motion'}]},
    {id:'garden',name:'Lumière Garden',city:'TP. Hồ Chí Minh',district:'Quận 7',address:'Tầng 3, Garden Plaza, 36 Đường Vườn Xanh, Quận 7, TP. Hồ Chí Minh',hours:'09:00 – 00:00',phone:'028 7300 0288',directions:'Cổng Garden Plaza phía Nam. Gửi xe B2 và đi thang máy sảnh trung tâm lên tầng 3.',amenities:['Bãi đỗ xe','Thang máy','Lối đi xe lăn','Phòng chờ','Quầy đồ ăn'],rooms:[{id:'g1',name:'Phòng 01',type:'Tiêu chuẩn',formats:['2D'],layout:'standard'},{id:'g2',name:'Phòng 02',type:'Cao cấp',formats:['2D'],layout:'premium'},{id:'g3',name:'Phòng 03',type:'Giường nằm',formats:['2D'],layout:'bed'}]},
    {id:'westlake',name:'Lumière Westlake',city:'Hà Nội',district:'Tây Hồ',address:'Tầng 5, Westlake Center, 88 Đường Hồ Xanh, Tây Hồ, Hà Nội',hours:'09:00 – 23:30',phone:'024 7300 0388',directions:'Vào từ sảnh Hồ Xanh. Bãi đỗ xe B1, thang máy C lên tầng 5.',amenities:['Bãi đỗ xe','Thang máy','Lối đi xe lăn','Wi-Fi','Quầy đồ ăn'],rooms:[{id:'w1',name:'Phòng 01',type:'ScreenX',formats:['2D'],layout:'standard'},{id:'w2',name:'Phòng 02',type:'Tiêu chuẩn',formats:['2D','3D'],layout:'standard'}]}
  ];
  const experiences=[{name:'Tiêu chuẩn',text:'Không gian quen thuộc, màn hình sắc nét và âm thanh bao trùm.'},{name:'IMAX',text:'Màn hình lớn và hệ thống hình ảnh, âm thanh theo chuẩn IMAX.'},{name:'4DX',text:'Ghế chuyển động kết hợp hiệu ứng môi trường. Không dành cho trẻ dưới 1 m và người nhạy cảm với chuyển động.'},{name:'ScreenX',text:'Các phân cảnh được mở rộng sang hai bên tường, tạo góc nhìn toàn cảnh.'},{name:'Cao cấp',text:'Ghế ngả rộng rãi cùng không gian thư giãn riêng tư.'},{name:'Giường nằm',text:'Giường dành cho hai khách, bán theo nguyên giường.'}];
  const products=[{id:'combo2',name:'Combo hẹn hò',contents:'1 bắp rang lớn + 2 nước ngọt 500 ml',price:139000,cinemas:['riverside','garden','westlake'],art:'combo'},{id:'combo1',name:'Combo một mình vui',contents:'1 bắp rang vừa + 1 nước ngọt 500 ml',price:89000,cinemas:['riverside','garden','westlake'],art:'popcorn'},{id:'pop',name:'Bắp rang caramel',contents:'1 hộp bắp rang caramel 120 g. Có sữa.',price:59000,cinemas:['riverside','garden','westlake'],art:'popcorn'},{id:'tea',name:'Trà đào cam sả',contents:'1 ly 500 ml, ít đá. Có đào và cam.',price:39000,cinemas:['garden','riverside'],art:'drink'},{id:'water',name:'Nước suối',contents:'1 chai nước tinh khiết 500 ml',price:20000,cinemas:['riverside','garden','westlake'],art:'drink'}];
  const offers=[{id:'first',code:'CHAO20',title:'Lần hẹn đầu, thêm niềm vui',subtitle:'Giảm 20% tiền vé, tối đa 40.000đ',kind:'welcome',color:'#f9d9cd',rules:'Áp dụng đơn có tiền vé từ 100.000đ, tại Riverside và Garden, phòng Tiêu chuẩn, vé Người lớn. Không áp dụng loại vé ưu đãi, IMAX, 4DX, ScreenX, Cao cấp hoặc Giường nằm. Mỗi thông tin liên hệ dùng 1 lần. Không cộng dồn mã.',cinemas:['riverside','garden'],rooms:['Tiêu chuẩn'],minimum:100000,percent:.2,max:40000},{id:'food',code:'BAP20',title:'Phim hay, bắp ngon, giá hời',subtitle:'Giảm 20.000đ khi mua đồ ăn từ 100.000đ',kind:'food',color:'#e6e9cf',rules:'Tất cả cụm rạp và loại phòng. Giá trị đồ ăn từ 100.000đ. Mỗi đơn dùng 1 mã, không cộng dồn. Không giảm trên tiền vé.',cinemas:['riverside','garden','westlake'],minimum:100000,amount:20000},{id:'member',code:'BANMOI',title:'Thành viên mới, nhiều trải nghiệm',subtitle:'Khám phá quyền lợi của Lumière Club',kind:'member',color:'#dce6ed',rules:'Đăng ký thành viên miễn phí. Tích 1 điểm mỗi 10.000đ thực thanh toán, làm tròn xuống. Điểm minh họa chưa dùng đổi tiền hoặc đổi vé.',cinemas:['riverside','garden','westlake']}];
  const days=Array.from({length:7},(_,i)=>isoDay(i));
  const showtimes=[];
  days.forEach((date,di)=>cinemas.forEach((c,ci)=>movies.filter(m=>m.status==='now').forEach((m,mi)=>{
    if((di===6&&mi===5)||(c.id==='garden'&&mi===2&&di===2))return;
    [0,1].forEach(slot=>{
      const room=c.rooms[(mi+slot)%c.rooms.length];
      const format=room.formats.includes('3D')&&m.formats.includes('3D')&&slot===1?'3D':'2D';
      const time=slot===0?['10:15','12:40','14:20','15:45','16:30','17:00'][mi]:['18:00','18:45','19:30','20:15','21:00','22:10'][mi];
      let status='available';if(di===0&&ci===0&&mi===1&&slot===0)status='sold';if(di===0&&ci===0&&mi===2&&slot===0)status='stopped';if((mi+ci+slot+di)%7===1&&status==='available')status='low';
      showtimes.push({id:`${date}_${c.id}_${m.id}_${slot}`,movieId:m.id,cinemaId:c.id,roomId:room.id,date,time,format,language:m.languages[slot%m.languages.length],status});
    });
  })));
  function roomOf(s){return cinemas.find(c=>c.id===s.cinemaId)?.rooms.find(r=>r.id===s.roomId)}
  function showStatus(s){if(new Date(s.date+'T'+s.time+':00+07:00').getTime()<=Date.now()+5*60000)return 'stopped';return s.status}
  function seatsFor(s){
    const room=roomOf(s),premium=room.layout==='premium',bed=room.layout==='bed';
    const rows=bed?'ABCD':premium?'ABCDE':room.layout==='motion'?'ABCDEF':'ABCDEFGH';
    return [...rows].flatMap((row,ri)=>Array.from({length:bed?4:premium?6:row==='H'&&room.layout==='standard'?5:10},(_,idx)=>{
      const paired=bed||(row==='H'&&room.layout==='standard'),num=paired?`${idx*2+1}-${idx*2+2}`:`${idx+1}`;
      const type=bed?'Giường':premium?'Ghế ngả':paired?'Đôi':ri>=3?'VIP':'Thường';
      const code=row+num;let state='free';const v=(ri*13+idx*7+s.id.length)%29;
      if(v<4)state='sold';else if(v===6)state='held';else if(v===8)state='disabled';
      if(showStatus(s)==='sold')state='sold';if(s.status==='low'&&v>6)state='sold';
      return {id:code,row,num,type,unit:paired?(bed?'giường':'cặp'):'vé',people:paired?2:1,state};
    }));
  }
  function categories(s){return ['Cao cấp','Giường nằm'].includes(roomOf(s).type)?['Người lớn']:['Người lớn',...(movies.find(m=>m.id===s.movieId).age==='P'||movies.find(m=>m.id===s.movieId).age==='K'?['Trẻ em']:[]),'Học sinh – sinh viên','Người cao tuổi']}
  function price(s,seat,category='Người lớn'){
    const dow=new Date(s.date+'T12:00:00+07:00').getDay(),evening=s.time>='17:00',weekend=dow===0||dow===6;
    const room=roomOf(s);let p=weekend?(evening?105000:95000):(evening?95000:75000);
    if(room.type==='IMAX')p=weekend?165000:145000;
    if(room.type==='4DX')p=weekend?185000:165000;
    if(room.type==='ScreenX')p=weekend?145000:125000;
    if(s.format==='3D'&&room.type==='Tiêu chuẩn')p=weekend?125000:105000;
    if(seat.type==='VIP')p+=15000;
    if(seat.type==='Đôi')return weekend?220000:200000;
    if(seat.type==='Ghế ngả')return weekend?220000:190000;
    if(seat.type==='Giường')return weekend?420000:380000;
    if(category==='Trẻ em')p-=20000;
    if(category==='Học sinh – sinh viên'||category==='Người cao tuổi')p-=15000;
    return p;
  }
  window.NOVA_DATA={tz,today,days,movies,cinemas,experiences,products,offers,showtimes,roomOf,showStatus,seatsFor,categories,price};
})();
