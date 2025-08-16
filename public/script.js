const upload = document.querySelector('.upload');
const choose = document.getElementById('choose');
const files = document.querySelector('.files');
const list = document.querySelector('.list');

let uploaded = [];

const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
document.head.appendChild(script);

const awaitScript = () => {
    return new Promise((res) => {
        const check = () => {
            if (typeof CryptoJS !== 'undefined') {
                res();
            } else {
                setTimeout(check, 100);
            }
        };

        check();
    });
};

const encrypt = async (file, password) => {
    try {
        await awaitScript();

        const base64 = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => {
                const split = reader.result.split(',')[1];
                res(split);
            };

            reader.onerror = rej;
            reader.readAsDataURL(file);
        });

        const salt = CryptoJS.lib.WordArray.random(128 / 8);
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 });

        const encrypted = CryptoJS.AES.encrypt(base64, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const combined = salt.toString() + ':' + iv.toString() + ':' + encrypted.toString();
        const combinedBytes = new TextEncoder().encode(combined);

        return new Blob([combinedBytes], {
            type: 'application/octet-stream'
        });

    } catch (e) {
        console.error('failed to encrypt:', e);
        throw e;
    }
};

const decrypt = async (buffer, password) => {
    try {
        await awaitScript();

        const decoded = new TextDecoder().decode(buffer);
        const parts = decoded.split(':');
        if (parts.length !== 3)
            throw new Error('invalid encrypted file format');

        const salt = CryptoJS.enc.Hex.parse(parts[0]);
        const iv = CryptoJS.enc.Hex.parse(parts[1]);
        const encrypted = parts[2];

        const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 });

        const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) throw new Error('invalid password');

        const final = atob(decryptedText);
        const len = final.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = final.charCodeAt(i);
        }

        return new Blob([bytes]);
    } catch (e) {
        console.error('failed to decrypt:', e);
        throw e;
    }
};

const download = async (file) => {
    const password = prompt('password to decrypt file:');
    if (!password) return;

    try {
        const res = await fetch(`/download/${file}`);
        if (!res.ok) throw new Error('failed to download');

        const buffer = await res.arrayBuffer();
        const name = file.replace(/\.enc$/, '').replace(/_\d+/, '');

        const decrypted = await decrypt(buffer, password);
        const url = URL.createObjectURL(decrypted);

        const a = document.createElement('a');
        a.href = url;
        a.download = name;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('faild to decrypt:', e);
    }
};

choose.addEventListener('change', (e) => {
    uploaded.push(...e.target.files);
    update();
});

upload.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (uploaded.length === 0)
        return;

    const password = prompt('password to encrypt files:');
    if (!password) return;

    try {
        const data = new FormData();
        for (let i = 0; i < uploaded.length; i++) {
            const file = uploaded[i];
            const blob = await encrypt(file, password);

            const newFile = new File([blob], file.name + '.enc', {
                type: 'application/octet-stream'
            });

            data.append('files', newFile);
        }

        const res = await fetch('/upload', { method: 'POST', body: data });
        if (!res.ok) throw new Error('failed to upload');

        uploaded = [];
        choose.value = '';
        update();
        get();
    } catch (e) {
        alert('failed to upload: ' + e);
    }
});

const update = () => {
    files.innerHTML = '';

    uploaded.forEach((file, idx) => {
        const selected = document.createElement('div');
        selected.className = 'file-itself unfetched';

        const content = document.createElement('div');
        content.className = 'file-content';

        const isImg = /\.(jpg|jpeg|png|webp)$/i.test(file.name);
        const isVid = /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);

        if (isImg || isVid) {
            const preview = document.createElement(isImg ? 'img' : 'video');
            preview.src = URL.createObjectURL(file);

            if (isVid) {
                preview.muted = true;
                preview.preload = 'metadata';
            }

            content.appendChild(preview);
        }

        const name = document.createElement('span');
        name.textContent = file.name;
        content.appendChild(name);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-delete';
        removeBtn.textContent = 'X';
        removeBtn.onclick = () => {
            uploaded.splice(idx, 1);
            update();
        };

        selected.appendChild(content);
        selected.appendChild(removeBtn);
        files.appendChild(selected);
    });
};

const get = async () => {
    const res = await fetch('/files');
    const json = await res.json();

    list.innerHTML = '';

    json.forEach(file => {
        const cntr = document.createElement('div');
        cntr.className = 'file-item fetched';

        const encrypted = file.endsWith('.enc');
        if (!encrypted && /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
            const img = document.createElement('img');
            img.src = '/uploads/' + file;
            cntr.appendChild(img);
        }

        const name = document.createElement('a');
        name.className = 'file-name';
        name.textContent = file.replace(/\.enc$/, '').replace(/_\d+/, '');

        if (encrypted) {
            name.href = '#';
            name.style.cursor = 'pointer';
            name.onclick = (e) => {
                e.preventDefault();
                download(file);
            };
        } else {
            name.href = '/uploads/' + file;
            name.download = file;
        }

        name.style.color = '#ffffffff';
        name.style.textDecoration = 'none';
        cntr.appendChild(name);

        list.appendChild(cntr);
    });
};

get();
