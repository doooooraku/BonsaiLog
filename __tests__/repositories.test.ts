/**
 * Repository 純関数 / 静的解析テスト (P2-01 PR-C)。
 *
 * 実 DB 接続テストは PR-D の Maestro E2E でカバー (expo-sqlite は React Native 環境専用)。
 * 本テストは:
 * - parsePotInfo (JSON パース純関数)
 * - SPECIES_SEED の構造 (ADR-0026 で 5 種固定、ja/en 通称完備、scientific_name 一意)
 * - schema 型 export 存在
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parsePotInfo } from '../src/db/bonsaiRepository';
import { SPECIES_SEED, SPECIES_SEED_COUNT } from '../src/db/seedSpecies';

describe('parsePotInfo', () => {
  test('null を null として返す', () => {
    expect(parsePotInfo(null)).toBeNull();
  });

  test('有効な JSON 文字列をオブジェクト化', () => {
    const json = '{"shape":"oval","size":"medium"}';
    expect(parsePotInfo(json)).toEqual({ shape: 'oval', size: 'medium' });
  });

  test('不正な JSON は null を返す (例外を吐かない)', () => {
    expect(parsePotInfo('not json')).toBeNull();
    expect(parsePotInfo('{')).toBeNull();
  });

  test('空文字列は null を返す', () => {
    expect(parsePotInfo('')).toBeNull();
  });
});

describe('SPECIES_SEED data integrity (ADR-0026 で Issue #14 AC2 を supersede)', () => {
  test('ADR-0026 厳格: 5 種固定で seed されている', () => {
    expect(SPECIES_SEED_COUNT).toBe(5);
    expect(SPECIES_SEED.length).toBe(SPECIES_SEED_COUNT);
  });

  test('全種に scientific_name + ja + en の通称あり', () => {
    for (const seed of SPECIES_SEED) {
      expect(seed.scientificName).toBeTruthy();
      expect(seed.scientificName).toMatch(/^[A-Z][a-z]+\s+[a-z]+/); // Genus species 形式
      expect(seed.names.ja).toBeTruthy();
      expect(seed.names.en).toBeTruthy();
      expect(seed.id).toMatch(/^species_[a-z_]+$/); // 固定 ID パターン
    }
  });

  test('scientific_name は一意 (ID 重複なし)', () => {
    const scientificNames = new Set<string>();
    const ids = new Set<string>();
    for (const seed of SPECIES_SEED) {
      expect(scientificNames.has(seed.scientificName)).toBe(false);
      expect(ids.has(seed.id)).toBe(false);
      scientificNames.add(seed.scientificName);
      ids.add(seed.id);
    }
  });

  test('climate_zone は妥当 (1-13、min <= max)', () => {
    for (const seed of SPECIES_SEED) {
      if (seed.climateZoneMin !== null && seed.climateZoneMax !== null) {
        expect(seed.climateZoneMin).toBeGreaterThanOrEqual(1);
        expect(seed.climateZoneMax).toBeLessThanOrEqual(13);
        expect(seed.climateZoneMin).toBeLessThanOrEqual(seed.climateZoneMax);
      }
    }
  });
});

describe('Repository file structure', () => {
  test('bonsaiRepository.ts が必要な export を持つ', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/db/bonsaiRepository.ts'),
      'utf-8',
    );
    const requiredExports = [
      'createBonsai',
      'getBonsaiById',
      'getBonsaiWithSpecies',
      'getAllActiveBonsai',
      'getAllArchivedBonsai',
      'getAllActiveBonsaiWithSpecies',
      'updateBonsai',
      'archiveBonsai',
      'restoreBonsai',
      'deleteBonsaiHard',
      'parsePotInfo',
      'getBonsaiByTag',
      'searchBonsai',
    ];
    for (const name of requiredExports) {
      expect(source).toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${name}`));
    }
  });

  test('speciesRepository.ts が必要な export を持つ', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/db/speciesRepository.ts'),
      'utf-8',
    );
    const requiredExports = ['getSpeciesById', 'getSpeciesByScientificName', 'getAllSpecies'];
    for (const name of requiredExports) {
      expect(source).toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${name}`));
    }
  });

  test('bonsaiRepository は ULID を使用 (ULID 主キー)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/db/bonsaiRepository.ts'),
      'utf-8',
    );
    expect(source).toMatch(/import\s+\{\s*ulid\s*\}\s+from\s+['"]ulid['"]/);
    expect(source).toMatch(/ulid\(\)/);
  });

  test('Repository は値プレースホルダ (?) を使用 (SQL injection 防止)', () => {
    const sources = [
      fs.readFileSync(path.resolve(__dirname, '../src/db/bonsaiRepository.ts'), 'utf-8'),
      fs.readFileSync(path.resolve(__dirname, '../src/db/speciesRepository.ts'), 'utf-8'),
    ];
    for (const source of sources) {
      // 値の埋め込みは ? プレースホルダ + values 配列で行われていることを確認
      // (UPDATE の SET 句構造化は fields.join(', ') で許容、値は ? のみ)
      const queries = source.match(/(SELECT|INSERT|UPDATE|DELETE)[^;`]+(\?|VALUES)/gi);
      expect(queries).not.toBeNull();
      expect(queries!.length).toBeGreaterThan(0);
    }
  });
});
