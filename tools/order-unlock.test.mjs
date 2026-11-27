#!/usr/bin/env node
// Local checks only. Synthetic ids. The API host and mantledb.sh are pinned
// to 127.0.0.1 so a missed mock cannot redeem a real order or a real code.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

function loadPuppeteer() {
  const local = createRequire(import.meta.url);
  try { return local('puppeteer-core'); } catch (e) {}
  const pkg = '/tmp/ppt/package.json';
  if (fs.existsSync(pkg)) return createRequire(pkg)('puppeteer-core');
  throw new Error('puppeteer-core is not installed');
}
const puppeteer = loadPuppeteer();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const API = 'https://snappy-tundra-7uesdvk-zengpenghui420-glitch.vercel.app';
const API_HOST = 'snappy-tundra-7uesdvk-zengpenghui420-glitch.vercel.app';
const ORDER = 'P847291038475610293';
const OTHER = 'P564738291056473829';
const CODE = 'EL2345';
const REPEAT = 'P111111111111111111';
const SEQUENCE = 'P123456789012345678';
const DOWN = 'P987654321098765432';
const P19 = 'P9900000000000001378';
const FIRST_Q = '亲密靠近时，我更习惯自己先伸出手、定下今晚的节奏，而不是等对方来安排。';

function patternError(id) {
  if (!/^P\d{18}$/.test(id)) return 'shape';
  const d = id.slice(1);
  for (const size of [1, 2, 3, 6, 9]) {
    if (d.slice(0, size).repeat(d.length / size) === d) return 'repeat';
  }
  const step = (d.charCodeAt(1) - d.charCodeAt(0) + 10) % 10;
  if (step === 1 || step === 9) {
    let seq = true;
    for (let i = 1; i < d.length; i++) {
      if ((d.charCodeAt(i) - d.charCodeAt(i - 1) + 10) % 10 !== step) seq = false;
    }
    if (seq) return 'sequence';
  }
  return '';
}
if (patternError(ORDER) || patternError(OTHER)) throw new Error('synthetic order is not a legal id');
if (patternError(REPEAT) !== 'repeat') throw new Error('repeat fixture');
if (patternError(SEQUENCE) !== 'sequence' || patternError(DOWN) !== 'sequence') throw new Error('sequence fixture');
if (P19.length !== 20 || /^P\d{18}$/.test(P19)) throw new Error('19-digit fixture');
if (!/^EL[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/.test(CODE)) throw new Error('synthetic code shape');

const script = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const scriptPath = '/tmp/elk-preference-script.js';
fs.writeFileSync(scriptPath, script);
const check = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

class Book {
  constructor() {
    this.codeUses = 0;
    this.codeMode = 'ok';
    this.calls = [];
  }
  reset() { this.codeUses = 0; this.codeMode = 'ok'; this.calls = []; }
  posts(pathname) { return this.calls.filter(c => c.method === 'POST' && c.path === pathname); }
  handle(method, url, rawBody) {
    const u = new URL(url);
    let body = null;
    if (rawBody) { try { body = JSON.parse(rawBody); } catch (e) { body = null; } }
    const pathName = u.pathname;
    const rec = {
      method,
      path: pathName,
      body,
      quiz: (body && body.quiz) || u.searchParams.get('quiz'),
      orderId: (body && body.orderId) || u.searchParams.get('orderId'),
      code: (body && body.code) || u.searchParams.get('code'),
      host: u.hostname,
      url
    };
    this.calls.push(rec);
    if (u.hostname === 'mantledb.sh' || pathName.startsWith('/order') || pathName.includes('/orders/')) {
      rec.unexpected = true;
      return { abort: true };
    }
    if (u.origin !== API) {
      rec.unexpected = true;
      return { abort: true };
    }
    if (pathName === '/redeem' && method === 'POST') return this.redeemCode(body && body.code, body);
    rec.unexpected = true;
    return { abort: true };
  }
  redeemCode(code, body) {
    if (this.codeMode === 'drop') return { abort: true };
    if (!body || body.quiz !== 'elk' || body.orderId) {
      return { status: 400, body: { ok: false, error: 'invalid' } };
    }
    if (code !== CODE || this.codeMode === 'miss') return { status: 404, body: { ok: false, error: 'not_found' } };
    if (this.codeMode === 'exhausted' || this.codeUses >= 3) {
      return { status: 403, body: { ok: false, error: 'exhausted', remaining: 0, max: 3 } };
    }
    this.codeUses += 1;
    return { status: 200, body: { ok: true, remaining: 3 - this.codeUses, max: 3, quiz: 'elk' } };
  }
}

function staticContract() {
  assert(HTML.includes("const API_BASE='https://snappy-tundra-7uesdvk-zengpenghui420-glitch.vercel.app'"), 'API_BASE');
  assert(HTML.includes("const QUIZ_KEY='elk'"), 'quiz key');
  assert(HTML.includes("const ORDER_USES_KEY='elk_order_uses'"), 'quiz-specific use key');
  assert(!HTML.includes('soft_persimmon_order_uses'), 'do not reuse the other quiz key');
  assert(HTML.includes("API_BASE+'/redeem'"), 'legacy redeem path');
  assert(!HTML.includes('/order/redeem') && !HTML.includes('/order/get') && !HTML.includes("'/get"), 'no order API and no vault peek');
  assert(!HTML.includes('mantledb') && !HTML.includes('MANTLE_KEY') && !HTML.includes('MANTLE_COL'), 'this quiz does not call Mantle');
  assert(HTML.includes('paidVerified:false') && !HTML.includes('paidVerified:true') && !HTML.includes('paidVerified: true'), 'paidVerified stays false');
  assert(!HTML.includes('暂时验证不了'), 'format-valid ids are not turned away');
  assert(!HTML.includes('次数已经用完'), 'format-valid ids are not exhausted');
  assert(!HTML.includes('这个订单号的 3 次已经用完了'), 'old exhausted copy is gone');
  assert(HTML.includes('这个验证码已经用完了'), 'exhausted access codes still say so');
  assert(!HTML.includes('local-only') && !HTML.includes('cosmetic') && !HTML.includes('假的') && !HTML.includes('只存在这台'), 'do not describe the count as local-only');
  assert(HTML.includes('输入订单号'), 'order title');
  assert(HTML.includes('到小红书「我的订单」里复制订单号。每个订单号可以测 3 次。'), 'xiaohongshu copy');
  assert(HTML.includes('我已满 18 岁') && HTML.includes('我未满 18 岁') && HTML.includes("const AGE_KEY='elk_age_ok'"), 'age gate kept');
  assert(HTML.includes('麋鹿性偏好测试') && HTML.includes(FIRST_Q), 'product copy kept');
  assert((HTML.match(/dim:'/g) || []).length === 18, '18 questions kept');
  assert(HTML.includes('重新测试'), 'retry label kept');
}

function assertNoOrderNet(book, msg, allowRedeem) {
  const bad = book.calls.filter(c => {
    if (c.unexpected || c.host === 'mantledb.sh') return true;
    const p = c.path ? String(c.path) : '';
    if (p.startsWith('/order') || p.includes('/orders/')) return true;
    if (allowRedeem && p === '/redeem') return false;
    return true;
  });
  assert(bad.length === 0, msg + ' ' + JSON.stringify(book.calls));
}

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      if (url === '/' || url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(HTML);
        return;
      }
      res.writeHead(404).end('no');
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function boot(browser, server, book) {
  const page = await browser.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(() => {
    try {
      if (!sessionStorage.getItem('__test_ready')) {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem('__test_ready', '1');
      }
    } catch (e) {}
  });
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (req.method() === 'OPTIONS') {
      req.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Device-Id,X-Fingerprint,X-Mantle-Key'
        }
      }).catch(() => {});
      return;
    }
    let host = '';
    try { host = new URL(url).hostname; } catch (e) { host = ''; }
    if (url.startsWith(API) || host === 'mantledb.sh' || url.includes('/orders/') || host.endsWith('vercel.app')) {
      const result = book.handle(req.method(), url, req.postData());
      if (result.abort) {
        req.abort('failed').catch(() => {});
        return;
      }
      req.respond({
        status: result.status,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(result.body)
      }).catch(() => {});
      return;
    }
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:')) {
      req.continue().catch(() => {});
      return;
    }
    book.calls.push({ method: req.method(), path: url, url, host, unexpected: true });
    req.abort('blockedbyclient').catch(() => {});
  });
  page.__errors = errors;
  page.__origin = 'http://127.0.0.1:' + server.address().port;
  return page;
}

