/**
 * expo-graphql.mjs — Expo GraphQL API クライアント (Sess61 PR7)
 *
 * Expo Submission Service の状態 (status / errorCode / logsUrl) を Claude から直接取得する。
 * EAS CLI には submission status 照会 sub-command が無いため、 GraphQL API 直叩きで補完。
 *
 * 発見経緯 (Sess61 PR6 検証時):
 *   submit が ERRORED になった時、 user に expo.dev で目視確認を依頼していた。
 *   Expo の GraphQL endpoint (https://api.expo.dev/graphql) に EXPO_TOKEN で Bearer 認証すれば、
 *   submissions.byId クエリで status と errorCode を取得可能と判明。
 *
 * Usage:
 *   import { getSubmissionStatus, getSubmissionLogs, parseSubmissionIdFromLog } from './expo-graphql.mjs';
 *   const status = await getSubmissionStatus(submissionId);
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const GRAPHQL_ENDPOINT = 'https://api.expo.dev/graphql';
const TOKEN_FILE = path.resolve('/home/doooo/04_app-factory/docs/01_key/03_Expo/access-tokens.txt');

/**
 * EXPO_TOKEN を取得 (環境変数 → access-tokens.txt の順で fallback)
 */
export function loadExpoToken() {
  if (process.env.EXPO_TOKEN) return process.env.EXPO_TOKEN;
  if (!existsSync(TOKEN_FILE)) {
    throw new Error(
      `EXPO_TOKEN 未設定 + ${TOKEN_FILE} なし — env or token file を用意してください`,
    );
  }
  const content = readFileSync(TOKEN_FILE, 'utf8');
  const line = content.split('\n').find((l) => l.startsWith('EXPO_TOKEN '));
  if (!line) {
    throw new Error(`${TOKEN_FILE} に EXPO_TOKEN 行なし`);
  }
  return line.split(/\s+/)[1];
}

async function callGraphQL(query, variables = {}) {
  const token = loadExpoToken();
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors).slice(0, 200)}`);
  }
  return data.data;
}

/**
 * Submission の status + error + logsUrl を取得
 *
 * @param {string} submissionId
 * @returns {{ id, status, error: { errorCode, message } | null, logsUrl, createdAt, updatedAt, platform }}
 */
export async function getSubmissionStatus(submissionId) {
  const query = `query Q($id: ID!) {
    submissions {
      byId(submissionId: $id) {
        id
        status
        error { errorCode message }
        logsUrl
        createdAt
        updatedAt
        platform
      }
    }
  }`;
  const data = await callGraphQL(query, { id: submissionId });
  return data.submissions.byId;
}

/**
 * 04-submit.log から submission ID を regex 抽出
 *
 * EAS CLI の出力例:
 *   Submission details: https://expo.dev/accounts/dooraku/projects/bonsailog/submissions/<UUID>
 */
export function parseSubmissionIdFromLog(logPath) {
  if (!existsSync(logPath)) {
    return null;
  }
  const content = readFileSync(logPath, 'utf8');
  // 末尾の方の Submission details 行から UUID を抽出 (複数回 submit した場合は最新)
  const matches = [
    ...content.matchAll(
      /submissions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g,
    ),
  ];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1];
}

/**
 * Submission logs (signed URL) を取得 + gzip decompress
 *
 * @param {string} submissionId
 * @returns {string} ログ全文
 */
export async function getSubmissionLogs(submissionId) {
  const sub = await getSubmissionStatus(submissionId);
  if (!sub.logsUrl) {
    throw new Error(`Submission ${submissionId} に logsUrl がありません (status=${sub.status})`);
  }
  const res = await fetch(sub.logsUrl, {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  if (!res.ok) {
    throw new Error(`logsUrl fetch failed: ${res.status}`);
  }
  // fetch が auto-decompress
  return await res.text();
}
