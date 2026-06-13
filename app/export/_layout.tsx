/**
 * F-10 エクスポート Stack レイアウト (Issue #33 / ADR-0016 7 画面構成)。
 *
 * 各画面は FormScreenHeader を自前で描画する (ADR-0039 form-screen pattern) ため
 * Stack header は非表示。これにより従来 default header が route path ("export/csv") を
 * そのまま表示していた不具合も解消する。
 */
import { Stack } from 'expo-router';

export default function ExportLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