async function openHome(page, query) {
  await page.goto(page.__origin + '/' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof redeemOrder === 'function' && typeof redeemVault === 'function' && typeof shownOrderUses === 'function');
  await page.waitForSelector('#btnStart');
}

async function confirmAge(page) {
  await page.waitForSelector('#ageMask.show');
  const gate = await page.evaluate(() => ({
    quiz: document.getElementById('quiz').classList.contains('active'),
    code: document.getElementById('codeMask').classList.contains('show'),
    age: document.body.dataset.age || '',
    title: document.getElementById('ageTitle').textContent
  }));
  assert(gate.age === '请先确认年龄' || gate.title === '请先确认年龄', 'age title ' + gate.title);
  assert(!gate.quiz && !gate.code && gate.age !== 'ok', 'quiz opened before the age gate ' + JSON.stringify(gate));
  await page.click('#btnAgeOk');
}

async function submit(page, value) {
  await page.click('#btnStart');
  const ageOpen = await page.$('#ageMask.show');
  if (ageOpen) await confirmAge(page);
  await page.waitForSelector('#codeMask.show');
  await page.$eval('#codeInput', (el, v) => { el.value = v; }, value);
  await page.click('#btnCodeOk');
}

async function clearToast(page) {
  await page.evaluate(() => { document.getElementById('toast').textContent = ''; });
}

