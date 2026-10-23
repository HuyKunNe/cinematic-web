/* LUMI CINEMA • Dữ liệu và quy tắc nghiệp vụ mô phỏng. Không gọi máy chủ. */
(function (global) {
  'use strict';
  const ZONE = 'Asia/Ho_Chi_Minh', KEY = 'lumi-staff-demo-v1';
  const roles = {
    manager: { name: 'Trưởng ca · tất cả nghiệp vụ', permissions: ['dashboard','sell','food','orders','scan','fulfillment','rooms','shift','account','exception'] },
    ticket: { name: 'Nhân viên bán vé', permissions: ['dashboard','sell','orders','rooms','shift','account'] },
    food: { name: 'Nhân viên quầy đồ ăn', permissions: ['dashboard','food','orders','fulfillment','shift','account'] },
    usher: { name: 'Nhân viên soát vé', permissions: ['dashboard','scan','rooms','shift','account'] },
    combined: { name: 'Bán vé + quầy đồ ăn', permissions: ['dashboard','sell','food','orders','fulfillment','rooms','shift','account'] }
  };
  const movies = [
    {id:'m1',title:'Bên kia quỹ đạo',genre:'Khoa học viễn tưởng',duration:128,age:'T13',art:'orbit',tag:'Hành trình bắt đầu từ một tín hiệu'},
    {id:'m2',title:'Mùa hè trong veo',genre:'Tình cảm · Gia đình',duration:108,age:'K',art:'summer',tag:'Có những mùa hè ở lại mãi'},
    {id:'m3',title:'Thành phố không ngủ',genre:'Hành động · Bí ẩn',duration:116,age:'T18',art:'city',tag:'Mỗi ánh đèn là một bí mật'},
    {id:'m4',title:'Khu rừng tí hon',genre:'Hoạt hình · Phiêu lưu',duration:95,age:'P',art:'forest',tag:'Chuyến phiêu lưu của những người bạn nhỏ'}
  ];
  const products = [
    {id:'p1',name:'Combo đôi vui vẻ',group:'Combo',price:149000,image:'combo',description:'1 bắp lớn + 2 nước M',options:['Bắp ngọt · Cola','Bắp phô mai · Cola','Bắp ngọt · Trà đào'],available:true},
    {id:'p2',name:'Bắp rang cỡ lớn',group:'Bắp rang',price:65000,image:'popcorn',description:'Một phần bắp L',options:['Vị ngọt','Vị phô mai','Vị caramel'],available:true},
    {id:'p3',name:'Nước ngọt cỡ vừa',group:'Đồ uống',price:35000,image:'drink',description:'Ly 600 ml',options:['Cola','Soda chanh','Cam'],available:true},
    {id:'p4',name:'Trà đào cam sả',group:'Đồ uống',price:45000,image:'tea',description:'Ly 500 ml · Ít đá',options:['Đường bình thường','Ít đường'],available:true},
    {id:'p5',name:'Combo một mình chill',group:'Combo',price:99000,image:'single',description:'1 bắp M + 1 nước M',options:['Bắp ngọt · Cola','Bắp phô mai · Soda'],available:true},
    {id:'p6',name:'Nachos phô mai',group:'Ăn nhẹ',price:59000,image:'nachos',description:'Bánh bắp + sốt phô mai',options:['Sốt phô mai'],available:false}
  ];
  const roomDefs = [
    {id:'r1',name:'Phòng 01',type:'Tiêu chuẩn',rows:7,cols:10,format:'2D',lang:'Phụ đề',fares:{adult:85000,child:65000,student:70000,senior:65000},vip:105000,couple:200000},
    {id:'r2',name:'Phòng 02',type:'IMAX',rows:7,cols:10,format:'3D',lang:'Phụ đề',fares:{adult:180000},vip:210000},
    {id:'r3',name:'Phòng 03',type:'Tiêu chuẩn',rows:6,cols:10,format:'2D',lang:'Lồng tiếng',fares:{adult:85000,child:65000,student:70000,senior:65000},vip:105000,couple:200000},
    {id:'r4',name:'Phòng 04',type:'Cao cấp',rows:4,cols:8,format:'2D',lang:'Phụ đề',fares:{adult:250000},recliner:250000},
    {id:'r6',name:'Phòng 06',type:'4DX',rows:6,cols:8,format:'3D',lang:'Phụ đề',fares:{adult:240000}},
    {id:'r7',name:'Phòng 07',type:'ScreenX',rows:6,cols:10,format:'2D',lang:'Phụ đề',fares:{adult:130000}},
    {id:'r5',name:'Phòng 05',type:'Giường nằm',rows:3,cols:4,format:'2D',lang:'Phụ đề',fares:{adult:450000},bed:450000}
  ];
  const audience = {adult:'Người lớn',child:'Trẻ em',student:'Học sinh – sinh viên',senior:'Người cao tuổi'};
  const money = n => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))+'đ';
  const stamp = (ms,withDate=false) => new Intl.DateTimeFormat('vi-VN',{timeZone:ZONE, hour:'2-digit',minute:'2-digit', ...(withDate?{day:'2-digit',month:'2-digit',year:'numeric'}:{})}).format(new Date(ms));
  function seed() {
    const date = new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const base = new Date(date+'T13:42:00+07:00').getTime();
    const at = (h,m=0,day=0) => new Date(date+`T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+07:00`).getTime()+day*86400000;
    let shows = [
      ['s1','m1','r1',14,15],['s2','m2','r3',14,30],['s3','m3','r2',15,0],['s4','m1','r4',15,15],['s5','m4','r3',17,0],['s6','m2','r1',17,30],['s7','m1','r5',16,0],['s8','m3','r2',18,0],['s9','m2','r1',11,0],['s10','m4','r3',12,0],['s11','m3','r4',19,0],['s12','m1','r1',20,0],['s13','m3','r6',16,15],['s14','m1','r7',17,0]
    ].map(([id,movieId,roomId,h,m])=>({id,movieId,roomId,start:at(h,m),stop:id==='s11',full:id==='s8'}));
    for(let d=1;d<=2;d++) shows.push(...shows.filter(s=>['s1','s2','s3','s4','s7'].includes(s.id)).map(s=>({...s,id:s.id+'d'+d,start:s.start+d*86400000})));
    const state={externalShows:[{id:'sf1',cinemaId:'c2',movieId:'m1',roomId:'rx',start:at(14,15)}],shiftHistory:[],version:1,createdAt:Date.now(),clockBase:base,session:false,locked:false,role:'manager',staff:{id:'NV024',name:'Nguyễn Minh Anh',initials:'MA'},cinema:{id:'c1',name:'Lumi Nguyễn Trãi',address:'218 Nguyễn Trãi, TP. Hồ Chí Minh',zone:ZONE},counter:'Quầy vé 02',shift:{id:'CA-1023-02',status:'open',opening:1000000,start:at(13,0),end:null,counted:null,note:'',handover:'',cashier:true},shows,orders:[],transactions:[],tickets:[],audits:[],incidents:[],draft:{showId:null,seats:[],products:[],customer:null,promo:'',holdUntil:null,paymentOrder:null},seq:110,holdOverrides:{},roomWarnings:{r4:'Kiểm tra hệ thống điều hòa trước suất 15:15.',r5:'Giường A1 tạm bảo trì. Không nhận bán đơn vị này.'}};
    const add=(id,showId,seats,items,method,total,status='paid',opts={})=>{
      const order={id,source:opts.online?'online':'counter',cinemaId:opts.wrongCinema?'c2':'c1',shiftId:state.shift.id,created:at(13,opts.minute||10),contact:opts.contact||'0901234567',customer:opts.customer||'Khách vãng lai',status:status==='paid'?'confirmed':status==='cancelled'?'cancelled':'pending',payment:status,method,seatLines:seats.map(seat=>{const sh=state.shows.find(s=>s.id===showId)||state.externalShows.find(s=>s.id===showId);const r=roomDefs.find(r=>r.id===sh.roomId)||roomDefs[0];const row=seat.charCodeAt(0)-65;const seatType=r.bed?'bed':r.recliner?'recliner':r.couple&&row===r.rows-1?'couple':r.vip&&row>=2&&row<=4?'vip':'standard';return{seat,showId,type:'adult',price:opts.ticketPrice||85000,people:seatType==='couple'||seatType==='bed'?2:1,seatType};}),products:items.map(([pid,qty,delivered=0])=>({key:pid+'-0',id:pid,qty,delivered,option:products.find(p=>p.id===pid).options[0],price:products.find(p=>p.id===pid).price})),discount:0,total,foodStatus:opts.foodStatus||'waiting',note:opts.note||'',logs:[{at:at(13,10),actor:'Nguyễn Minh Anh',text:'Tạo đơn '+(opts.online?'trực tuyến':'tại quầy')}]};
      state.orders.push(order);
      order.logs[0].at=order.created;
      const trans={id:'GD-'+id.slice(3),orderId:id,shiftId:state.shift.id,amount:total,method,status:status==='paid'?'success':status==='cancelled'?'expired':status,at:order.created,attempt:1,received:method==='cash'?Math.ceil(total/100000)*100000:0};state.transactions.push(trans);
      if(status==='paid') for(let i=0;i<order.seatLines.length;i++) state.tickets.push({id:'VE-'+id.slice(3)+'-'+(i+1),orderId:id,...order.seatLines[i],cinemaId:opts.wrongCinema?'c2':'c1',status:opts.used?'used':opts.cancelTicket?'cancelled':'valid',checkedAt:opts.used?at(13,30):null,checkedBy:opts.used?'Lê Thảo Vy':null});
      return order;
    };
    add('DH-1001','s1',['D5','D6'],[['p1',1]],'cash',359000,'paid',{ticketPrice:105000,minute:2,foodStatus:'ready'});
    add('DH-1002','s2',['C3'],[['p3',2,1]],'card',175000,'paid',{ticketPrice:105000,online:true,minute:9,foodStatus:'ready',customer:'Trần Hoàng Linh',contact:'0918765432'});
    add('DH-1003','s3',['D3'],[['p2',1]],'qr',275000,'paid',{ticketPrice:210000,minute:15});
    add('DH-1004',null,[],[['p1',2,2],['p4',1,1]],'cash',343000,'paid',{minute:22,foodStatus:'delivered'});
    add('DH-1005','s1',['E5'],[],'qr',105000,'unknown',{ticketPrice:105000,minute:29});
    add('DH-1006','s2',['B4'],[],'qr',85000,'paid',{online:true,used:true,minute:32});
    add('DH-1007','sf1',['B7'],[],'card',85000,'paid',{wrongCinema:true,minute:35});
    add('DH-1008','s9',['B2'],[],'cash',85000,'paid',{minute:37});
    add('DH-1009','s2',['B8'],[],'qr',85000,'paid',{cancelTicket:true,minute:38});
    add('DH-1010','s2',['A2'],[],'qr',85000,'pending',{minute:39});
    add('DH-1011','s2',['A3'],[],'qr',85000,'cancelled',{minute:40});
    // Suất hết chỗ được tạo từ một đơn online đủ toàn bộ ghế có thể bán.
    const fullSeats=[];for(let row=0;row<7;row++)for(let n=1;n<=10;n++){const seat=String.fromCharCode(65+row)+n;if(seat!=='A1')fullSeats.push(seat);}
    const full=add('DH-1012','s8',fullSeats,[],'qr',0,'paid',{online:true,minute:41,ticketPrice:180000});
    full.seatLines.forEach(l=>{l.price=l.seatType==='vip'?210000:180000;});
    full.total=full.seatLines.reduce((n,l)=>n+l.price,0);
    state.transactions.find(t=>t.orderId===full.id).amount=full.total;
    state.tickets.filter(t=>t.orderId===full.id).forEach(t=>{t.price=full.seatLines.find(l=>l.seat===t.seat).price;});
    return state;
  }
  function load(){try {const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.version===1&&s.shift&&s.draft&&s.staff&&s.cinema&&Array.isArray(s.shows)&&Array.isArray(s.orders)&&Array.isArray(s.transactions)&&Array.isArray(s.tickets)&&Number.isFinite(s.clockBase)&&Number.isFinite(s.createdAt))return s;}catch(_){}return seed();}
  let state=load();
  let storageOK=true;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch(_){storageOK=false;}return storageOK;}
  const now=()=>state.clockBase+(Date.now()-state.createdAt);
  const can=p=>roles[state.role].permissions.includes(p);
  const hasCashier=()=>can('sell')||can('food');
  const requireOpen=()=>{if(state.shift.status!=='open')throw Error('Ca chưa mở hoặc đã kết thúc. Vào mục Ca làm việc để nhận ca trước khi ghi nhận giao dịch.');};
  const audit=(text,order)=>{const entry={at:now(),actor:state.staff.name,text};state.audits.unshift(entry);if(order)order.logs.push(entry);};
  const show=id=>state.shows.find(s=>s.id===id)||state.externalShows?.find(s=>s.id===id);
  const movie=id=>movies.find(m=>m.id===id);
  const room=id=>roomDefs.find(r=>r.id===id)||(id==='rx'?{...roomDefs[0],id:'rx',cinemaId:'c2'}:undefined);
  const order=id=>state.orders.find(o=>o.id===id&&o.cinemaId===state.cinema.id);
  const tx=id=>state.transactions.find(t=>t.id===id);
  function showStatus(s){if(s.stop)return 'Ngừng bán';if(s.start<=now())return 'Đã bắt đầu';if(s.full||remaining(s)===0)return 'Hết chỗ';return 'Đang bán';}
  function seats(s){const r=room(s.roomId);let list=[];for(let row=0;row<r.rows;row++){const letter=String.fromCharCode(65+row);const type=r.bed?'bed':r.recliner?'recliner':r.couple&&row===r.rows-1?'couple':r.vip&&row>=2&&row<=4?'vip':'standard';const count=type==='couple'?r.cols/2:r.cols;for(let n=1;n<=count;n++)list.push({id:letter+n,row:letter,num:n,type,people:type==='couple'||type==='bed'?2:1});}return list;}
  function seatStatus(s,id){
    if(s.full)return 'sold';
    const paid=state.tickets.some(t=>t.showId===s.id&&t.seat===id&&t.status!=='cancelled'&&t.cinemaId===state.cinema.id);
    if(paid)return 'sold';
    if(state.orders.some(o=>o.cinemaId===state.cinema.id&&['pending','unknown'].includes(o.payment)&&o.status!=='cancelled'&&o.seatLines.some(l=>l.showId===s.id&&l.seat===id)))return 'held';
    if(id==='A1')return 'disabled';
    if(id==='B5'&&!state.holdOverrides[s.id])return 'held';
    return 'free';
  }
  function remaining(s){return seats(s).filter(x=>seatStatus(s,x.id)==='free').reduce((n,x)=>n+x.people,0);}
  function fare(s,seat,type='adult'){const r=room(s.roomId);if(seat.type==='couple')return r.couple;if(seat.type==='bed')return r.bed;if(seat.type==='recliner')return r.recliner;if(!r.fares[type])throw Error('Loại vé không áp dụng cho suất chiếu này.');return r.fares[type]+(seat.type==='vip'?r.vip-r.fares.adult:0);}
  function availableTypes(s,seat){return seat.type==='couple'||seat.type==='bed'||seat.type==='recliner'?['adult']:Object.keys(room(s.roomId).fares);}
  function draftTotals(){const d=state.draft;const tickets=d.seats.reduce((n,s)=>n+s.price,0),food=d.products.reduce((n,p)=>n+p.price*p.qty,0);const sh=show(d.showId);const eligible=d.customer&&tickets+food>=100000&&(!sh||!['Cao cấp','Giường nằm'].includes(room(sh.roomId).type));const discount=d.promo==='LUMI10'&&eligible?Math.min(30000,Math.round((tickets+food)*.1)):0;return{tickets,food,discount,promoInvalid:!!d.promo&&!eligible,total:tickets+food-discount};}
  function clearDraft(){state.draft={showId:null,seats:[],products:[],customer:null,promo:'',holdUntil:null,paymentOrder:null};save();}
  function expireHold(){const d=state.draft;if(d.holdUntil&&now()>=d.holdUntil&&!d.paymentOrder){d.seats=[];d.holdUntil=null;d.promo='';save();return true;}return false;}
  function chooseSeat(id){requireOpen();if(!can('sell'))throw Error('Bạn không có quyền bán vé.');const d=state.draft;if(d.paymentOrder)throw Error('Đơn đã chuyển thanh toán. Hãy xử lý kết quả trước khi sửa đơn.');const s=show(d.showId);if(!s||showStatus(s)!=='Đang bán')throw Error('Suất chiếu không còn nhận bán vé. Hãy chọn suất khác.');expireHold();const i=d.seats.findIndex(x=>x.seat===id);if(i>=0)d.seats.splice(i,1);else{if(seatStatus(s,id)!=='free')throw Error('Ghế không còn trống. Vui lòng chọn ghế khác.');const seat=seats(s).find(x=>x.id===id);if(!seat)throw Error('Không tìm thấy ghế.');d.seats.push({seat:id,type:'adult',price:fare(s,seat),people:seat.people,seatType:seat.type,showId:s.id});if(!d.holdUntil)d.holdUntil=now()+300000;}if(!d.seats.length)d.holdUntil=null;save();}
  function addProduct(pid,option,delta=1){requireOpen();if(!hasCashier())throw Error('Vai trò này không có quyền bán hàng.');if(state.draft.paymentOrder)throw Error('Đơn đang thanh toán, không thể sửa sản phẩm.');const p=products.find(x=>x.id===pid);if(!p||!p.available)throw Error('Sản phẩm đã hết hàng.');if(!p.options.includes(option))throw Error('Tùy chọn không hợp lệ.');const d=state.draft;const key=pid+'-'+p.options.indexOf(option);let line=d.products.find(x=>x.key===key);if(line){line.qty+=delta;if(line.qty<=0)d.products=d.products.filter(x=>x!==line);}else if(delta>0)d.products.push({key,id:pid,qty:1,option,price:p.price,delivered:0});save();}
  function promo(code){const d=state.draft;const s=show(d.showId);if(s&&['Cao cấp','Giường nằm'].includes(room(s.roomId).type))throw Error('Phòng cao cấp và giường nằm không áp dụng ưu đãi trong bản demo.');if(code.trim().toUpperCase()!=='LUMI10')throw Error('Mã không hợp lệ. Mã minh họa: LUMI10.');if(!d.customer)throw Error('LUMI10 chỉ dành cho thành viên. Hãy tìm và chọn thành viên trước.');if(draftTotals().tickets+draftTotals().food<100000)throw Error('Đơn cần đạt 100.000đ trước giảm giá để áp dụng LUMI10.');d.promo='LUMI10';save();}
  function createPayment(method,received=0){
    requireOpen();if(!state.shift.cashier)throw Error('Ca này chưa được nhận cho thu ngân. Kết ca và nhận ca với vai trò thu ngân trước khi thanh toán.');const d=state.draft;if(d.paymentOrder){const o=order(d.paymentOrder);if(o)return o;}
    if(expireHold())throw Error('Đã hết thời gian giữ ghế. Chọn lại ghế trước khi thanh toán.');
    if(!['cash','qr','card'].includes(method))throw Error('Phương thức không hợp lệ.');
    if(d.seats.length&&!can('sell'))throw Error('Vai trò này không được thanh toán vé.');
    if(!hasCashier())throw Error('Vai trò này không được thu ngân.');
    if(!d.seats.length&&!d.products.length)throw Error('Đơn chưa có vé hoặc sản phẩm.');
    if(d.showId&&d.seats.length){const s=show(d.showId);if(showStatus(s)!=='Đang bán')throw Error('Suất đã ngừng bán. Vui lòng chọn suất khác.');for(const l of d.seats)if(seatStatus(s,l.seat)!=='free')throw Error('Ghế '+l.seat+' không còn trống. Chọn lại ghế.');}
    const totals=draftTotals();if(totals.promoInvalid)throw Error('Đơn không còn đủ điều kiện ưu đãi. Bỏ mã hoặc bổ sung dịch vụ trước khi thanh toán.');if(method==='cash'&&(!Number.isFinite(received)||received<totals.total))throw Error('Số tiền khách đưa chưa đủ. Kiểm tra và nhập lại.');
    const id='DH-'+(++state.seq+1000);const o={id,source:'counter',cinemaId:state.cinema.id,shiftId:state.shift.id,created:now(),contact:d.customer?.phone||'',customer:d.customer?.name||'Khách vãng lai',status:'pending',payment:'pending',method,seatLines:JSON.parse(JSON.stringify(d.seats)),products:JSON.parse(JSON.stringify(d.products)),discount:totals.discount,total:totals.total,foodStatus:'waiting',note:'',logs:[]};
    state.orders.push(o);state.transactions.push({id:'GD-'+id.slice(3),orderId:id,shiftId:state.shift.id,amount:o.total,method,status:'pending',at:now(),attempt:1,received:method==='cash'?received:0});d.paymentOrder=id;audit('Tạo yêu cầu thanh toán · '+({cash:'Tiền mặt',qr:'QR chuyển khoản',card:'Thẻ ngân hàng'}[method]),o);save();return o;
  }
  function settle(id,result){requireOpen();if(!hasCashier()||!state.shift.cashier)throw Error('Cần ca thu ngân để xử lý thanh toán.');const o=order(id);if(!o)throw Error('Không tìm thấy đơn trong rạp đang làm việc.');const t=state.transactions.filter(x=>x.orderId===id).at(-1);if(!t)throw Error('Không có giao dịch.');if(t.status==='success')return o;if(!['pending','unknown'].includes(t.status))throw Error('Giao dịch đã có kết quả cuối cùng. Không thể xác nhận lại.');if(!['success','failed','expired','unknown'].includes(result))throw Error('Kết quả không hợp lệ.');if(t.status==='unknown'&&result!=='success'&&result!=='failed')throw Error('Cần tra cứu kết quả xác thực trước khi đổi trạng thái.');
    t.status=result;t.updatedAt=now();o.payment=result==='success'?'paid':result;o.status=result==='success'?'confirmed':result==='expired'?'cancelled':'pending';
    if(result==='success'){
      o.seatLines.forEach((l,i)=>{if(!state.tickets.some(x=>x.orderId===id&&x.seat===l.seat))state.tickets.push({id:'VE-'+id.slice(3)+'-'+(i+1),orderId:id,...l,cinemaId:state.cinema.id,status:'valid',checkedAt:null,checkedBy:null});});
      if(state.draft.paymentOrder===id)clearDraft();
    }else if(['failed','expired'].includes(result)&&state.draft.paymentOrder===id){state.draft.paymentOrder=null;state.draft.holdUntil=state.draft.seats.length?now()+300000:null;}
    audit('Kết quả thanh toán: '+({success:'Thành công',failed:'Thất bại',expired:'Hết hạn',unknown:'Chưa xác định'}[result]),o);save();return o;
  }
  function retry(id){requireOpen();const o=order(id);if(!o||!['failed','expired'].includes(o.payment))throw Error('Chỉ thử lại giao dịch đã xác định thất bại hoặc hết hạn.');if(o.payment==='expired')throw Error('Đơn hết hạn đã giải phóng chỗ. Tạo đơn mới để kiểm tra lại ghế.');o.seatLines.forEach(l=>{if(seatStatus(show(l.showId),l.seat)!=='free')throw Error('Ghế không còn trống. Tạo đơn mới.');});if(state.draft.paymentOrder&&state.draft.paymentOrder!==id)throw Error('Xử lý đơn đang thanh toán trước.');const old=state.transactions.filter(x=>x.orderId===id).at(-1);const count=old.attempt+1;state.transactions.push({...old,id:old.id+'-L'+count,status:'pending',attempt:count,at:now()});o.payment='pending';state.draft={showId:o.seatLines[0]?.showId||null,seats:JSON.parse(JSON.stringify(o.seatLines)),products:JSON.parse(JSON.stringify(o.products)),customer:o.contact?{name:o.customer,phone:o.contact}:null,promo:o.discount?'LUMI10':'',holdUntil:null,paymentOrder:id};audit('Thử thanh toán lại, lần '+count,o);save();return o;}
  function inspectTicket(code){const t=state.tickets.find(x=>x.id===code.trim().toUpperCase());if(!t)return{status:'missing',label:'Không tìm thấy vé',message:'Kiểm tra lại mã vé, không dùng mã đơn hoặc mã thanh toán.'};const s=show(t.showId);const o=state.orders.find(x=>x.id===t.orderId);let result={ticket:t,show:s,order:o};if(t.cinemaId!==state.cinema.id)return{...result,status:'wrong',label:'Vé thuộc rạp khác',message:'Vé này thuộc Lumi Riverside. Hướng dẫn khách đến đúng cụm rạp.'};if(t.status==='used')return{...result,status:'used',label:'Vé đã được sử dụng',message:'Đã vào rạp lúc '+stamp(t.checkedAt)+' · '+t.checkedBy+'. Không xác nhận thêm.'};if(t.status==='cancelled')return{...result,status:'cancelled',label:'Vé đã hủy',message:'Không cho phép vào phòng. Liên hệ trưởng ca để kiểm tra.'};if(o.payment!=='paid')return{...result,status:'unpaid',label:'Chưa xác nhận thanh toán',message:'Chuyển khách về quầy tra cứu thanh toán.'};if(now()<s.start-3600000||now()>s.start+1800000)return{...result,status:'time',label:'Không đúng thời điểm',message:'Cho phép vào từ 60 phút trước đến 30 phút sau giờ chiếu.'};return{...result,status:'valid',label:'Vé hợp lệ',message:'Kiểm tra số người và phòng chiếu trước khi xác nhận.'};}
  function checkIn(code){requireOpen();if(!can('scan'))throw Error('Bạn không có quyền soát vé.');const r=inspectTicket(code);if(r.status!=='valid')throw Error(r.label+'. '+r.message);r.ticket.status='used';r.ticket.checkedAt=now();r.ticket.checkedBy=state.staff.name;audit('Soát vé '+r.ticket.id+' · ghế '+r.ticket.seat,r.order);save();return r.ticket;}
  function deliver(id,amounts,expectedVersion){requireOpen();if(!can('fulfillment'))throw Error('Bạn không có quyền giao sản phẩm.');const o=order(id);if(!o||o.payment!=='paid')throw Error('Chỉ giao sản phẩm khi đã xác nhận thanh toán.');if(o.foodStatus!=='ready')throw Error('Đơn chưa sẵn sàng hoặc đã giao xong.');if(expectedVersion!==undefined&&Number(expectedVersion)!==(o.deliveryVersion||0))throw Error('Đơn đã được cập nhật giao nhận. Mở lại đơn trước khi xác nhận.');let total=0;for(const p of o.products){const n=Number(amounts[p.key]||0);if(!Number.isInteger(n)||n<0||n>p.qty-p.delivered)throw Error('Số lượng giao không hợp lệ. Kiểm tra số lượng còn lại.');total+=n;}if(!total)throw Error('Chọn ít nhất một sản phẩm để giao.');for(const p of o.products)p.delivered+=Number(amounts[p.key]||0);o.deliveryVersion=(o.deliveryVersion||0)+1;if(o.products.every(p=>p.delivered===p.qty))o.foodStatus='delivered';audit('Giao '+total+' sản phẩm'+(o.foodStatus==='delivered'?' · hoàn tất':' · giao một phần'),o);save();}
  function stats(){const trans=state.transactions.filter(t=>t.shiftId===state.shift.id&&order(t.orderId)?.source==='counter');const successful=trans.filter(t=>t.status==='success');const orders=state.orders.filter(o=>o.shiftId===state.shift.id&&o.source==='counter'&&o.payment==='paid'&&o.cinemaId===state.cinema.id);const revenue=successful.reduce((n,t)=>n+t.amount,0);const ticketGross=orders.reduce((n,o)=>n+o.seatLines.reduce((v,l)=>v+l.price,0),0);const foodGross=orders.reduce((n,o)=>n+o.products.reduce((v,l)=>v+l.price*l.qty,0),0);const discounts=orders.reduce((n,o)=>n+o.discount,0);return{count:successful.length,ticketCount:orders.reduce((n,o)=>n+o.seatLines.reduce((v,l)=>v+l.people,0),0),tickets:ticketGross,food:foodGross,discounts,revenue,cash:successful.filter(t=>t.method==='cash').reduce((n,t)=>n+t.amount,0),card:successful.filter(t=>t.method==='card').reduce((n,t)=>n+t.amount,0),qr:successful.filter(t=>t.method==='qr').reduce((n,t)=>n+t.amount,0),unknown:trans.filter(t=>['unknown','pending'].includes(t.status)),expected:state.shift.opening+successful.filter(t=>t.method==='cash').reduce((n,t)=>n+t.amount,0)};}
  function closeShift(counted,note,handover){requireOpen();if(state.shift.cashier&&!hasCashier())throw Error('Ca có nghiệp vụ thu ngân. Chuyển vai trò thu ngân để kiểm đếm và kết ca.');const st=stats();if(state.shift.cashier&&(!Number.isFinite(counted)||counted<0))throw Error('Nhập số tiền kiểm đếm thực tế hợp lệ.');if(state.shift.cashier&&counted!==st.expected&&!note.trim())throw Error('Có chênh lệch tiền mặt. Vui lòng nhập giải thích.');if(st.unknown.length&&!handover.trim())throw Error('Có giao dịch chưa rõ kết quả. Nhập nội dung bàn giao trước khi kết ca.');state.shift={...state.shift,status:'closed',end:now(),counted:state.shift.cashier?counted:null,note,handover,report:st,cashier:state.shift.cashier};clearDraft();audit('Kết ca '+state.shift.id);save();}
  const api={ZONE,KEY,roles,movies,products,roomDefs,audience,money,stamp,seed,save,now,can,hasCashier,requireOpen,audit,show,movie,room,order,tx,showStatus,seats,seatStatus,remaining,fare,availableTypes,draftTotals,clearDraft,expireHold,chooseSeat,addProduct,promo,createPayment,settle,retry,inspectTicket,checkIn,deliver,stats,closeShift,get state(){return state;},get storageOK(){return storageOK;},reset(){state=seed();save();}};
  global.Lumi=api;
})(typeof window!=='undefined'?window:globalThis);
