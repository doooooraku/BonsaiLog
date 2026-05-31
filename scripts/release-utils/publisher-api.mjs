/**
 * publisher-api.mjs — Google Play Android Publisher API クライアント (Sess61 PR2)
 *
 * Service Account JSON から OAuth JWT を生成し、 androidpublisher.googleapis.com の
 * GET/POST/PUT を叩く Node 標準 (crypto + fetch) のみで構成。
 *
 * 参考: scripts/store-automation/_common.py (ADR-0043) の Python 版と同等機能。
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function loadServiceAccount(path) {
  const raw = readFileSync(path, 'utf8');
  const sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key) {
    throw new Error(`Service Account JSON 不正: client_email / private_key 欠落 (${path})`);
  }
  return sa;
}

export async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const sig = signer.sign(sa.private_key);
  const assertion = unsigned + '.' + sig.toString('base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token 取得失敗: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function callApi(method, url, token, body = null, tries = 3) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== null ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== null ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    }
    const text = await res.text();
    lastErr = new Error(`${method} ${url}: ${res.status} ${text.slice(0, 200)}`);
    if (res.status >= 500 && i < tries - 1) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

export async function createEdit(token, packageName) {
  return callApi('POST', `${API_BASE}/applications/${packageName}/edits`, token, {});
}

export async function getTracks(token, packageName, editId) {
  return callApi('GET', `${API_BASE}/applications/${packageName}/edits/${editId}/tracks`, token);
}

export async function getTrack(token, packageName, editId, track) {
  return callApi(
    'GET',
    `${API_BASE}/applications/${packageName}/edits/${editId}/tracks/${track}`,
    token,
  );
}

export async function getListings(token, packageName, editId) {
  return callApi('GET', `${API_BASE}/applications/${packageName}/edits/${editId}/listings`, token);
}

export async function updateListing(token, packageName, editId, language, body) {
  return callApi(
    'PUT',
    `${API_BASE}/applications/${packageName}/edits/${editId}/listings/${language}`,
    token,
    body,
  );
}

export async function commitEdit(token, packageName, editId) {
  // edits は draft transaction、 commit を呼ばないと変更が反映されない
  return callApi(
    'POST',
    `${API_BASE}/applications/${packageName}/edits/${editId}:commit`,
    token,
    {},
  );
}

export async function updateTrack(token, packageName, editId, track, body) {
  // edits.tracks.update (PUT) — TrackRelease 配列を replace
  // body: { track, releases: [{ name, versionCodes, releaseNotes, status }] }
  return callApi(
    'PUT',
    `${API_BASE}/applications/${packageName}/edits/${editId}/tracks/${track}`,
    token,
    body,
  );
}

/**
 * setReleaseNotes — 指定 versionCode の release に releaseNotes を inject + commit (Sess61 PR6)
 *
 * 冪等パターン:
 *   1. createEdit で edit transaction を開始
 *   2. getTrack で現状取得
 *   3. 該当 versionCode の release を find
 *   4. releaseNotes を inject (他フィールドは温存)
 *   5. updateTrack で PUT
 *   6. commitEdit で確定
 *
 * notesMap = { 'en-US': 'text', 'ja-JP': 'text' } (BCP-47)
 * 既存の他 release は temper せず、 該当 release のみ更新する。
 */
export async function setReleaseNotes(token, packageName, track, versionCode, notesMap) {
  const edit = await createEdit(token, packageName);
  const editId = edit.id;

  const current = await getTrack(token, packageName, editId, track);
  const releases = current.releases ?? [];
  const targetVc = String(versionCode);

  const targetIndex = releases.findIndex((r) =>
    (r.versionCodes ?? []).some((vc) => String(vc) === targetVc),
  );
  if (targetIndex < 0) {
    throw new Error(
      `setReleaseNotes: track=${track} に versionCode=${targetVc} の release が見つかりません`,
    );
  }

  const releaseNotes = Object.entries(notesMap)
    .filter(([, text]) => text && text.trim() !== '')
    .map(([language, text]) => ({ language, text }));

  // 該当 release の releaseNotes を inject、 他フィールドは温存
  const updatedReleases = releases.map((r, i) => (i === targetIndex ? { ...r, releaseNotes } : r));

  const body = { track, releases: updatedReleases };
  await updateTrack(token, packageName, editId, track, body);
  await commitEdit(token, packageName, editId);
  return { editId, targetVc, languagesInjected: releaseNotes.map((rn) => rn.language) };
}
