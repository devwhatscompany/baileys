const request = require('request-promise-native');
const acorn = require('acorn');
const walk = require('acorn-walk');
const fs = require('fs/promises');

let whatsAppVersion = 'latest';

const extractAllExpressions = (node) => {
    const expressions = [node];
    const exp = node.expression;
    if (exp) {
        expressions.push(exp);
    }
    if (node?.expression?.arguments?.length) {
        for (const arg of node?.expression?.arguments) {
            if (arg?.body?.body?.length) {
                for (const exp of arg?.body.body) {
                    expressions.push(...extractAllExpressions(exp));
                }
            }
        }
    }
    if (node?.body?.body?.length) {
        for (const exp of node?.body?.body) {
            if (exp.expression) {
                expressions.push(...extractAllExpressions(exp.expression));
            }
        }
    }

    if (node.expression?.expressions?.length) {
        for (const exp of node.expression?.expressions) {
            expressions.push(...extractAllExpressions(exp));
        }
    }

    return expressions;
};

async function findAppModules() {
    const ua = {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0',
            'Sec-Fetch-Dest': 'script',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'same-origin',
            Referer: 'https://web.whatsapp.com/',
            Accept: '*/*',
            'Accept-Language': 'Accept-Language: en-US,en;q=0.5',
        },
    };
    const baseURL = 'https://web.whatsapp.com';
    const serviceworker = await request.get(`${baseURL}/sw.js`, ua);

    const versions = [
        ...serviceworker.matchAll(/client_revision\\":([\d\.]+),/g),
    ].map((r) => r[1]);
    const version = versions[0];
    console.log(`Current version: 2.3000.${version}`);

    const waVersion = `2.3000.${version}`;
    whatsAppVersion = waVersion;

    let bootstrapQRURL = '';
    const clearString = serviceworker.replaceAll('/*BTDS*/', '');
    const URLScript = clearString.match(/(?<=importScripts\(["'])(.*?)(?=["']\);)/g);
    bootstrapQRURL = new URL(URLScript[0].replaceAll("\\", '')).href;

    console.info('Found source JS URL:', bootstrapQRURL);

    const qrData = await request.get(bootstrapQRURL, ua);

    await fs.writeFile('protos.js', qrData);
}

(async () => {
    await findAppModules()
})();