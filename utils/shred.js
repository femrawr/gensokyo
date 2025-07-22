import crypto from 'crypto';
import fs from 'fs';

import { dirname, join } from 'path';

export default async (path) => {
    try {
        const stat = fs.statSync(path);
        const { size } = stat;

        if (size === 0) {
            fs.unlinkSync(path);
            return;
        }

        const descriptor = fs.openSync(path, 'r+');
        const buffer = Buffer.alloc(size);

        for (let i = 0; i < 20; i++) {
            crypto.randomFillSync(buffer);
            fs.writeSync(descriptor, buffer, 0, size, 0);
        }

        fs.closeSync(descriptor);

        const dir = dirname(path);
        const name = crypto.randomBytes(10).toString('hex');

        fs.renameSync(path, join(dir, name));
        fs.unlinkSync(join(dir, name));

        console.log('shredded: ' + path);
    } catch (e) {
        console.warn('failed to shred file: ' + path + ' - ' + e.message);
    }
};
