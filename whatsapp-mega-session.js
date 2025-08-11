const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Mega = require('mega');
const fs = require('fs');
const path = require('path');

const MEGA_EMAIL = 'thisaragimhana011@gmail.com';       // <-- Your MEGA login email
const MEGA_PASSWORD = '1122334488776655';             // <-- Your MEGA password

const SESSION_FOLDER = './.wwebjs_auth'; // default LocalAuth folder for whatsapp-web.js

// Initialize WhatsApp client with session saved locally
const client = new Client({
    authStrategy: new LocalAuth()
});

// Show QR code in terminal
client.on('qr', qr => {
    console.log('Scan this QR code with WhatsApp mobile:');
    qrcode.generate(qr, { small: true });
});

// On ready (after login)
client.on('ready', async () => {
    console.log('WhatsApp Client is ready!');

    // Upload session folder to MEGA
    try {
        await uploadSessionToMega();
        console.log('Session folder uploaded to MEGA successfully!');
    } catch (e) {
        console.error('Failed to upload session folder:', e);
    }
});

client.initialize();

async function uploadSessionToMega() {
    return new Promise((resolve, reject) => {
        const mega = Mega({ email: MEGA_EMAIL, password: MEGA_PASSWORD }, async err => {
            if (err) return reject(err);

            // Ensure session folder exists
            if (!fs.existsSync(SESSION_FOLDER)) {
                return reject(new Error('Session folder does not exist.'));
            }

            // Create folder on MEGA (if not exist)
            const megaRoot = mega.root;
            megaRoot.mkdir('whatsapp-session', async (err, newDir) => {
                if (err && err.code === 'EEXIST') {
                    // Folder exists, get it instead
                    megaRoot.childByName('whatsapp-session', async (err, existingDir) => {
                        if (err) return reject(err);
                        await uploadFolderFiles(existingDir);
                    });
                } else if (err) {
                    return reject(err);
                } else {
                    await uploadFolderFiles(newDir);
                }
            });

            async function uploadFolderFiles(dir) {
                // Upload all files inside SESSION_FOLDER to MEGA folder
                fs.readdir(SESSION_FOLDER, (err, files) => {
                    if (err) return reject(err);

                    let uploadPromises = [];

                    files.forEach(file => {
                        const fullPath = path.join(SESSION_FOLDER, file);
                        if (fs.lstatSync(fullPath).isFile()) {
                            uploadPromises.push(new Promise((res, rej) => {
                                const readStream = fs.createReadStream(fullPath);
                                dir.upload(readStream, { name: file }, (err, fileNode) => {
                                    if (err) return rej(err);
                                    res(fileNode);
                                });
                            }));
                        }
                    });

                    Promise.all(uploadPromises)
                        .then(() => {
                            mega.close();
                            resolve();
                        })
                        .catch(reject);
                });
            }
        });
    });
}
