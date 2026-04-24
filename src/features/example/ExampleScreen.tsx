/**
 * Example feature screen — demonstrates the parent-child CRUD pattern.
 *
 * Pattern: items (parent) + attachments (child)
 * Real-world examples: reports + photos, recipes + steps, playlists + tracks
 *
 * What this screen shows:
 *   - List items (parent rows)
 *   - Add a new item
 *   - Tap an item to load its attachments (child rows)
 *   - Delete an item (cascade-deletes its attachments)
 *
 * Wire this into your router at `app/(tabs)/example.tsx`:
 *   import ExampleScreen from '@/src/features/example/ExampleScreen';
 *   export default ExampleScreen;
 *
 * Use this as a starting point — copy and rename for your domain
 * (e.g., src/features/reports/ReportListScreen.tsx).
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/src/core/i18n/i18n';
import {
  type Attachment,
  type Item,
  deleteItem,
  getAllItems,
  getAttachmentsForItem,
  insertItem,
} from '@/src/db/exampleRepository';

export default function ExampleScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Load items on mount ---
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllItems();
      setItems(rows);
    } catch (error) {
      Alert.alert(t('error'), t('errorLoadFailed'));
      console.error('[ExampleScreen] loadItems failed:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // --- Load attachments when an item is selected ---
  useEffect(() => {
    if (!selectedItemId) {
      setAttachments([]);
      return;
    }
    getAttachmentsForItem(selectedItemId)
      .then(setAttachments)
      .catch((error) => {
        Alert.alert(t('error'), t('errorLoadFailed'));
        console.error('[ExampleScreen] loadAttachments failed:', error);
      });
  }, [selectedItemId, t]);

  // --- Create a new item ---
  const handleCreate = useCallback(async () => {
    try {
      const id = `item-${Date.now()}`;
      await insertItem({ id, title: `New item ${items.length + 1}`, status: 'active' });
      await loadItems();
    } catch (error) {
      Alert.alert(t('error'), t('errorSaveFailed'));
      console.error('[ExampleScreen] insertItem failed:', error);
    }
  }, [items.length, loadItems, t]);

  // --- Delete an item (cascade-deletes attachments) ---
  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert(t('delete'), `${t('delete')} this item?`, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(id);
              if (selectedItemId === id) setSelectedItemId(null);
              await loadItems();
            } catch (error) {
              Alert.alert(t('error'), t('errorDeleteFailed'));
              console.error('[ExampleScreen] deleteItem failed:', error);
            }
          },
        },
      ]);
    },
    [loadItems, selectedItemId, t],
  );

  return (
    <YStack flex={1} padding="$4" gap="$3">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize="$7" fontWeight="bold">
          Items ({items.length})
        </Text>
        <Button onPress={handleCreate} testID="e2e_main_action">
          {t('create')}
        </Button>
      </XStack>

      {loading ? (
        <Text>{t('loading')}</Text>
      ) : items.length === 0 ? (
        <Text color="$color10">{`No items yet. Tap "${t('create')}" to add one.`}</Text>
      ) : (
        <FlatList
          testID="e2e_main_result"
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
              onLongPress={() => handleDelete(item.id)}
            >
              <XStack
                padding="$3"
                marginVertical="$1"
                backgroundColor={item.id === selectedItemId ? '$color3' : '$color2'}
                borderRadius="$3"
              >
                <YStack flex={1}>
                  <Text fontSize="$5">{item.title}</Text>
                  <Text fontSize="$2" color="$color10">
                    {item.created_at}
                  </Text>
                </YStack>
              </XStack>
            </Pressable>
          )}
        />
      )}

      {selectedItemId && (
        <YStack
          padding="$3"
          backgroundColor="$color2"
          borderRadius="$3"
          gap="$2"
          testID="e2e_attachments_panel"
        >
          <Text fontSize="$5" fontWeight="bold">
            Attachments ({attachments.length})
          </Text>
          {attachments.length === 0 ? (
            <Text color="$color10">No attachments. Add some via insertAttachment().</Text>
          ) : (
            attachments.map((a) => (
              <Text key={a.id} fontSize="$3">
                • {a.local_uri} (order: {a.order_index})
              </Text>
            ))
          )}
        </YStack>
      )}

      <Text fontSize="$2" color="$color10">
        💡 Long-press an item to {t('delete')}. Cascading delete removes all attachments.
      </Text>
    </YStack>
  );
}
