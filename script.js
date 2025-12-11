// script.js
// ==========================================
// 【設定】GASのデプロイURLをここに貼り付けてください
const GAS_URL = "https://script.google.com/macros/s/AKfycbyJlP544cdQa387ZslSB0i2TnPAZ8Xs6h7NpxLlTbVEsSAu3vv7VwDYbA8tLsOgjCX9/exec"; 
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------
    // 0. テーマ切り替え機能 (全ページ共通)
    // ------------------------------------------
    setupThemeToggle();

    const pageId = document.body.id;

    // ------------------------------------------
    // 1. お問い合わせ送信ページ (contact.html)
    // ------------------------------------------
    if (pageId === 'page-contact') {
        const categorySelect = document.getElementById('category');
        const toolArea = document.getElementById('tool_area');
        const envArea = document.getElementById('env_area');
        const form = document.getElementById('contact-form');

        // カテゴリ変更時の表示切り替え
        categorySelect.addEventListener('change', () => {
            const val = categorySelect.value;
            
            // ツール選択を表示するカテゴリ
            if (["不具合報告", "使い方等の質問", "機能リクエスト"].includes(val)) {
                toolArea.classList.remove('hidden');
            } else {
                toolArea.classList.add('hidden');
            }

            // 環境情報を表示するカテゴリ
            if (val === "不具合報告") {
                envArea.classList.remove('hidden');
            } else {
                envArea.classList.add('hidden');
            }
        });

        // 送信処理
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            changeBtnState(submitBtn, true, "送信中...");

            const formData = {
                action: "create",
                category: document.getElementById('category').value,
                tool: document.getElementById('tool_name').value,
                name: document.getElementById('user_name').value,
                content: document.getElementById('content').value,
                env: getRadioVal('os') + ' / ' + getRadioVal('browser')
            };

            const result = await postData(formData);
            if (result.success) {
                document.getElementById('form-container').classList.add('hidden');
                document.getElementById('result-container').classList.remove('hidden');
                document.getElementById('new-id').textContent = result.id;
                document.getElementById('new-pass').textContent = result.pass;
            } else {
                alert("送信エラー: " + result.message);
                changeBtnState(submitBtn, false, "送信する");
            }
        });
    }

    // ------------------------------------------
    // 2. ユーザー確認ページ (status.html)
    // ------------------------------------------
    if (pageId === 'page-status') {
        const loginForm = document.getElementById('login-form');
        let currentId = "";
        let currentPass = "";

        // ログイン（ステータス確認）
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            changeBtnState(btn, true, "確認中...");

            currentId = document.getElementById('query_id').value.trim();
            currentPass = document.getElementById('query_pass').value.trim();

            const result = await postData({
                action: "check_status",
                id: currentId,
                pass: currentPass
            });

            if (result.success && result.data) {
                // 画面表示
                document.getElementById('login-container').classList.add('hidden');
                document.getElementById('status-container').classList.remove('hidden');

                const d = result.data;
                document.getElementById('disp_time').textContent = formatDate(d.timestamp);
                document.getElementById('disp_category').textContent = d.category;
                document.getElementById('disp_content').textContent = d.content;
                
                // ステータスバッジ
                const badge = document.getElementById('status_badge');
                badge.textContent = d.status;
                badge.className = 'status-badge status-' + d.status;

                // 管理者返信
                const adminArea = document.getElementById('admin_reply_area');
                if (d.adminReply) {
                    adminArea.innerHTML = d.adminReply.replace(/\n/g, '<br>'); // 改行対応
                    adminArea.classList.remove('hidden');
                    document.getElementById('no_reply_msg').classList.add('hidden');
                } else {
                    adminArea.classList.add('hidden');
                    document.getElementById('no_reply_msg').classList.remove('hidden');
                }

                // ユーザー追記履歴
                if (d.userReply) {
                    document.getElementById('user_reply_history').textContent = "【あなたの追記】\n" + d.userReply;
                }
            } else {
                alert(result.message || "IDまたはパスワードが違います");
            }
            changeBtnState(btn, false, "確認する");
        });

        // 追記送信
        document.getElementById('reply-btn').addEventListener('click', async () => {
            const content = document.getElementById('reply_content').value;
            if (!content) return;

            const btn = document.getElementById('reply-btn');
            changeBtnState(btn, true, "送信中...");

            const result = await postData({
                action: "user_reply",
                id: currentId,
                pass: currentPass,
                reply: content
            });

            if (result.success) {
                alert("追記を送信しました。");
                location.reload(); // 再読み込みして反映
            } else {
                alert("エラー: " + result.message);
                changeBtnState(btn, false, "追記を送信");
            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    // ------------------------------------------
    // 3. 管理者ページ (admin.html)
    // ------------------------------------------
    if (pageId === 'page-admin') {
        let adminPass = "";

        const loadData = async () => {
            adminPass = document.getElementById('admin_pass').value;
            const btn = document.getElementById('admin-login-btn');
            changeBtnState(btn, true, "取得中...");

            const result = await postData({
                action: "admin_get_all",
                admin_pass: adminPass
            });

            if (result.success) {
                document.getElementById('admin-login-container').classList.add('hidden');
                document.getElementById('dashboard-container').classList.remove('hidden');
                renderList(result.list);
            } else {
                alert(result.message);
            }
            changeBtnState(btn, false, "データ取得");
        };

        document.getElementById('admin-login-btn').addEventListener('click', loadData);
        document.getElementById('reload-btn').addEventListener('click', loadData);

        function renderList(list) {
            const container = document.getElementById('message-list');
            container.innerHTML = "";

            list.forEach(item => {
                const div = document.createElement('div');
                div.className = "card message-item";
                div.innerHTML = `
                    <div style="margin-bottom:10px;">
                        <span class="status-badge status-${item.status}">${item.status}</span>
                        <small>${formatDate(item.timestamp)}</small>
                        <strong>[${item.category}]</strong> ${item.tool ? '('+item.tool+')' : ''}
                    </div>
                    <div style="background:var(--input-bg); padding:10px; margin-bottom:10px; white-space:pre-wrap; border:1px solid var(--border-color);">${escapeHtml(item.content)}</div>
                    ${item.env ? '<div style="font-size:0.8em; color:#888;">端末: ' + item.env + '</div>' : ''}
                    <div style="font-size:0.8em; color:#aaa; margin-top:5px;">User: ${escapeHtml(item.name)} (ID: ${item.id})</div>
                    
                    ${item.userReply ? '<div style="margin-top:10px; border-top:1px dashed #555; padding-top:5px; color:var(--text-color); white-space: pre-wrap;"><strong>ユーザー追記:</strong><br>' + escapeHtml(item.userReply) + '</div>' : ''}

                    <hr style="border-color:var(--border-color); margin:15px 0;">
                    
                    <label>ステータス更新</label>
                    <select id="status-${item.rowIndex}" style="margin-bottom:10px; width:auto; padding:5px;">
                        <option value="未対応" ${item.status==='未対応'?'selected':''}>未対応</option>
                        <option value="確認中" ${item.status==='確認中'?'selected':''}>確認中</option>
                        <option value="対応完了" ${item.status==='対応完了'?'selected':''}>対応完了</option>
                    </select>
                    
                    <label>返信内容 (HTML可)</label>
                    <textarea id="reply-${item.rowIndex}" style="height:80px;">${item.adminReply || ""}</textarea>
                    
                    <button onclick="updateTicket(${item.rowIndex})" class="btn" style="padding:8px; font-size:14px;">更新・返信</button>
                `;
                container.appendChild(div);
            });
        }

        window.updateTicket = async (rowIndex) => {
            const newStatus = document.getElementById(`status-${rowIndex}`).value;
            const newReply = document.getElementById(`reply-${rowIndex}`).value;
            
            if(!confirm("この内容で更新・送信しますか？")) return;

            const result = await postData({
                action: "admin_update",
                admin_pass: adminPass,
                rowIndex: rowIndex,
                status: newStatus,
                reply: newReply
            });

            if(result.success) {
                alert("更新しました");
                loadData();
            } else {
                alert("エラー: " + result.message);
            }
        };
    }
});

// ------------------------------------------
// 共通機能
// ------------------------------------------

// テーマ切り替え (自動挿入)
function setupThemeToggle() {
    // ボタンを作成して挿入
    const container = document.querySelector('.container');
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.innerHTML = '🌙'; // 初期アイコン
    container.insertBefore(btn, container.firstChild);

    // 保存されたテーマを適用
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        btn.innerHTML = '☀️';
    }

    // クリックイベント
    btn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        btn.innerHTML = isLight ? '☀️' : '🌙';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}

// GASへのPOST通信
async function postData(data) {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (err) {
        return { success: false, message: err.toString() };
    }
}

// ボタンの状態切り替え
function changeBtnState(btn, isDisabled, text) {
    if(!btn) return;
    btn.disabled = isDisabled;
    btn.textContent = text;
}

// ラジオボタン値取得
function getRadioVal(name) {
    const radios = document.getElementsByName(name);
    for (const r of radios) {
        if (r.checked) return r.value;
    }
    return "";
}

// 日付フォーマット
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP');
}

// HTMLエスケープ
function escapeHtml(str) {
    if(!str) return "";
    return str.replace(/[&<>"']/g, function(match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
}