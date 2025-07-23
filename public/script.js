const upload = document.querySelector('.upload');
const choose = document.getElementById('choose');
const files = document.querySelector('.files');
const list = document.querySelector('.list');

let uploaded = [];

choose.addEventListener('change', (e) => {
    uploaded.push(...e.target.files);
    update();
});

upload.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (uploaded.length === 0)
        return;

    const data = new FormData();
    uploaded.forEach(f => {
        data.append('files', f);
    });

    await fetch('/upload', {
        method: 'POST',
        body: data
    });

    uploaded = [];
    choose.value = '';

    update();
    get();
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

        const name = document.createElement('a');
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

        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
            const img = document.createElement('img');
            img.src = '/uploads/' + file;
            cntr.appendChild(img);
        }

        const name = document.createElement('a');
        name.className = 'file-name';
        name.textContent = file;
        name.href = '/uploads/' + file;
        name.download = file;
        name.style.color = '#ffffffff';
        name.style.textDecoration = 'none';

        cntr.appendChild(name);
        list.appendChild(cntr);
    });
};

get();