async function waitQuiz(page) {
  await page.waitForSelector('#quiz.active', { timeout: 4000 });
  await page.waitForFunction(() => document.getElementById('qprog').textContent.startsWith('1 '));
}

async function shownUses(page, orderId = ORDER) {
  return page.evaluate(id => shownOrderUses(id), orderId);
}

async function answerOne(page) {
  const before = await page.$eval('#qprog', el => el.textContent);
  await page.click('#opts .opt');
  await page.waitForFunction(prev => document.getElementById('qprog').textContent !== prev, {}, before);
}

async function fastFinish(page) {
  await page.evaluate(() => {
    ans = {};
    QS.forEach(q => { ans[q.id] = 3; });
    finish();
  });
  await page.waitForSelector('#result.active', { timeout: 4000 });
}

async function main() {
  staticContract();
  const passed = [];
  const server = await serve();
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--host-resolver-rules=MAP ${API_HOST} 127.0.0.1, MAP mantledb.sh 127.0.0.1`
    ]
  });
  try {
    const book = new Book();
    {
      const page = await boot(browser, server, book);
      await openHome(page);
      const out = await page.evaluate((order, other, code) => ({
        good: orderFormatError(order),
        repeat: orderFormatError('P111111111111111111'),
        seq: orderFormatError('P123456789012345678'),
        down: orderFormatError('P987654321098765432'),
        pasted: classifyInput(' 「p8472-9103-8475-610293」 '),
        code: classifyInput(' el 23 45 '),
        junk: classifyInput('hello'),
        badCode: classifyInput('ELIIII'),
        shortP: classifyInput('P12345'),
        p19: orderFormatError('P9900000000000001378'),
        p19c: classifyInput('P9900000000000001378').type,
        quiz: QUIZ_KEY,
        api: API_BASE,
        key: ORDER_USES_KEY,
        first: redeemOrder(order),
        second: redeemOrder(order),
        third: redeemOrder(order),
        later: redeemOrder(order),
        other: redeemOrder(other),
        kept: shownOrderUses(order),
        stored: localStorage.getItem(ORDER_USES_KEY),
        foreign: localStorage.getItem('soft_persimmon_order_uses'),
        copy1: orderSuccessText({ ok: true, uses: 1, remaining: 2 }),
        copy2: orderSuccessText({ ok: true, uses: 2, remaining: 1 }),
        copy3: orderSuccessText({ ok: true, uses: 3, remaining: 0 }),
        copy4: orderSuccessText({ ok: true, uses: 4, remaining: 0 })
      }), ORDER, OTHER, CODE);
      assert(out.good === '' && out.repeat === 'invalid' && out.seq === 'invalid' && out.down === 'invalid', 'pattern ids ' + JSON.stringify(out));
      assert(out.pasted.type === 'order' && out.pasted.orderId === ORDER, 'paste normalize ' + JSON.stringify(out.pasted));
      assert(out.code.type === 'code' && out.code.code === CODE, 'spaced code ' + JSON.stringify(out.code));
      assert(out.junk.type === 'order-invalid' && out.badCode.type === 'code-invalid' && out.shortP.type === 'order-invalid', 'classifier mixed');
      assert(out.p19 === 'invalid' && out.p19c === 'order-invalid', '19-digit id must stay invalid');
      assert(out.quiz === 'elk' && out.api === API && out.key === 'elk_order_uses', 'constants');
      assert(out.first.ok && out.first.uses === 1 && out.first.remaining === 2 && out.first.paidVerified === false, JSON.stringify(out.first));
      assert(out.second.uses === 2 && out.second.remaining === 1 && out.third.uses === 3 && out.third.remaining === 0, 'display steps');
      assert(out.later.ok && out.later.uses === 4 && out.later.paidVerified === false, 'later entry still returns ok');
      assert(out.other.uses === 1 && out.kept === 4, 'per-order map ' + out.stored);
      assert(out.foreign == null, 'foreign key was written');
      assert(out.copy1 === '验证成功，还可以测 2 次', out.copy1);
      assert(out.copy2 === '验证成功，还可以测 1 次', out.copy2);
      assert(out.copy3 === '验证成功，这是最后一次', out.copy3);
      assert(out.copy4 === '验证成功', out.copy4);
      assertNoOrderNet(book, 'format helpers');
      assert(page.__errors.length === 0, page.__errors.join('\n'));
      await page.close();
      passed.push('格式与按订单号分开的提示');
    }
    book.reset();
    {
      const page = await boot(browser, server, book);
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await openHome(page);
      const visible = await page.evaluate(() => document.body.innerText);
      assert(visible.includes('麋鹿性偏好测试') && !visible.includes('验证码') && !visible.includes('paidVerified'), 'start copy');
      assert(!documentIsQuiz(await page.$('#quiz.active')), 'quiz visible before age');
      await page.click('#btnStart');
      await page.waitForSelector('#ageMask.show');
      const blocked = await page.evaluate(() => ({
        quiz: document.getElementById('quiz').classList.contains('active'),
        code: document.getElementById('codeMask').classList.contains('show'),
        ageOk: document.body.dataset.age === 'ok'
      }));
      assert(!blocked.quiz && !blocked.code && !blocked.ageOk, 'age gate did not hold ' + JSON.stringify(blocked));
      await page.click('#btnAgeNo');
      await page.waitForFunction(() => document.getElementById('ageBlock').hidden === false);
      const under = await page.evaluate(() => ({
        quiz: document.getElementById('quiz').classList.contains('active'),
        code: document.getElementById('codeMask').classList.contains('show'),
        block: document.getElementById('ageBlock').textContent
      }));
      assert(!under.quiz && !under.code && under.block.includes('未满 18 岁'), 'underage path ' + JSON.stringify(under));
      await page.click('#btnStart');
      await confirmAge(page);
      await page.waitForSelector('#codeMask.show');
      await page.$eval('#codeInput', (el, v) => { el.value = v; }, ' 「p8472-9103-8475-610293」 ');
      await page.click('#btnCodeOk');
      await waitQuiz(page);
      assert(await shownUses(page) === 1, 'first start should display one use');
      const toast = await page.$eval('#toast', el => el.textContent);
      assert(toast === '验证成功，还可以测 2 次', toast);
      assertNoOrderNet(book, 'first start');
      const q1 = await page.$eval('#qtext', el => el.textContent);
      await answerOne(page);
      await answerOne(page);
      const mid = await page.$eval('#qtext', el => el.textContent);
      const prog = await page.$eval('#qprog', el => el.textContent);
      assert(prog === '3 / 18', prog);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#quiz.active', { timeout: 4000 });
      assert((await page.$eval('#qtext', el => el.textContent)) === mid, 'mid refresh keeps the question');
      assert((await page.$eval('#qprog', el => el.textContent)) === '3 / 18', 'mid refresh progress');
      assert(await shownUses(page) === 1, 'refresh changed the display count');
      assertNoOrderNet(book, 'refresh');
      await page.click('#qback');
      await page.waitForSelector('#start.active');
      assert((await page.$eval('#btnStart', el => el.textContent)) === '继续测试', 'continue label');
      await page.click('#btnStart');
      await page.waitForSelector('#quiz.active');
      const cont = await page.evaluate(() => ({
        prog: document.getElementById('qprog').textContent,
        text: document.getElementById('qtext').textContent
      }));
      assert(cont.prog === '3 / 18' && cont.text === mid, 'continue reset the attempt ' + JSON.stringify(cont));
      assert(await shownUses(page) === 1, 'continue changed the display count');
      assertNoOrderNet(book, 'continue');
      await fastFinish(page);
      const title = await page.$eval('#typeTitle', el => el.textContent);
      const match = await page.$eval('#matchNum', el => el.textContent);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#result.active', { timeout: 4000 });
      assert((await page.$eval('#typeTitle', el => el.textContent)) === title, 'result refresh keeps the result');
      assert((await page.$eval('#matchNum', el => el.textContent)) === match, 'result refresh keeps the match');
      assert(await shownUses(page) === 1, 'result refresh changed the display count');
      assertNoOrderNet(book, 'result refresh');
      await clearToast(page);
      await page.click('#btnViewLast');
      await page.waitForFunction(() => document.getElementById('toast').textContent.includes('不扣次'));
      assert(await shownUses(page) === 1, '查看上次 changed the display count');
      await page.evaluate(() => show('start'));
      await clearToast(page);
      await page.click('#btnLast');
      await page.waitForFunction(() => document.getElementById('toast').textContent.includes('不扣次'));
      assert((await page.$eval('#btnLast', el => el.textContent)) === '查看上次结果', 'button label');
      assert(await shownUses(page) === 1, '查看上次结果 changed the display count');
      assertNoOrderNet(book, 'view last');
      await clearToast(page);
      await page.click('#btnRetry');
      await waitQuiz(page);
      assert(await shownUses(page) === 2, 'retest should display the second use');
      assert((await page.$eval('#toast', el => el.textContent)).includes('还可以测 1 次'), 'second toast');
      await fastFinish(page);
      await clearToast(page);
      await page.click('#btnRetry');
      await waitQuiz(page);
      assert(await shownUses(page) === 3, 'third displayed use');
      assert((await page.$eval('#toast', el => el.textContent)).includes('这是最后一次'), 'third toast');
      await fastFinish(page);
      await clearToast(page);
      await page.click('#btnRetry');
      await waitQuiz(page);
      await page.waitForFunction(() => document.getElementById('toast').textContent === '验证成功');
      const after = await page.evaluate(id => ({
        quiz: document.getElementById('quiz').classList.contains('active'),
        toast: document.getElementById('toast').textContent,
        uses: shownOrderUses(id)
      }), ORDER);
      assert(after.quiz && after.uses === 4, 'a later entry must still open the quiz ' + JSON.stringify(after));
      assert(after.toast === '验证成功' && !after.toast.includes('用完') && !after.toast.includes('暂时验证不了'), after.toast);
      assertNoOrderNet(book, 'later entry');
      await page.evaluate(() => { clearUnlock(); show('start'); });
      await submit(page, OTHER);
      await waitQuiz(page);
      assert(await shownUses(page, OTHER) === 1, 'other id should start at one');
      assert(await shownUses(page, ORDER) === 4, 'other id changed the first count');
      assert((await page.$eval('#toast', el => el.textContent)) === '验证成功，还可以测 2 次', 'other toast');
      assert(q1.length > 0, 'first question missing');
      assert(page.__errors.length === 0, page.__errors.join('\n'));
      await page.close();
      passed.push('年龄门、开始、刷新、继续、查看上次、重新测试');
    }
    book.reset();
    {
      const page = await boot(browser, server, book);
      await openHome(page);
      await submit(page, REPEAT);
      await page.waitForFunction(() => document.getElementById('toast').textContent.includes('格式不对'));
      for (const value of [SEQUENCE, DOWN, P19, 'hello']) {
        await clearToast(page);
        await page.$eval('#codeInput', (el, v) => { el.value = v; }, value);
        await page.click('#btnCodeOk');
        await page.waitForFunction(() => document.getElementById('toast').textContent.includes('格式不对'));
        const onQuiz = await page.$eval('#quiz', el => el.classList.contains('active'));
        const unlocked = await page.evaluate(() => isUnlocked());
        assert(!onQuiz && !unlocked, value + ' started the quiz');
      }
      assert(book.calls.length === 0, 'invalid ids called the network ' + JSON.stringify(book.calls));
      assert(await shownUses(page, REPEAT) === 0, 'rejected id stored a count');
      assert(page.__errors.length === 0, page.__errors.join('\n'));
      await page.close();
      passed.push('19位、重复块、序列在本地拒绝');
    }
    book.reset();
    {
      const page = await boot(browser, server, book);
      await openHome(page);
      await submit(page, CODE);
      await waitQuiz(page);
      const posts = book.posts('/redeem');
      assert(posts.length === 1, 'legacy redeem once, got ' + posts.length);
      assert(posts[0].body.quiz === 'elk' && posts[0].body.code === CODE && !('orderId' in posts[0].body), 'legacy body ' + JSON.stringify(posts[0].body));
      assertNoOrderNet(book, 'code redeem', true);
      const codeToast = await page.$eval('#toast', el => el.textContent);
      assert(codeToast === '验证成功，还可以测 2 次', codeToast);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#start.active');
      assert(book.posts('/redeem').length === 1, 'code refresh redeemed again');
      await page.click('#btnStart');
      await waitQuiz(page);
      assert(book.posts('/redeem').length === 1, 'code continue redeemed again');
      await page.evaluate(() => { if (sessionKind() === 'order') throw new Error('code session became an order'); });
      await page.close();
      passed.push('已发出的码仍走 vault');
    }
    book.reset();
    {
      const page = await boot(browser, server, book);
      await openHome(page);
      book.codeMode = 'miss';
      await submit(page, CODE);
      await page.waitForFunction(() => document.getElementById('toast').textContent.includes('没有找到这个验证码'));
      assert(await page.$eval('#quiz', el => !el.classList.contains('active')), 'vault miss opened the quiz');
      assert(book.posts('/redeem').length === 1, 'vault miss did not call /redeem');
      assertNoOrderNet(book, 'vault miss', true);
      await page.close();
      book.reset();
      const exhausted = await boot(browser, server, book);
      await openHome(exhausted);
      book.codeMode = 'exhausted';
      await submit(exhausted, CODE);
      await exhausted.waitForFunction(() => document.getElementById('toast').textContent.includes('已经用完'));
      assert(await exhausted.$eval('#quiz', el => !el.classList.contains('active')), 'exhausted code opened the quiz');
      assert(book.posts('/redeem').length === 1 && book.codeUses === 0, 'exhausted code still incremented');
      assertNoOrderNet(book, 'exhausted code', true);
      await exhausted.close();
      book.reset();
      const down = await boot(browser, server, book);
      await openHome(down);
      book.codeMode = 'drop';
      await submit(down, CODE);
      await down.waitForFunction(() => document.getElementById('toast').textContent.includes('网络有点不稳定'));
      assert(await down.evaluate(() => !isUnlocked()), 'network failure unlocked');
      assertNoOrderNet(book, 'vault outage', true);
      await down.close();
      passed.push('vault 未命中、用完、中断都不进题，也不改走订单');
    }
    book.reset();
    {
      const orderPage = await boot(browser, server, book);
      await orderPage.goto(orderPage.__origin + '/?code=' + ORDER, { waitUntil: 'domcontentloaded' });
      await orderPage.waitForSelector('#ageMask.show');
      const beforeAge = await orderPage.evaluate(id => ({
        quiz: document.getElementById('quiz').classList.contains('active'),
        uses: shownOrderUses(id)
      }), ORDER);
      assert(!beforeAge.quiz && beforeAge.uses === 0, 'query order skipped the age gate ' + JSON.stringify(beforeAge));
      await orderPage.click('#btnAgeOk');
      await orderPage.waitForSelector('#quiz.active', { timeout: 4000 });
      assert(await shownUses(orderPage) === 1, 'query order should display one use');
      assertNoOrderNet(book, 'query order');
      await orderPage.close();
      const codePage = await boot(browser, server, book);
      await codePage.goto(codePage.__origin + '/?code=' + CODE, { waitUntil: 'domcontentloaded' });
      await codePage.waitForSelector('#ageMask.show');
      assert(await codePage.$eval('#quiz', el => !el.classList.contains('active')), 'query code skipped the age gate');
      await codePage.click('#btnAgeOk');
      await codePage.waitForSelector('#quiz.active', { timeout: 4000 });
      assert(book.posts('/redeem').length === 1 && book.posts('/redeem')[0].body.code === CODE, 'query code ' + JSON.stringify(book.calls));
      assertNoOrderNet(book, 'query code', true);
      await codePage.close();
      passed.push('链接里的订单号和验证码仍先过年龄门');
    }
    book.reset();
    {
      for (const width of [320, 390]) {
        const page = await boot(browser, server, book);
        await page.setViewport({ width, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
        await openHome(page);
        await page.click('#btnStart');
        await confirmAge(page);
        await page.waitForSelector('#codeMask.show');
        await page.$eval('#codeInput', (el, v) => { el.value = v; }, ORDER);
        const box = await page.evaluate(() => {
          const panel = document.querySelector('#codeMask .code-panel');
          const input = document.getElementById('codeInput');
          const r = panel.getBoundingClientRect();
          return {
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
            panelRight: r.right,
            panelLeft: r.left,
            inputScroll: input.scrollWidth,
            inputClient: input.clientWidth,
            title: document.getElementById('codeTitle').textContent,
            copy: document.querySelector('.code-hint').innerText,
            placeholder: input.placeholder
          };
        });
        assert(box.scroll <= box.client + 1, width + ' modal page overflows');
        assert(box.panelLeft >= -1 && box.panelRight <= box.client + 1, width + ' panel overflows');
        assert(box.inputScroll <= box.inputClient + 1, width + ' order id overflows the input');
        assert(box.title === '输入订单号', 'title ' + box.title);
        assert(box.copy.includes('小红书「我的订单」') && box.copy.includes('3 次'), 'copy ' + box.copy);
        assert(box.placeholder === '订单号', 'placeholder');
        assert(book.calls.length === 0, 'opening the form called the network');
        await page.close();
      }
      passed.push('手机 320 与 390');
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(JSON.stringify({ ok: true, passed }, null, 2));
}

function documentIsQuiz(handle) {
  return !!handle;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
