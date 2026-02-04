const fileInput = document.querySelector('.file-input');
const uploadFiles = document.querySelector('.upload-files');
const addFiles = document.querySelector('.add-files');

const queueContent = document.querySelector('.queue-content');

const uploadOverlay = document.querySelector('.upload-overlay');
const uploadList = document.querySelector('.upload-files-list');

const cancel = document.querySelector('.cancel');
const confirmm = document.querySelector('.confirm');

const password = document.querySelector('.password');
const encryptNames = document.querySelector('.encrypt-names');

const queue = [];
const uploaded = [];
const groups = [];

const updateUploadButton = () => {
    uploadFiles.disabled = queue.length === 0;
};

const escapeHMTL = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const formatSize = (size) => {
    if (size === 0) {
        return '0 B';
    }

    const ib = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(ib));

    return Math.round(size / Math.pow(ib, i) * 100) / 100 + ' ' + sizes[i];
};

const updateName = (id, name) => {
    const data = queue.find((data) => data.id === id);
    if (!data) {
        return;
    }

    const theName = name.trim();
    if (theName && theName !== data.name) {
        data.name = theName;
    }

    refreshQueueUI();
};

const selectAllText = (id) => {
    const element = document.getElementById(`filename-${id}`);
    if (!element) {
        return;
    }

    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
};

const deleteFile = (id) => {
    const index = queue.findIndex((data) => data.id === id);
    if (index === -1) {
        return;
    }

    queue.splice(index, 1);

    refreshQueueUI();
    updateUploadButton();
};

const getKey = async (key) => {
    return crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
};

const encrypt = async (data, key) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyHash = await argon2.hash({
        pass: key,
        salt: salt,
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 1,
        type: argon2.ArgonType.Argon2id
    });

    const key = await getKey(keyHash.hash);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data instanceof Uint8Array
            ? data
            : new Uint8Array(data)
    );

    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return result.buffer;
};

const decrypt = async (data, key) => {
    const bytes = data instanceof Uint8Array
        ? data
        : new Uint8Array(data);

    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const encrypted = bytes.slice(28);

    const keyHash = await argon2.hash({
        pass: key,
        salt: salt,
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 1,
        type: argon2.ArgonType.Argon2id
    });

    const key = await getKey(keyHash.hash);

    return crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    );
};

const refreshQueueUI = () => {
    if (queue.length === 0) {
        queueContent.innerHTML = '<div class="empty">No files in queue.</div>';
        return;
    }

    queueContent.innerHTML = queue.map((data) => {
        let thumb = '';
        if (data.thumb) {
            thumb = `<img src="${data.thumb}" class="content-file-thumbnail" alt="${escapeHMTL(data.name)}">`;
        } else {
            thumb = `<div class="content-file-icon"><img src="assets/file.svg" width="24" height="24" alt="${escapeHMTL(data.name)}"></div>`;
        }

        return `
            <div class="content-files">
                ${thumb}
                <div class="content-file-info">
                    <div class="content-file-name" id="filename-${data.id}" contenteditable="true" onblur="updateName(${data.id}, this.textContent)" onkeydown="if (event.key === 'Enter') { event.preventDefault(); this.blur(); }">${escapeHMTL(data.name)}</div>
                    <div class="content-file-size">${formatSize(data.size)}</div>
                </div>

                <div class="content-file-actions">
                    <button class="file-button rename" onclick="selectAllText(${data.id})">
                        <img src="assets/edit.svg" width="24" height="24" alt="rename">
                    </button>

                    <button class="file-button delete" onclick="deleteFile(${data.id})">
                        <img src="assets/delete.svg" width="24" height="24" alt="delete">
                    </button>
                </div>
            </div>
        `
    }).join('');
};

const setImageThumb = (file, data) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        data.thumb = e.target.result;
        refreshQueueUI();
    };

    reader.readAsDataURL(file);
};

const setVideoThumb = (file, data) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
        video.currentTime = 1;
    };

    video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        data.thumb = canvas.toDataURL();

        refreshQueueUI();
        URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
};

addFiles.addEventListener('click', () => {
    fileInput.click();
});

uploadFiles.addEventListener('click', (e) => {
    if (queue.length === 0) {
        return;
    }

    uploadList.innerHTML = queue.map((data) => `
        <div class="upload-list-file">${escapeHMTL(data.name)}</div>
    `).join('');

    uploadOverlay.classList.remove('hidden');
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
        const theFile = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            thumbnail: null
        };

        if (file.type.startsWith('image/')) {
            setImageThumb(file, theFile);
        } else if (file.type.startsWith('video/')) {
            setVideoThumb(file, theFile);
        }

        queue.push(theFile);
    });

    refreshQueueUI();
    updateUploadButton();

    e.target.value = '';
});

cancel.addEventListener('click', () => {
    uploadOverlay.classList.add('hidden');

    password.value = '';
    encryptNames.checked = false;
});

confirmm.addEventListener('click', async () => {
    confirmm.disabled = true;
    confirmm.textContent = 'Uploading...';
    confirmm.style.cursor = 'not-allowed';

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const hashedPassword = await argon2.hash({
        pass: password.value,
        salt: salt,
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 1,
        type: argon2.ArgonType.Argon2id
    });

    const usedPassword = [...salt].map((byte) => byte.toString(16).padStart(2, '0')).join('') + hashedPassword.hashHex;
    console.log(usedPassword);

    const group = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        password: usedPassword,
        encNames: encryptNames.checked,
        files: []
    };

    [...queue].forEach((data) => {
        if (encryptNames.checked) {
            data.name = btoa(data.name)
        } else {
            data.name = data.name;
        }

        groups.push(group);
    });

    // uuhhh encrypt i think
    // reload things
});