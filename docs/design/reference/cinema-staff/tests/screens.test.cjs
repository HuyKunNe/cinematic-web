/** Kiểm tra kết xuất template và điều hướng không cần trình duyệt. Không thay thế QA trực quan. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..');
function node(){return{innerHTML:'',textContent:'',className:'',open:false,value:'',tagName:'BODY',addEventListener(){},focus(){},querySelector(){return null;},showModal(){this.open=true;},close(){this.open=false;},setSelectionRange(){}};}
const nodes={'#app':node(),'#modal':node(),'#toast':node(),'#print-root':node(),'#payment-result':node()};
const listeners={};const storage={};
const context={Intl,Date,console,URLSearchParams,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,document:{activeElement:node(),querySelector:q=>nodes[q]||null,addEventListener:(k,fn)=>listeners[k]=fn},location:{hash:'#/dashboard'},history:{replaceState(){}},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},scrollTo(){},print(){},addEventListener:(k,fn)=>listeners['window:'+k]=fn};
context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base,'assets/js/data.js'),'utf8'),context);
const code=fs.readFileSync(path.join(base,'assets/js/app.js'),'utf8').replace(/\}\)\(\);\s*$/, 'window.TestApp={render,actions,view,printOrder,printShift,selectShow,paymentDialog};})();');
vm.runInContext(code,context);
const D=context.Lumi,A=context.TestApp;
assert.match(nodes['#app'].innerHTML,/Sẵn sàng cho ca mới/);
D.state.session=true;
let n=0;const pages=['dashboard','sell','sell?step=seats','sell?step=food','food','orders','orders/DH-1001','orders/DH-1005','orders/DH-1007','orders/NOT-FOUND','transactions/GD-1001','transactions/NO','receipt/DH-1001','receipt/DH-1005','checkout','scan','fulfillment','fulfillment/DH-1002','rooms','shift','account','unknown'];
const out=process.env.LUMI_QA_OUTPUT||path.join(require('node:os').tmpdir(),'lumi-cinema-qa-html');fs.mkdirSync(out,{recursive:true});
for(const role of Object.keys(D.roles)){
 D.state.role=role;
 for(const page of pages){context.location.hash='#/'+page;A.render();const html=nodes['#app'].innerHTML;assert.ok(html.length>500,role+' '+page);assert.equal(/\bundefined\b|\bNaN\b/.test(html),false,role+' '+page);if(role==='manager')fs.writeFileSync(path.join(out,page.replace(/[/?=]/g,'_')+'.html'),html);n++;}
}
D.state.role='manager';D.state.draft.showId='s1';D.chooseSeat('B2');
for(const page of ['sell?step=seats','checkout','food']){context.location.hash='#/'+page;A.render();assert.match(nodes['#app'].innerHTML,/85\.000đ/);fs.writeFileSync(path.join(out,page.replace(/[/?=]/g,'_')+'-populated.html'),nodes['#app'].innerHTML);}
const o=D.createPayment('qr');assert.equal(o.payment,'pending');A.paymentDialog(o.id);assert.ok(nodes['#modal'].open);assert.match(nodes['#modal'].innerHTML,/không kết nối ngân hàng/);A.actions.lock();assert.equal(nodes['#modal'].open,false);assert.match(nodes['#app'].innerHTML,/Tiếp tục ca làm việc/);D.state.locked=false;
D.settle(o.id,'success');const ticketsBefore=JSON.stringify(D.state.tickets);A.printOrder(o.id,'tickets');A.printOrder(o.id,'tickets');assert.equal(JSON.stringify(D.state.tickets),ticketsBefore);assert.equal(o.logs.filter(l=>l.text.startsWith('In ')).length,2);assert.match(o.logs.at(-1).text,/In lại/);
for(const status of ['pending','closed']){D.state.shift.status=status;if(status==='closed'){D.state.shift.report=D.stats();D.state.shift.end=D.now();D.state.shift.counted=D.stats().expected;}context.location.hash='#/shift';A.render();assert.ok(nodes['#app'].innerHTML.length>1000);fs.writeFileSync(path.join(out,'shift-'+status+'.html'),nodes['#app'].innerHTML);}
D.state.shift.status='open';D.state.shift.cashier=false;D.state.role='usher';context.location.hash='#/shift';A.render();assert.match(nodes['#app'].innerHTML,/Xác nhận bàn giao/);assert.doesNotMatch(nodes['#app'].innerHTML,/Tổng thu trong ca/);fs.writeFileSync(path.join(out,'shift-usher.html'),nodes['#app'].innerHTML);
D.state.role='food';context.location.hash='#/dashboard';A.render();assert.doesNotMatch(nodes['#app'].innerHTML,/href="#\/rooms"/);
console.log(`${n} tổ hợp màn hình / vai trò và các trạng thái quan trọng đã kết xuất thành công.`);
console.log('Đạt kiểm tra: đăng nhập/khóa, hộp thoại thanh toán, in lại không đổi trạng thái vé, ca phi thu ngân.');
