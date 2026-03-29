const PERIODS = [
    { key: 'morning', label: '아침 자습', time: '08:00~08:50' },
    { key: 'lunch', label: '점심 자습', time: '13:00~13:50' },
    { key: 'evening', label: '야간 자습', time: '18:00~21:00' }
];

const LAYOUT = [
    { id: '01', seats: [1, 2, 3, 4, 5] },
    { id: '02', seats: [6, 7, 8, 9, 10] },
    { id: '03', seats: [11, 12, 13, 14, 15] },
    { id: '04', seats: [16, 17, 18, 19, 20] },
    { id: '05', seats: [21, 22, 23, 24, 25] },
    { id: '06', seats: [26, 27, 28, 29, 30] }
];

let reservations = JSON.parse(localStorage.getItem('study_room_res')) || []; 
let selPeriod = null;
let selSeatNum = null;

// 초기화
function init() { renderSlots(); }

// 로컬 저장소 저장
function saveToLocal() { localStorage.setItem('study_room_res', JSON.stringify(reservations)); }

// 시간대 버튼 생성
let isTestMode = false; // 기본은 제한 상태

function toggleTestMode() {
    isTestMode = !isTestMode;
    const btn = document.getElementById('admin-toggle');
    
    if (isTestMode) {
        btn.innerText = "ON";
        btn.classList.add('is-on'); // CSS 클래스 추가
        alert("테스트 모드: 시간 제한이 해제되었습니다.");
    } else {
        btn.innerText = "OFF";
        btn.classList.remove('is-on'); // CSS 클래스 제거
        alert("일반 모드: 시간 제한이 적용됩니다.");
    }
}

function renderSlots() {
    const el = document.getElementById('slot-list');
    if (!el) return;
    el.innerHTML = '';

    PERIODS.forEach(p => {
        const btn = document.createElement('div');
        btn.className = `slot-btn ${selPeriod?.key === p.key ? 'active' : ''}`;
        btn.innerHTML = `<strong>${p.label}</strong> (${p.time})`;

        btn.onclick = () => {
            const now = new Date();
            const currentHour = now.getHours();

            // 테스트 모드가 아닐 때만 시간 체크
            if (!isTestMode) {
                // 오전 9시 ~ 밤 12시 사이 차단
                if (currentHour >= 9 && currentHour < 24) {
                    alert("현재는 예약할 수 없는 시간입니다. (00:00 - 8:59 예약 가능)");
                    return; 
                }
            }

            selPeriod = p; 
            renderSlots();
        };

        el.appendChild(btn);
    });
}

// 좌석 선택 단계로 이동
function toStep2() {
    const name = document.getElementById('user-name').value.trim();
    const sid = document.getElementById('user-id').value.trim();
    if(!/^[가-힣]+$/.test(name)) return alert("이름은 한글로만 입력해주세요.");
    if(!sid || isNaN(sid)) return alert("학번은 숫자로만 입력해주세요.");
    if(!selPeriod) return alert("시간대를 선택해주세요.");

    if(reservations.find(r => r.sid === sid && r.name === name && r.period === selPeriod.key)) {
        return alert("이미 해당 시간대에 예약 내역이 있습니다.");
    }

    showView('step2');
    renderMap();
}

// 좌석 맵 그리기
function renderMap() {
    const map = document.getElementById('seat-map');
    map.innerHTML = '';
    LAYOUT.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row-group';
        rowDiv.innerHTML = `<div class="row-num">${row.id}</div><div class="thick-wall"></div>`;

        row.seats.forEach(num => {
            const unit = document.createElement('div');
            unit.className = 'seat-unit';
            const isTaken = reservations.find(r => r.period === selPeriod.key && r.seat === num);
            const btn = document.createElement('button');
            btn.className = `seat ${isTaken ? 'occupied' : ''} ${selSeatNum === num ? 'selected' : ''}`;
            btn.innerText = num;
            btn.onclick = () => { if(!isTaken) { selSeatNum = num; renderMap(); }};
            unit.appendChild(btn);
            unit.appendChild(Object.assign(document.createElement('div'), {className: 'partition'}));
            rowDiv.appendChild(unit);
        });
        map.appendChild(rowDiv);
    });
}

// 예약 실행
function handleReserve() {
    if(!selSeatNum) return alert("좌석을 선택해주세요.");
    if(confirm(`${selPeriod.label} - ${selSeatNum}번 좌석으로 예약하시겠습니까?`)) {
        const name = document.getElementById('user-name').value;
        const sid = document.getElementById('user-id').value;
        reservations.push({ name, sid, period: selPeriod.key, periodLabel: selPeriod.label, seat: selSeatNum, id: Date.now() });
        saveToLocal();
        alert("예약이 완료되었습니다.");
        document.getElementById('auth-name').value = name;
        document.getElementById('auth-id').value = sid;
        checkMyReservation(); 
    }
}

// 화면 전환 함수
function showView(v) {
    ['view-step1', 'view-step2', 'view-auth', 'view-my-list'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.getElementById('tab-book').classList.toggle('active', v.startsWith('step'));
    document.getElementById('tab-my').classList.toggle('active', v === 'auth' || v === 'my-list');
}

// 홈으로 가기 (초기화)
function goToHome() { selPeriod = null; selSeatNum = null; renderSlots(); showView('step1'); }

// 내 예약 확인 로직
function checkMyReservation() {
    const name = document.getElementById('auth-name').value.trim();
    const sid = document.getElementById('auth-id').value.trim();
    if(!name || !sid) return alert("정보를 입력해주세요.");
    const myRes = reservations.filter(r => r.name === name && r.sid === sid);
    showView('my-list');
    document.getElementById('my-title').innerText = `${name}님의 예약 내역`;
    const container = document.getElementById('my-contents');
    container.innerHTML = myRes.length ? myRes.map(r => `
        <div class="res-card">
            <span><strong>${r.periodLabel}</strong> : ${r.seat}번</span>
            <button onclick="cancelRes(${r.id})" style="padding:8px 12px; background:var(--danger); color:white; border:none; border-radius:6px; cursor:pointer;">취소</button>
        </div>
    `).join('') : '<p style="text-align:center; padding:30px; color:#999;">내역이 없습니다.</p>';
}

// 예약 취소
function cancelRes(id) {
    if(confirm("정말로 예약을 취소하시겠습니까?")) {
        reservations = reservations.filter(r => r.id !== id);
        saveToLocal(); checkMyReservation();
    }
}

init();